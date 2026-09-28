# De Olho na Cidade

Mapa de Itapetininga/SP onde as pessoas postam uma foto do que está acontecendo naquele ponto. Cada post some em 12h.

- **Frontend:** Next.js 16 (PWA) + MapLibre GL + tiles gratuitos do OpenFreeMap
- **Backend:** Supabase (Postgres + PostGIS, Auth por código no e-mail, Storage, Realtime)

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
- E-mails de login (código de 6 dígitos): http://localhost:54324

### Testando no celular
Câmera e GPS só funcionam em HTTPS. Use um túnel (ex.: `cloudflared tunnel --url http://localhost:3000`) e aponte o `NEXT_PUBLIC_SUPABASE_URL` para um túnel do Supabase também, ou use um projeto Supabase na nuvem.

## Como funciona

**Postar** ([components/NewPostSheet.tsx](components/NewPostSheet.tsx))
1. A câmera abre direto (`capture="environment"`) e o GPS precisa de precisão de 100 m ou melhor.
2. A foto é redimensionada para até 1280px e reencodada em WebP/JPEG no aparelho, o que apaga o EXIF ([lib/image/compress.ts](lib/image/compress.ts)).
3. `create_post` confere se o ponto está dentro do município e aplica o limite de 5 posts por hora. Depois reserva o caminho da foto.
4. O app sobe a foto (a policy do Storage só aceita o arquivo do seu post pendente).
5. `publish_post` publica e começa a contar as 12h. O Realtime avisa os mapas abertos.

**Privacidade e moderação**
- As tabelas ficam fechadas por RLS e o público só lê pela função `active_posts`, que nunca devolve `user_id`.
- 3 denúncias escondem o post automaticamente. Conta com `banned_at` preenchido não posta nem denuncia.
- `access_logs` guarda IP, data e hora por 6 meses (Marco Civil, art. 15). Um job do `pg_cron` apaga o que passar disso.

**Expiração**
- O mapa só mostra `expires_at > now()`, então o post some na hora certa mesmo sem job nenhum.
- `GET /api/cron/expire` (com `Authorization: Bearer $CRON_SECRET`) apaga as fotos vencidas do Storage. Rode a cada 10 min com GitHub Actions, cron-job.org ou `pg_cron` + `pg_net`.

## Estrutura

```
app/                      páginas (mapa, termos), manifest do PWA e rota de limpeza
components/map/CityMap.tsx  mapa, máscara da cidade e clusters
components/*Sheet.tsx     telas de login, postar e ver post
lib/                      cidade, categorias, cliente Supabase, compressão de foto
public/cities/            limite oficial do município (IBGE 3522307)
supabase/migrations/      schema, regras (RPCs), storage/realtime e seed da cidade
```

## Observações
- **MapLibre 6:** o worker é copiado para `public/maplibre` pelo `predev`/`prebuild` ([scripts/copy-maplibre-worker.mjs](scripts/copy-maplibre-worker.mjs)), porque o bundle do Next quebra o caminho padrão.
- **E-mail de login:** o app pede o código de 6 dígitos, e o template padrão do Supabase só manda um link. O template com o código está em [supabase/templates/codigo-login.html](supabase/templates/codigo-login.html) e já vale no ambiente local. No projeto em produção, copie ele em Authentication > Email Templates ("Magic Link" e "Confirm signup").
- **Termos de uso:** [app/termos/page.tsx](app/termos/page.tsx) é um rascunho e precisa de revisão jurídica antes de abrir ao público.

## Próximos passos
- Painel admin (fila de denúncias, ocultar post, banir conta)
- Moderação automática da foto (Google Vision SafeSearch ou AWS Rekognition) entre o upload e a publicação
- Ícones PNG 192/512 para instalação no Android e Web Push para alertas por área
- "Ainda está rolando?": confirmações de quem está perto aumentam ou diminuem a vida do post
