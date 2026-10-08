# Colocar no ar

Três contas: **Supabase** (banco, login, Realtime), **Vercel** (o app) e, se quiser fotos no S3 com moderação, **AWS**. Nessa ordem.

## 1. Supabase na nuvem

```bash
supabase login
supabase projects create deolhonacidade --region sa-east-1   # ou crie pelo painel
supabase link --project-ref <ref>
supabase db push          # aplica as migrations, inclusive o seed de Itapetininga e os marcos
```

No painel do projeto:

- **Authentication > URL Configuration:** Site URL = `https://<seu-app>.vercel.app`.
- **Login com Google** (recomendado; dispensa SMTP próprio):
  1. Em console.cloud.google.com > APIs e serviços > Credenciais, crie um "ID do cliente OAuth" do tipo **Aplicativo da Web**.
  2. Em "URIs de redirecionamento autorizados", ponha `https://<seu-dominio>/auth/google` (e `http://localhost:3000/auth/google` para testar). O login abre na mesma guia e volta para essa rota, sem passar pelo endereço do Supabase.
  3. Na tela de consentimento, nome "Viu na Cidade", o domínio do app e a política em `/privacidade`.
  4. No Supabase, **Authentication > Providers > Google**: ligue, cole o Client ID e o Client Secret e ponha o Client ID também em "Client IDs". Deixe "Skip nonce checks" desligado.
  5. Na Vercel, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` com o mesmo Client ID.
- **Authentication > Email Templates:** em "Magic Link" e "Confirm signup", cole [supabase/templates/codigo-login.html](supabase/templates/codigo-login.html) e o assunto `Seu código: {{ .Token }}`.
- **Authentication > SMTP Settings:** host, usuário e senha do SES (`tofu output smtp`, passo 3). Sem SMTP próprio, o Supabase só manda poucos e-mails por hora, e só para a equipe.
- **Authentication > Attack Protection:** ligue o captcha com provedor Turnstile e cole a *secret key* criada em dash.cloudflare.com > Turnstile (modo "Managed"; domínio da Vercel).
- **SQL Editor**, para a limpeza das fotos a cada 10 min:
  ```sql
  select vault.create_secret('https://<seu-app>.vercel.app', 'app_url');
  select vault.create_secret('<o mesmo CRON_SECRET da Vercel>', 'cron_secret');
  ```
- **Sua conta de moderação:** depois de entrar no app uma vez,
  ```sql
  update public.profiles set is_admin = true
  where id = (select id from auth.users where email = 'voce@exemplo.com');
  ```

## 2. Vercel

```bash
npm i -g vercel
vercel login
vercel link
vercel env add ...   # uma por variável abaixo
vercel --prod
```

| variável | de onde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SITE_URL` | `https://<seu-app>.vercel.app` (prévias do WhatsApp) |
| `CRON_SECRET` | `openssl rand -base64 24`, o mesmo do Vault |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `npx web-push generate-vapid-keys`; subject = `mailto:` seu |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | a *site key* do mesmo widget do Turnstile (sem ela, o login segue sem captcha) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID do Google; liga o botão "Continuar com o Google" |
| `NEXT_PUBLIC_MAP_STYLE` | opcional; padrão positron |
| `NEXT_PUBLIC_SATELLITE_TILES` | URL do satélite com chave (ArcGIS ou MapTiler) |

Gere chaves VAPID novas para produção. As do `.env.local` são só de desenvolvimento. Se você trocar as chaves depois, todo mundo precisa ligar os alertas de novo.

## 3. AWS (opcional)

```bash
cd infra && cp terraform.tfvars.exemplo terraform.tfvars   # origens_web com a URL da Vercel
tofu init && tofu apply
tofu output env_app                     # STORAGE_PROVIDER, MODERATION_PROVIDER, S3_BUCKET...
tofu output -raw aws_secret_access_key
tofu output smtp && tofu output -raw smtp_senha
```

Adicione as variáveis de `env_app` e o `DEOLHO_AWS_SECRET_ACCESS_KEY` (de `tofu output -raw aws_secret_access_key`) na Vercel. Os nomes `DEOLHO_AWS_*` evitam os `AWS_*` que a Vercel reserva para ela e faça o deploy de novo. O lifecycle do bucket apaga tudo em 31 dias, como rede de segurança: as fotos do histórico vivem até 30, e as outras a limpeza do app apaga quando saem do mapa. No console do SES, peça "production access" para mandar e-mail a qualquer endereço.

## 4. Conferir no ar

- Abra no celular pelo HTTPS da Vercel: entrar com o código, postar uma foto (câmera e GPS), ver o pin.
- Compartilhe o link de um post no WhatsApp: a prévia precisa mostrar a foto.
- Ligue os alertas num aparelho e poste de outro, perto: a notificação precisa chegar. No iPhone, só com o app adicionado à tela de início.
- Depois de 10 min, o `select * from net._http_response order by created desc limit 1` deve mostrar 200 da limpeza.
