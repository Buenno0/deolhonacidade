# Vídeos do Viu na Cidade (Remotion)

Briefing, regras de conteúdo e roteiro: [`PROMPT.md`](PROMPT.md). Referência visual: [`prototipos/cidade-miniatura.html`](prototipos/cidade-miniatura.html) (abra no navegador).
Tudo roda nesta máquina e é gratuito: Node, ffmpeg, `cwebp`, o Chrome instalado (capturas e trilha) e o Chrome que o
Remotion baixa sozinho (render).

## Passo a passo

```
npm install
npm run exportar      # as ilustrações viram "fotos" (public/gerado/fotos)
npm run telas         # seed de demonstração no Supabase LOCAL + captura das telas reais do app
npm run audio         # trilha original sintetizada (música + efeitos), master em −14 LUFS
npm run render -- hero
npm run render -- explicativo
```

`npm run telas` precisa do Docker aberto, do `supabase start` e de um `next dev` rodando com o `.env.local` local
(o script usa `http://localhost:3000`; outra porta: `APP=http://localhost:3100 npm run capturar`). As contas são
`@video.example.test` e o seed se recusa a rodar fora do Supabase local; `npm run semear -- --limpar` apaga tudo o
que ele criou. Os posts somem em 2 a 12 h, então rode `npm run telas` logo antes do render final (assim a feira
aparece com o selo "Agora").

| Composição | O que é |
| --- | --- |
| `Explicativo` | O vídeo da LP (~59 s, sem voz): texto na tela, telas reais, a cidade em miniatura e a trilha |
| `Hero`, `Hero-Vertical` | Loop de 14 s, sem texto e sem áudio, para o topo da LP |
| `Ilustracoes`, `Foto` | As "fotos" ilustradas (folha e uma por vez, em 1536×2048) |
| `Estilo`, `Cena-*` | Quadros de estilo e cenas soltas |

O tempo de tudo está em [`src/explicativo/roteiro.ts`](src/explicativo/roteiro.ts): cenas em compassos de 2,4 s
(100 BPM), o drop na foto que responde o "Alguém aí?" e um efeito sonoro para cada ação. A imagem e a trilha leem os
mesmos tempos.

Conferências: `npm run quadros -- Explicativo 150,400,930` (quadros soltos em `out/quadros/`); o render do hero mede a
emenda do loop (SSIM do último com o primeiro quadro) e o do explicativo mede loudness e monta a folha de contato.

## Na LP

O vídeo entra na LP pelo `components/landing/ExplainerVideo.tsx`, numa seção própria (`#video`, entre "O problema"
e "Como funciona"), com um link "Ver em 1 minuto" no topo. O topo continua com o mapa ao vivo (`LiveMap`): o loop
de 14 s não entra lá.

- Antes do play, o cartão mostra o loop mudo como capa viva: carrega perto da tela, para fora dela, com "Pausar
  animações" e com movimento reduzido ou economia de dados (aí fica o pôster parado).
- O play é um toque, então o vídeo já sai com som: 16:9 no computador e 9:16 no celular em pé.
- No fim, os botões "Abrir o mapa" e "Ver de novo". O texto das cartelas fica em "Texto do vídeo" (leitor de tela e
  busca), e o JSON-LD da LP tem um `VideoObject`.

Depois de `npm run render -- explicativo` (e `-- hero`, se o loop mudar), copie só o que a LP usa para
`public/video/` do app (nunca para o bucket de fotos, que apaga tudo depois de 31 dias):

```
cp out/web/viu-explicativo-16x9.{mp4,webp,jpg} out/web/viu-explicativo-9x16.{mp4,webp,jpg} out/web/viu-hero-16x9.mp4 out/web/viu-hero-9x16.mp4 ../public/video/
```

Só MP4: o WebM sai do render, mas não compensa (no loop ele é maior que o MP4). O `next.config.ts` dá um dia de cache
a `/video/*`, então um vídeo refeito com o mesmo nome chega a todo mundo em até um dia.

O vídeo não tem narração: o texto está na tela. A versão narrada (ElevenLabs, plano pago por ser uso comercial) fica
para os cortes de redes, se for feita.
