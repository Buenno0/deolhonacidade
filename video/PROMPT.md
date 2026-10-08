# Prompt: vídeo de apresentação do Viu na Cidade (LP)

## BRIEFING
- **Tema e objetivo:** apresentar o Viu na Cidade na LP (viunacidade.com.br) a quem mora em Itapetininga/SP e a quem
  tem comércio na cidade.
  - **O problema:** a gente fica sabendo do que acontece por "ouvi dizer" e por foto velha que roda no grupo.
  - **A utilidade:**
    - ver o que está rolando agora, perto, com foto de quem está lá;
    - registrar em poucos toques;
    - perguntar "Alguém aí?";
    - receber aviso do que acontece perto;
    - confiar: sem nome, rostos e placas desfocados, tudo some em até 12 h;
    - para o comércio, divulgar no mapa com o selo Divulgação.
  - **Meta do piloto:** a pessoa abrir o mapa no celular e fazer o primeiro registro. O maior risco do lançamento é o
    mapa vazio.
  - Tecnologia fica fora do vídeo.
- **Mensagem principal:** "O que está rolando agora em Itapetininga, em fotos de quem está lá."
- **Onde passa:** na LP, no celular e no computador. O hero roda mudo em loop no topo; o explicativo toca ao clicar.
  Depois vêm os cortes 9:16 para Instagram, Reels, TikTok e Status do WhatsApp.
- **Formatos (30 fps):**
  - Hero: 14 s em loop perfeito, sem texto e sem áudio, em 16:9 1920×1080 e 9:16 1080×1920.
  - Explicativo: cerca de 50 s, sem narração (texto na tela, música e efeitos), em 16:9 e 9:16. Na vertical, nada
    importante nos ~250 px do topo, abaixo de ~1490 px nem na coluna da direita.
  - Narrado (opcional): o explicativo em 9:16 com voz, para redes.
- **Marca:** "Viu na Cidade" (curto: "Viu").
  - A marca é o contorno do município em ouro com o pino recortado (`components/ui/Mark.tsx`, `CITY_PATH` e
    `PIN_PATH`).
  - O wordmark é "Viu na Cidade" em Archivo 700, com o rótulo mono "ITAPETININGA · SP".
  - Cartão final: viunacidade.com.br, com QR code. O nome antigo não aparece.
- **Paleta:** a fonte da verdade é `design/tokens.mjs`.
  - Interface: basalto #0c0a08 · superfície #16130f · elevado #211c15 · linha #40372b · tinta #f4efe4 · apagado
    #a99a84 · ouro gasto #d29a44, com texto #1a1206 por cima.
  - Anel dos pinos: perigo #e08163, atenção #dca84a, ouro para evento e "outro".
  - Azulejo dos marcos: #3563d9.
  - Ilustrações, na mesma família: céu #1d2a44 e #141a33, água #0e2a3f e #8fb0f5, luz quente #ffd98a e #f2c879,
    telha #9d5a26, pedra #d8ccb4.
  - Sem sombra.
- **Direção visual "B + 1":**
  - O palco é uma cidade em miniatura isométrica, à noite, cercada pela borda tracejada dourada do app.
  - As "fotos" são ilustrações planas em camadas.
  - Os passos de uso aparecem no celular, com as telas reais, **na mão de alguém da cidade** (direção A, escolhida em
    07/10/2026 entre quatro, no canvas "Celular do vídeo" do Claude Design):
    - a mão é chapada como as pessoas das ilustrações (duas cores, sem contorno, sem rosto à vista);
    - cada cena tem uma pessoa, com pele e manga próprias, e o aparelho troca de mão nas viradas de cena;
    - o polegar toca onde o botão está de verdade (nada de círculo cinza de gravação de tela);
    - a tela é viva: as folhas e os cartões sobem sobre o mapa como no app, recortados das capturas;
    - o aro de metal pega a luz da cidade, sem sombra (`src/componentes/Mao.tsx`, `src/explicativo/Telefone.tsx`).
  - Referências:
    - o protótipo `video/prototipos/cidade-miniatura.html`, aprovado em 07/10/2026;
    - as animações do app em `app/globals.css`: `pin-pousa`, `pin-halo`, `pin-revela`, `pin-varre`, o ping do "Agora",
      `seta-sobe` e `pin-gira` do "Em alta", `marco-reflexo`, `story-enche` e a troca de tema em círculo (520 ms).
- **Telas reais:** instância `viu-video` com Supabase local e seed de demonstração, em que as "fotos" são as
  ilustrações.
  - "Registrar o que está rolando" → "Tirar foto · tem que ser de agora" → "O que é" → "Publicar · some em 2h" → "No ar
    · 2 rostos e 1 placa protegidos".
  - Story com "Ainda está rolando" / "Acabou".
  - "Me avisa quando acontecer algo perto" (raio de 500 m, 1 km ou 3 km).
  - "Divulgue seu estabelecimento" → "Pedir verificação".
  - "Tenha o Viu na Cidade na tela de início".
  - Crédito, porque o mapa aparece nas telas: "Mapa nas telas: OpenFreeMap © OpenMapTiles · © colaboradores do
    OpenStreetMap".
- **Imagens:**
  - Tudo ilustrado em código. Nada de foto real, banco de imagens ou IA.
  - Pessoas sem rosto desenhado.
  - O comércio de exemplo se chama "Seu Comércio". Nunca usar um comércio real.
  - Os marcos aparecem como azulejos (Catedral, Monumento ao Tropeiro) só como referência visual.

## REGRAS DE CONTEÚDO
1. **Todo fato sobre o produto sai do código.** Conferido em 07/10/2026:
   - As fotos somem em até 12 h, conforme a categoria: trânsito 2 h; acidente e segurança 3 h; alagamento e falta de
     energia 6 h; obra, evento e outro 12 h (`lib/categories.ts`).
   - Só foto da câmera: "tem que ser de agora". É regra do app, não perícia: nunca dizer que é impossível postar foto
     velha.
   - O post aparece sem o nome de quem postou (`app/termos/page.tsx`).
   - "Ainda está rolando" dá mais tempo, sem passar de 12 h. "Acabou" tira 1 h. 3 denúncias escondem o post.
   - "Alguém aí?": a pergunta fica 2 h no mapa e pode ser respondida com foto por quem está a até 1 km.
   - Alertas por raio e categoria. No iPhone, só funcionam com o app na tela de início.
   - Rostos e placas são desfocados no servidor antes de a foto aparecer nítida.
   - Comércio verificado: uma Divulgação por dia, feita no endereço cadastrado, sempre com o selo, sumindo em 12 h
     (`components/BusinessSheet.tsx`).
   - Funciona no navegador, sem loja de apps.

   Sem número de usuários, nota, depoimento ou preço.
2. **Foco em utilidade**, sem stack e sem "IA".
3. **Sem alarmismo.** Nada de acidente com vítima, crime, polícia ou gente ferida. Tom do app: informal, "você",
   "rolando", frases curtas, humor leve e seco, sem exclamação e sem emoji.
4. **Privacidade sem promessa absoluta:** nunca "100%", "garantido" ou "anônimo total".
5. **Mostrar o papel das pessoas:** quem está perto confirma, quem está perto responde, denúncias tiram do mapa.
6. **Nenhum dado pessoal real.** Telas só com o seed (contas @example.test, apelidos inventados) e nada da produção.
7. **Sem político, partido, candidato ou prefeitura**, e sem marca de terceiros.

## ROTEIRO (texto na tela)
- O explicativo não tem voz: a cartela é o roteiro.
  - Até 8 palavras por cartela, uma ideia por cartela.
  - Cada uma fica no ar pelo menos 0,3 s por palavra + 1 s.
  - Gancho nos 2 primeiros segundos; fecho com a marca, o link e o QR (pelo menos 4 s parado).
- Na versão narrada, a fala expande as cartelas com números por extenso. Pronúncia: Viu ("víu"), Itapetininga
  (i-ta-pe-tchi-NIN-ga).

## VOZ (só na versão narrada)
- ElevenLabs `eleven_v4`, plano pago (uso comercial).
- Elenco: 3 ou 4 vozes nativas pt-BR da Voice Library, mais o Brian como referência.
- Geração: `npm run voz:elevenlabs -- gerar <voz>`, com 2 takes por frase; o whisper escolhe.
- Crédito: "Narração: voz sintética · ElevenLabs".
- A voz do macOS só serve para o animatic.

## LINHA DO TEMPO (a música manda)
- Música a cerca de 100 BPM (1 compasso = 2,4 s). Cartelas e cortes caem no tempo, e os elementos entram nos tempos
  fortes.
- O drop cai na foto que responde o "Alguém aí?".
- Na versão narrada, a voz passa a mandar, como no pipeline do Rota.

## DIREÇÃO VISUAL (Remotion, 30 fps)
- **Mundo em movimento contínuo:** carros, guindaste, luzes, chuva e pessoas. A câmera está sempre viva: deriva,
  aproximação e mergulho nos pinos.
- **Fotos:** ilustrações em 3 camadas com parallax, grão leve e luz da hora do dia. Elas vivem dentro dos pinos e viram
  story em tela cheia quando a câmera mergulha.
- **Pinos, tags e bolha** iguais aos do app:
  - anel do tempo na cor da severidade;
  - pouso com halo;
  - "Agora" pulsando;
  - "Em alta" com brilho girando;
  - "Alguém aí?" com bolha tracejada e ondas no chão;
  - o post que acaba some com "puf".
- **Do celular para a cidade:** quando alguém publica, o pino sai da tela do celular e pousa na miniatura.
- **Gancho:** bolhas cinza genéricas, sem marca de app de mensagem → "OUVIU?" → o "OU" cai → "VIU." em ouro → a cidade
  acende.
- **Fecho:** a câmera sobe, a borda tracejada vira o contorno do município, e o pino pousa no recorte.
- **Transição de marca:** a troca de tema em círculo.
- **Tipografia:**
  - Archivo 700 e 600, nunca 800–900, com tracking −1,5% nos títulos grandes.
  - JetBrains Mono 500 em rótulos e números, em caixa alta, com tracking .16em.
  - Fontes locais de `app/fonts/`. Ícones do app.
- **Para a web:**
  - Cartela com pelo menos 7% da altura do quadro; nada abaixo de 32 px em 1080p; peso 500 ou mais.
  - Margem de 5%.
  - O primeiro quadro funciona como capa.
- **Nada piscando** mais de 3 vezes por segundo.

## ÁUDIO
- **Explicativo:** música original sintetizada em código, cidade à noite (Rhodes ou pluck, sub macio, percussão leve).
  - O "ping" do "Agora", em duas notas, é a assinatura do Viu.
  - Efeitos em toda ação: obturador, pouso, whoosh, tique do anel, notificação, puf, varredura e impacto na marca.
  - Master em −14 LUFS, pico abaixo de −1 dBTP.
- **Hero:** sem áudio.
- **Narrado:** a música abaixa só nos agudos durante a voz (−80%), e a voz fica pelo menos 8 dB acima da música entre
  300 e 4000 Hz.

## FERRAMENTAS
- Remotion 4 em `video/`, grátis para pessoa física ou empresa com até 3 funcionários.
- ffmpeg 9.
- Puppeteer e o Chrome local, com swiftshader, na instância `viu-video` (Supabase local com Docker).
- whisper.cpp e ElevenLabs só na versão narrada. Nenhuma chave no repositório.

## CONTROLE DE QUALIDADE
1. Aprovar 3 quadros de estilo antes de animar tudo.
2. Renderizar os quadros-chave e conferir acentos, margem, texto estourado e sobreposição.
3. Render final (CRF 16) e folha de contato com cerca de 30 quadros.
4. Medir a loudness. No hero, conferir o loop sem emenda e a ausência de áudio.
5. Testar na LP: Chrome e Safari no computador e Safari no iPhone.

## ENTREGA
- **Hero:** 16:9 e 9:16, em MP4 e WebM, com até 3 MB cada.
- **Explicativo:** 16:9 e 9:16, em H.264 com faststart e em WebM (a 16:9 com até 12 MB), mais os masters.
- **Imagens:** capas em 1280×720 e 1080×1920 e pôsteres WebP.
- **Texto das cartelas**, para a descrição acessível na LP.
- **Trecho de HTML:** o hero usa `autoplay muted loop playsinline` com pôster; o explicativo usa `controls`,
  `preload="none"` e pôster.
- **Onde ficam:** em `public/video/`.
- **Resumo:** roteiro final, de onde saiu cada fato, créditos e o que mudou do pedido.

## ROTEIRO v1: explicativo sem voz (~54 s)
| # | Tempo | Cartela | Cena |
| --- | --- | --- | --- |
| 1 | 0–5 s | "ouvi dizer que alagou a avenida…" · "alguém sabe se tem show hoje?" · "essa foto é de hoje?" | Bolhas cinza pipocam sobre a miniatura apagada; uma traz uma foto com "?" |
| 2 | 5–8 s | OUVIU? → VIU. | O "OU" cai; "VIU." acende em ouro; janelas acendem e as primeiras fotos pousam |
| 3 | 8–10 s | O que está rolando agora em Itapetininga. | A câmera desliza pela cidade viva |
| 4 | 10–15 s | Tire uma foto. · Ela aparece onde foi tirada. | Celular: Registrar → câmera → "O que é" → "Publicar · some em 2h"; o pino sai da tela e pousa com halo |
| 5 | 15–20 s | Só vale foto de agora. · E some em até 12 h. | Anéis esvaziando; rótulos 2 h · 6 h · 12 h; um pino some com "puf" |
| 6 | 20–24 s | Quem está perto confirma. | Mergulho no pino → story com "Ainda está rolando" / "Acabou"; o anel ganha tempo |
| 7 | 24–31 s | Quer saber de um lugar? · Alguém aí? · Quem está perto pode responder com foto. | Bolha tracejada → o aviso se espalha pelo chão → a foto chega (drop) |
| 8 | 31–35 s | Avisos do que acontece perto de você. | "Me avisa quando acontecer algo perto" → raio de 1 km na miniatura → "Trânsito perto de você" |
| 9 | 35–39 s | Sem o seu nome. · Rostos e placas desfocados. | Pessoas e carro ilustrados ganham elipses suaves; toast "No ar · 2 rostos e 1 placa protegidos" |
| 10 | 39–45 s | Tem um comércio? · Peça a verificação e divulgue no mapa. | "Divulgue seu estabelecimento" → "Pedir verificação" → pino com o selo Divulgação no "Seu Comércio" |
| 11 | 45–48 s | Funciona no navegador. Sem baixar nada. | "Tenha o Viu na Cidade na tela de início" |
| 12 | 48–54 s | Viu na Cidade · o que está rolando agora em Itapetininga · viunacidade.com.br | A câmera sobe; a borda vira a marca; o pino pousa; link, QR, créditos |

## HERO (14 s, sem texto e sem áudio), a partir do protótipo
| Tempo | O que acontece |
| --- | --- |
| 0,6 s | A feira pousa com "Agora" |
| 1,8 s | Aparece a obra |
| 3,0 s | O show da praça pousa; em 5,2 s ganha "Em alta" |
| 4,2 s | Surge o "Alguém aí?"; a resposta chega em 6,2 s |
| 7,0 s | Começa a chuva; o alagamento pousa |
| 9,0 s | A obra some |
| 10,0 s | O trânsito pousa com "Agora" |
| 12,6–13,4 s | Tudo esvazia e o loop recomeça |

A câmera deriva o tempo todo. O último quadro emenda no primeiro.
