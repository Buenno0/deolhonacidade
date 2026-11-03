# Detalhes técnicos

Tudo o que um README de apresentação não precisa carregar. Para colocar no ar,
veja [DEPLOY.md](../DEPLOY.md); para a parte visual, [DESIGN.md](../DESIGN.md).

## Stack

- **Frontend:** Next.js 16 (PWA) + MapLibre GL; mapa Padrão (noturno ou dia), Colorido ou Satélite
- **Backend:** Supabase (Postgres + PostGIS, Auth, Storage, Realtime)
- **AWS (opcional):** S3 + CloudFront para as fotos, Rekognition para moderação, SES para o e-mail ([infra/](../infra/))
- **Moderação de conteúdo (opcional):** Claude, via `@anthropic-ai/sdk`

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

Os testes de ponta a ponta ([tests/e2e/](../tests/e2e/)) entram com contas descartáveis pelo código no Mailpit, exercitam as regras de verdade (banco, rotas e Storage) e apagam o que criaram. O CI ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) roda lint, tipos, contraste, build e a suíte com um Supabase subido na própria máquina do CI.

### Testando no celular

Câmera e GPS só funcionam em HTTPS. Use um túnel (ex.: `cloudflared tunnel --url http://localhost:3000`) e aponte o `NEXT_PUBLIC_SUPABASE_URL` para um túnel do Supabase também, ou use um projeto Supabase na nuvem.

## Como funciona

**Postar** ([lib/posting.ts](../lib/posting.ts))
1. A câmera abre direto (`capture="environment"`). A localização aceita até 500 m de erro, com aviso acima de 100 m.
2. No aparelho, a foto vira WebP de até 1280px (~10 KB a 100 KB) e uma miniatura quadrada de 192px (~1 KB) para o pin. Redesenhar no canvas apaga o EXIF ([lib/image/compress.ts](../lib/image/compress.ts)).
3. `create_post` (RPC) confere se o ponto está dentro do município, aplica o limite de 7 posts por hora e reserva o caminho da foto.
4. As duas imagens sobem direto para o Supabase Storage (policy `can_upload_post_photo`) ou para o S3 (formulário assinado por [/api/posts/[id]/uploads](../app/api/posts/[id]/uploads/route.ts)).
5. [/api/posts/[id]/publish](../app/api/posts/[id]/publish/route.ts) confere a foto, passa pela moderação e chama `finalize_post` com a service_role. Esse é o único caminho até "publicado": o navegador não consegue pular a moderação. O Realtime avisa os mapas abertos.

**Privacidade e moderação**
- As tabelas ficam fechadas por RLS e o público só lê pela função `active_posts`, que nunca devolve `user_id`.
- Com `MODERATION_PROVIDER=rekognition`, foto com nudez explícita, violência gráfica ou símbolo de ódio não é publicada; o resultado fica em `posts.moderation`.
- Com `CLAUDE_MODERATION=on` e `ANTHROPIC_API_KEY`, o Claude ([lib/server/claudeReview.ts](../lib/server/claudeReview.ts)) revisa o que passou: a foto já desfocada, a legenda e a categoria. Recusa acusação ou ofensa a alguém, telefone e CPF expostos, propaganda fora de "estabelecimento", golpe, print e meme; na dúvida, publica. O parecer aparece na fila do admin, em `posts.moderation.claude`. Se a API falhar, o post sai normalmente.
- 3 denúncias escondem o post automaticamente. Conta com `banned_at` preenchido não posta nem denuncia.
- `access_logs` guarda IP, data e hora por 6 meses (Marco Civil, art. 15). Um job do `pg_cron` apaga o que passar disso.

**Expiração**
- O mapa só mostra `expires_at > now()`, então o post some na hora certa mesmo sem job nenhum.
- `GET /api/cron/expire` (com `Authorization: Bearer $CRON_SECRET`) apaga foto e miniatura de onde estiverem. Rode a cada 10 min com GitHub Actions, cron-job.org ou EventBridge.
- No S3, uma regra de lifecycle apaga tudo em `posts/` depois de 1 dia, como rede de segurança.

## AWS

A infra está em [infra/](../infra/), em Terraform (validado com OpenTofu), no mesmo padrão do NAS.

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
video/                      projeto Remotion do vídeo da landing page
```

## Observações

- **MapLibre 6:** o worker é copiado para `public/maplibre` pelo `prepare` ([scripts/copy-maplibre-worker.mjs](../scripts/copy-maplibre-worker.mjs)), porque o bundle do Next quebra o caminho padrão.
- **E-mail de login:** o app pede o código de 6 dígitos, e o template padrão do Supabase só manda um link. O template com o código está em [supabase/templates/codigo-login.html](../supabase/templates/codigo-login.html) e já vale no ambiente local. No projeto em produção, copie ele em Authentication > Email Templates ("Magic Link" e "Confirm signup").
- **Termos de uso:** [app/termos/page.tsx](../app/termos/page.tsx) é um rascunho e precisa de revisão jurídica antes de abrir ao público.
