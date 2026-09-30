# De Olho na Cidade

Mapa de Itapetininga/SP onde as pessoas postam uma foto do que está acontecendo naquele ponto. Cada post some em 12h.

- **Frontend:** Next.js 16 (PWA) + MapLibre GL; mapa Padrão (noturno ou dia), Colorido ou Satélite
- **Backend:** Supabase (Postgres + PostGIS, Auth por código no e-mail, Storage, Realtime)
- **AWS (opcional):** S3 + CloudFront para as fotos, Rekognition para moderação, SES para o e-mail ([infra/](infra/))
- **Design system:** herdado do NAS, documentado em [DESIGN.md](DESIGN.md)

## O que o app faz

- **Registrar:** foto de agora, categoria e legenda. Some do mapa em 2h (trânsito), 3h (acidente, segurança), 6h (alagamento, falta de energia) ou 12h (o resto).
- **Ainda está rolando?** Quem está a até 1 km confirma ou nega. Confirmar mantém o post no ar (até 12h); três negações a mais que as confirmações o encerram.
- **Alguém aí?** Marque um ponto no mapa e pergunte. O pedido fica aberto 2h, e quem está perto responde com foto.
- **Alertas por área:** notificações de categorias escolhidas num raio de 500 m a 3 km, e de pedidos perto.
- **Compartilhar:** cada post tem uma página `/p/<id>` com prévia (foto, categoria, tempo restante) para o WhatsApp.
- **Mapa de calor:** o de agora e o dos últimos 30 dias, agregado em áreas de ~150 m com no mínimo 3 registros.
- **Trends:** a aba ao lado do mapa, com os posts no ar ordenados por "em alta" (engajamento que perde força com o tempo), "mais vistos" ou "mais confirmados".
- **Conta:** meus posts dos últimos 7 dias com as métricas, apagar post, sair e excluir a conta (LGPD).
- **Captcha invisível no login** (Cloudflare Turnstile), contra contas em massa.
- **Gamificação:** XP por ajudar (post confirmado +10, resposta rápida a pedido +15, ajudar a derrubar post falso +5; postar só +5; post escondido −30; teto de 150 XP/dia), seis níveis (Curioso → Lenda de Itapetininga), conquistas de primeira vez e em bronze/prata/ouro, sequência de dias, celebração animada e apelido público opcional. Tudo concedido pelo banco.
- **Fora da área:** quem abre o app longe de uma cidade atendida vê a distância até a mais próxima, um botão para ir até lá e "Quero o De Olho na minha cidade" (interesse anônimo por região de ~10 km).
- **Moderação:** `/admin` para contas com `is_admin`, com a fila de denúncias, esconder, restaurar e banir.

Para colocar no ar, veja [DEPLOY.md](DEPLOY.md).

## Rodando localmente

Pré-requisitos: Node 20+, Docker Desktop rodando e a CLI do Supabase.

```bash
brew install supabase/tap/supabase
npm install
supabase start          # sobe Postgres, Auth, Storage etc. e aplica as migrations
supabase status         # mostra a API URL, a anon key e a service_role key
cp .env.example .env.local   # e cole as chaves
npm run dev
```

- App: http://localhost:3000
- Supabase Studio: http://localhost:54323
- E-mails de login (código de 6 dígitos): http://localhost:54324. O Supabase local não entrega e-mail de verdade: todos caem aqui.

Sem AWS configurada, as fotos ficam no Supabase Storage e não há moderação automática. Tudo funciona igual.

### Testes

```bash
npm run test:e2e     # precisa do Supabase local e do app (npm run dev) rodando
npm run contraste    # pares de cor do design system
```

Os testes de ponta a ponta ([tests/e2e/](tests/e2e/)) entram com contas descartáveis pelo código no Mailpit, exercitam as regras de verdade (banco, rotas e Storage) e apagam o que criaram. O CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) roda lint, tipos, contraste, build e a suíte com um Supabase subido na própria máquina do CI.

### Testando no celular
Câmera e GPS só funcionam em HTTPS. Use um túnel (ex.: `cloudflared tunnel --url http://localhost:3000`) e aponte o `NEXT_PUBLIC_SUPABASE_URL` para um túnel do Supabase também, ou use um projeto Supabase na nuvem.

## Como funciona

**Postar** ([lib/posting.ts](lib/posting.ts))
1. A câmera abre direto (`capture="environment"`). A localização aceita até 500 m de erro, com aviso acima de 100 m.
2. No aparelho, a foto vira WebP de até 1280px (~10 KB a 100 KB) e uma miniatura quadrada de 192px (~1 KB) para o pin. Redesenhar no canvas apaga o EXIF ([lib/image/compress.ts](lib/image/compress.ts)).
3. `create_post` (RPC) confere se o ponto está dentro do município, aplica o limite de 7 posts por hora e reserva o caminho da foto.
4. As duas imagens sobem direto para o Supabase Storage (policy `can_upload_post_photo`) ou para o S3 (formulário assinado por [/api/posts/[id]/uploads](app/api/posts/[id]/uploads/route.ts)).
5. [/api/posts/[id]/publish](app/api/posts/[id]/publish/route.ts) confere a foto, passa pela moderação e chama `finalize_post` com a service_role. Esse é o único caminho até "publicado": o navegador não consegue pular a moderação. O Realtime avisa os mapas abertos.

**Privacidade e moderação**
- As tabelas ficam fechadas por RLS e o público só lê pela função `active_posts`, que nunca devolve `user_id`.
- Com `MODERATION_PROVIDER=rekognition`, foto com nudez explícita, violência gráfica ou símbolo de ódio não é publicada; o resultado fica em `posts.moderation`.
- 3 denúncias escondem o post automaticamente. Conta com `banned_at` preenchido não posta nem denuncia.
- `access_logs` guarda IP, data e hora por 6 meses (Marco Civil, art. 15). Um job do `pg_cron` apaga o que passar disso.

**Expiração**
- O mapa só mostra `expires_at > now()`, então o post some na hora certa mesmo sem job nenhum.
- `GET /api/cron/expire` (com `Authorization: Bearer $CRON_SECRET`) apaga foto e miniatura de onde estiverem. Rode a cada 10 min com GitHub Actions, cron-job.org ou EventBridge.
- No S3, uma regra de lifecycle apaga tudo em `posts/` depois de 1 dia, como rede de segurança.

## AWS

A infra está em [infra/](infra/), em Terraform (validado com OpenTofu), no mesmo padrão do NAS.

| peça | arquivo | para quê |
|---|---|---|
| S3 privado, sem versioning | `fotos.tf` | fotos e miniaturas em `posts/`; lifecycle de 1 dia |
| CloudFront com OAC | `cdn.tf` | leitura pública com cache de 10 min; `PriceClass_All` para ter bordas no Brasil |
| IAM `deolho-app` | `identidade.tf` | só `posts/*` do bucket e `DetectModerationLabels` |
| SES + IAM `deolho-smtp` | `email.tf` | SMTP para o Supabase Auth mandar o código de login |
| Budgets | `orcamento.tf` | alerta por e-mail em 50% gasto e 100% previsto (padrão US$ 5) |

```bash
cd infra
cp terraform.tfvars.exemplo terraform.tfvars   # e ajuste
tofu init
tofu plan
tofu apply
tofu output env_app                  # variáveis do app
tofu output -raw aws_secret_access_key
tofu output smtp                     # e tofu output -raw smtp_senha
```

Depois do `apply`:
1. **App:** cole a saída de `env_app` e o `AWS_SECRET_ACCESS_KEY` no `.env.local` (ou na hospedagem).
2. **E-mail:** no Supabase (nuvem), em Authentication > SMTP Settings, use o host, o usuário e a senha do `smtp`. Se houver domínio, crie os CNAMEs de `tofu output dns_dkim`.
3. **Sandbox do SES:** conta nova só envia para endereços verificados. Para abrir ao público, peça "production access" no console do SES.

**Custo e free tier.** Contas AWS criadas a partir de 15/07/2025 recebem créditos (até US$ 200, válidos por 6 meses) em vez dos antigos 12 meses grátis; confira no console qual é o seu caso. Fora disso, na escala de uma cidade o custo é de centavos: o CloudFront tem 1 TB/mês de saída grátis para sempre, o S3 guarda no máximo 12h de fotos pequenas, o Rekognition custa por volta de US$ 1 a cada mil fotos e o SES US$ 0,10 a cada mil e-mails. O alerta de orçamento avisa antes de qualquer surpresa.

## Design system

Resumo; o completo está em [DESIGN.md](DESIGN.md).
- Paleta de pedra e areia do NAS, com **fonte única** em [design/tokens.mjs](design/tokens.mjs). Dela saem o CSS (`npm run tokens`), as cores do mapa e o teste de contraste (`npm run contraste`, 37/37 pares passando).
- A foto é a única cor saturada. Categorias são ícone + rótulo, e a severidade (perigo, aviso, acento) colore o anel do pin.
- O pin é a miniatura da foto, com um anel que esvazia nas 12h de vida do post.
- O mapa é a exceção à paleta: é feito para ser lido (ruas claras, água azul, parque verde) e tem três tipos, Padrão, Colorido e Satélite.
- Escuro por padrão; a troca de tema abre em círculo a partir do botão (View Transitions).

## Estrutura

```
app/                        páginas, manifest do PWA, fontes, tokens.css gerado e rotas /api
components/map/CityMap.tsx  mapa recolorido, máscara da cidade, pins de foto e clusters
components/PostViewer.tsx   visualizador em tela cheia (sala escura)
components/ui/              receitas do design system, ícones e a marca
design/tokens.mjs           a paleta (fonte única)
lib/map/style.ts            os três tipos de mapa (padrão noturno/dia, colorido, satélite)
lib/server/                 Supabase admin, storage (Supabase/S3) e moderação (Rekognition)
infra/                      Terraform da AWS
supabase/migrations/        schema, RPCs, storage/realtime, seed da cidade, miniaturas e moderação
```

## Observações
- **MapLibre 6:** o worker é copiado para `public/maplibre` pelo `prepare` ([scripts/copy-maplibre-worker.mjs](scripts/copy-maplibre-worker.mjs)), porque o bundle do Next quebra o caminho padrão.
- **E-mail de login:** o app pede o código de 6 dígitos, e o template padrão do Supabase só manda um link. O template com o código está em [supabase/templates/codigo-login.html](supabase/templates/codigo-login.html) e já vale no ambiente local. No projeto em produção, copie ele em Authentication > Email Templates ("Magic Link" e "Confirm signup").
- **Termos de uso:** [app/termos/page.tsx](app/termos/page.tsx) é um rascunho e precisa de revisão jurídica antes de abrir ao público.

## Próximos passos
- Invalidação do CloudFront quando um post é escondido por denúncia (hoje a cópia na borda dura até 10 min)
- Desfoque automático de rostos e placas antes de publicar
- Testes automatizados no repositório (hoje os testes de ponta a ponta são scripts rodados à mão)
- Ofertas relâmpago de comércio local e painel de dados para a prefeitura
