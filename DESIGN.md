# Design system — De Olho na Cidade

Herdeiro direto do design system do NAS Ozymandias (`~/nas/DESIGN.md`). Mesma
paleta, mesma régua de contraste, mesmas regras de forma; o que muda é o
assunto. Este documento descreve **o que existe no código**. Os números de
contraste saem de `npm run contraste`, que falha se algum par reprovar.

---

## 1. A ideia

No NAS, a marca é uma máscara em ruínas e "o acervo é o herói". Aqui, **a foto
é a heroína**: o app é um mapa de coisas acontecendo agora, e a única fonte de
cor saturada na tela é o que as pessoas fotografaram.

Quatro decisões que se repetem em tudo:

- **Papel e tinta, não pedra e ouro.** A interface é um mural de cidade:
  papel de jornal, régua preta, fio no lugar da caixa. O escuro é o mesmo
  papel virado do avesso, um tema completo, não um filtro.
- **Nenhum acento colorido.** A ação primária é preta sobre papel. Nenhuma
  categoria tem cor própria: categoria é ícone + rótulo.
- **O vermelho é o agora.** `--danger` é a única cor que grita, e grita por
  uma coisa só: o que está acontecendo neste minuto.
- **O tempo é visível.** Tudo some em 12h, então o tempo restante aparece em
  todo lugar do mesmo jeito: um anel que esvazia e um relógio de missão (`11:37`).

O escuro ainda é o padrão no código. Ele deixa de ser na etapa da LP: tela de
celular no sol pede papel claro e brilho alto, não basalto.

---

## 2. Paleta

**Fonte única: `design/tokens.mjs`.** Dela saem o CSS (`app/tokens.css`,
gerado por `npm run tokens`), as cores do mapa (`lib/map/style.ts`) e a
medição de contraste (`scripts/contraste.mjs`). No NAS a paleta era copiada à
mão em quatro lugares (a contradição nº 1 de lá); aqui não.

| token | escuro | claro | uso |
|---|---|---|---|
| `--bg` | `#121110` | `#efede6` | fundo, chão do mapa |
| `--surface` | `#1b1917` | `#ffffff` | cabeçalho, sheets, chips |
| `--elev` | `#262320` | `#e6e3da` | hover, poço da foto, ruas no escuro |
| `--line` | `#3b3733` | `#c8c2b4` | toda borda e divisória |
| `--ink` | `#f2efe7` | `#15130f` | texto |
| `--muted` | `#a8a096` | `#5e584e` | texto secundário, legenda |
| `--accent` | `#f2efe7` | `#15130f` | ação primária, limite da cidade |
| `--accent-ink` | `#15130f` | `#efede6` | texto sobre o acento |

**O acento não é uma cor.** Esta é a decisão central do redesign "mural da
cidade": a ação primária é tinta sobre papel no claro e papel sobre tinta no
escuro. O ouro gasto herdado do NAS era marca, botão, anel de evento e selo ao
mesmo tempo, e por isso não destacava nada. Quem ficou com o trabalho de
chamar atenção foi o `--danger`, que agora é **o vermelho do agora**: o que
está acontecendo neste minuto, e só isso.

**Quatro níveis de profundidade** (`bg` → `surface` → `elev` → borda) e nenhuma
sombra. A única "elevação" do app é o `backdrop-blur` do cabeçalho sobre o mapa.

### 2.1 As três semânticas — e a severidade

| token | escuro | claro |
|---|---|---|
| `--ok` | `#86c0a0` | `#1f6b46` |
| `--warn` | `#d9a24a` | `#8a5a12` |
| `--danger` | `#e8614a` | `#c62516` |

São o teto de cor. No NAS, `--ok` tinha 3 usos e era "quase uma cor solta";
aqui ele ganhou trabalho: localização precisa, água e parque no mapa.

Cada categoria aponta para uma delas pela **severidade** (`design/tokens.mjs`):

| severidade | categorias |
|---|---|
| `danger` | acidente, segurança |
| `warn` | alagamento, falta de energia, trânsito, obra |
| `accent` | evento, outro |

É a cor do anel do pin, do selo no visualizador e da barra de vida do post.

### 2.2 Sala escura

Mesma regra do NAS: **chrome por cima de foto usa os tokens do escuro**, mesmo
no tema claro (`.sala-escura` em `app/tokens.css`). Aplicada no visualizador,
nos pins e na faixa ao vivo. Sem ela, a terracota do claro vira um selo escuro
em cima de uma foto escura.

### 2.3 O mapa

O mapa **não** segue a paleta da interface. A primeira versão recoloria o mapa
com os tokens de pedra e, no escuro, as ruas ficaram a ~1,2:1 do chão: bonito
e ilegível. Agora o mapa é feito para ser lido de relance e a interface
continua pedra e areia por cima dele. Três tipos (`lib/map/style.ts`),
escolhidos pelo botão de camadas e lembrados por navegador:

| tipo | base | como é |
|---|---|---|
| Padrão, escuro | positron repintado ("noturno") | carvão `#15171b`, ruas `#343a44`, avenidas e rodovias `#4d5461` (a rodovia só é mais larga), água `#0e2a3f`, parque `#172a20`, rótulos `#e6e9ed` |
| Padrão, claro | positron repintado ("dia") | papel `#f3f0e9`, ruas, avenidas e rodovias brancas com contorno, água `#a8d2e6`, parque `#d6eacd`, rótulos `#2d3136` |
| Colorido | liberty do OpenFreeMap | o mapa familiar, com comércios e pontos; rodovias e avenidas brancas como as outras ruas |
| Satélite | Esri World Imagery + rótulos do positron | nomes em branco com halo preto a 78% |

As ruas locais são 30% mais largas que no positron original, e as avenidas
15%. A máscara fora do município e a linha do limite seguem o **tom do mapa
desenhado** (`mapTone`), não o tema da interface: escura a 62% nos mapas
escuros, papel a 66% nos claros, preta a 50% no satélite.

O satélite do Esri serve para desenvolvimento. Em produção, troque
`NEXT_PUBLIC_SATELLITE_TILES` por uma URL com chave (ArcGIS Location Platform
ou MapTiler, ambos com plano gratuito).

---

## 3. Tipografia

Todas servidas pelo app (`app/fonts/`, subconjunto latin), sem requisição a
terceiros:

| família | onde |
|---|---|
| **Anton** 400 (`font-cartaz`, e `font-display` aponta para ela) | todo título: o herói da LP, as chamadas de seção, o nome do app, o título de sheet, a legenda no visualizador |
| **Instrument Serif** 400 + itálico (`font-serifa`, `.legenda`) | lugar, hora, categoria: o metadado que antes era rótulo mono |
| pilha do sistema | corpo, botão, campo |
| **JetBrains Mono** 400/500 (`.num`, e `.rotulo` nas telas internas) | número: relógio, contagem, precisão do GPS |

**Uma família de título só.** `--font-display` aponta para a mesma Anton do
cartaz, e por isso a Archivo saiu do projeto: duas famílias de título seriam
duas vozes. As duas novas somam 42 KB e a saída da Archivo devolveu 35, então
o app ficou 7 KB mais pesado em fonte e ganhou uma serifa.

O corpo segue na pilha do sistema de propósito: uma terceira família baixada
custaria mais do que entrega.

- **A serifa é editorial, não operacional.** É a regra que mais corta.
  `.legenda` (serifa itálica 15px, `--muted`) vale para o que legenda alguma
  coisa: o lugar e a hora de uma foto, o crédito de uma imagem, a fonte de um
  texto, a chamada de seção da LP. São 6 usos no app.
  `.etiqueta` (pilha do sistema, 13px, 500, `--muted`) vale para o cromo que
  opera: rótulo de campo, status, seção de menu, cabeçalho, aviso. São 61.
  A serifa itálica em cromo sobre mapa fica frágil, e um "ver" em serifa
  parece nota de rodapé em vez de botão. Na LP a `.lp-legenda` (17px) e a
  `.lp-legenda-p` (14px) são editoriais pelos dois lados, porque lá a página
  inteira é contexto de leitura.
- **Ação precisa de peso.** Um "ver" solto no meio de uma faixa não parece
  tocável: leva `text-ink` e sublinhado com `underline-offset-4`.
- `.rotulo`: mono 10px, 500, `letter-spacing: .16em`, maiúsculo, `--muted`.
  **Saiu do produto inteiro.** Sobraram 71 usos no `/admin` e no
  `/defesa-civil`, que são ferramentas internas: ali o mono denso em caixa alta
  é adequado, e ninguém de fora vê. Se alguma dessas telas virar produto, ela
  migra junto.
- **Abaixo de 10px, mono.** A serifa itálica some em 9px, então relógio,
  contagem e selo miúdo usam `.num`. Número é o lugar onde a mono fica.
- `.num`: mono com `tabular-nums`, para o relógio não dançar quando o minuto vira.

Corpo em 14px (`text-sm`), campos em 16px (`text-base`, evita zoom no iOS).

---

## 4. Forma

**Canto vivo é o padrão.** O raio é a exceção, não a régua:

| forma | uso |
|---|---|
| canto vivo | botão, campo, cartão, sheet, cabeçalho, poço da foto, estado vazio |
| `rounded-full` | chip, botão de ícone, pin, ponto, pílula de status |
| `14 14 14 4` | o balão do pedido (§5.3): a ponta diz de onde ele fala |
| 11px e 7px | o azulejo do marco (§5.7): ladrilho tem canto arredondado |

A régua antiga era "quanto maior a superfície, maior o raio", de 8px a 16px.
Era o que fazia tudo parecer o mesmo card de dashboard. Agora o que separa uma
superfície da outra é o fio ou a régua preta, não o arredondamento.

Sheet: sobe de baixo no celular, centraliza a partir de `sm:`.

---

## 5. Componentes

| componente | arquivo | notas |
|---|---|---|
| `Button` | `components/ui/index.tsx` | `primario`, `secundario`, `fantasma`, `perigo`; `size="lg"` |
| `IconButton` | idem | 40px, borda, `aria-label` obrigatório |
| `Chip` | idem | filtro e escolha de categoria; `aria-pressed` |
| `Spinner`, `EmptyState` | idem | carregando / vazio |
| `Sheet` | `components/Sheet.tsx` | eyebrow em `.legenda` + título em Anton; Esc fecha |
| `Mark` | `components/ui/Mark.tsx` | o município com o pin no centro urbano |
| ícones | `components/ui/icons.tsx` | viewBox 24, traço 1.8, redondo, `currentColor` |
| pin | `components/map/CityMap.tsx` + `.pin` | foto + anel de tempo + ponta |
| `PostViewer` | `components/PostViewer.tsx` | tela cheia, carrossel com scroll-snap |
| `LiveStrip` | `components/LiveStrip.tsx` | fila "ao vivo", o mesmo anel |

### 5.1 O pin

O pin **é a própria foto** (miniatura de 192px, ~1 KB). Em volta, um anel em
`conic-gradient` com `--restante` de 1 a 0: cheio quando o post nasce, vazio
quando vai sumir. A cor é a severidade.

- **Cluster:** mostra a foto do post mais novo do grupo (`clusterProperties:
  newest`), com uma segunda "foto" deslocada atrás e a contagem em mono sobre o
  acento. Toque aproxima; se todos estão no mesmo ponto, abre a sequência.
- **Novo (< 10 min):** o anel respira (`pin-respira`, 2,4s).
- **Chegando por Realtime:** pousa (`pin-pousa`, 520ms).
- **Ativo (aberto no visualizador):** escala 1,12.

### 5.2 A marca: "você está aqui"

O contorno oficial do município de Itapetininga (IBGE 3522307, o mesmo
GeoJSON do mapa, simplificado por Douglas-Peucker numa caixa de 100×100) com
um pin cravado **no ponto exato do centro urbano** dentro do território.
Quem é da cidade reconhece o formato, e o pin diz "é aqui".

- Corpo em `--accent`, pin recortado em `--accent-ink`, miolo do pin em
  `--accent`: a mesma amarração do NAS, em que a marca e o botão primário são
  visivelmente a mesma coisa. `components/ui/Mark.tsx` exporta `CITY_PATH` e
  `PIN_PATH`.
- **Três desenhos.** A marca no app (segue o tema); o ícone do app em
  `public/icon.svg` e nos PNG `public/icons/icon-192.png`, `icon-512.png`
  (placa de basalto, fixa); o `app/apple-icon.png` de 180px, quadrado cheio
  porque o iOS aplica a máscara; e o favicon `app/icon.svg`, com o contorno
  mais simplificado, traço mais grosso e o pin maior, porque em 16px o
  recorte fino vira borrão.
- Os PNG são renderizados a partir do SVG (`qlmanage -t -s 512`); se a marca
  mudar, gere de novo em vez de editar imagem.

### 5.3 O pedido ("Alguém aí?")

O único marcador sem foto, porque o pedido ainda não tem imagem: um balão de 44px
com raio `14 14 14 4` (a ponta embaixo à esquerda), fundo `--surface`,
contorno **tracejado** de 2px em `--accent` e o ícone de pergunta. Tracejado
porque é uma promessa de foto, não uma foto. O número de respostas visíveis
fica num selo em `.num` sobre `--accent`. No modo perguntar, o mesmo balão
vira a mira fixa no centro da tela.

### 5.4 "Ainda está rolando?"

Uma caixa dentro do visualizador (sala escura), em preto a 40% com borda
branca a 10%: a pergunta, o resumo em `.rotulo` ("3 confirmaram · último há
5 min") e dois botões, Sim (check em `--ok`) e Acabou. Depois do voto, a
caixa agradece e a barra de vida do post já mostra o efeito.

### 5.5 Mapa de calor

Um degradê próprio do mapa (como as cores do mapa, fora dos tokens): de
transparente a âmbar, óxido, vermelho e um miolo de areia clara onde há mais
registros. Raio grande (28 a 120px conforme o zoom) de propósito, para o calor
aparecer em volta dos pins, e não escondido embaixo deles.

### 5.6 A prévia do compartilhamento

`app/p/[id]/opengraph-image.tsx`, 1200×630: a foto inteira, com um degradê
preto de baixo para cima; o selo da categoria no contorno da severidade, o
tempo restante num selo escuro, a legenda grande e a marca com o nome da
cidade. A fonte é a padrão do gerador (ele não lê WOFF2 nem fontes variáveis),
então a hierarquia vem só do tamanho.

### 5.7 O marco (azulejo)

Um ladrilho de 40px, raio 11, em `marco` (#3563d9, fixo nos dois temas),
com borda creme de 2px (`marco-ink`), um fio escuro por fora e um filete de ouro
de 1px por dentro, como a moldura de um azulejo. O glifo do tipo (igreja,
estátua, monumento, patrimônio, marco) vai em creme, e uma ponta aponta o
lugar. Patrimônio tombado ganha uma estrela de ouro no canto. O azul é a única
cor fria sobre a interface quente: o ouro já é do acento, do anel de evento e
da marca, e um marco dourado virava um story sem foto. Texto sobre fundo de
interface usa `marco-texto`.

Movimento: um reflexo de ouro atravessa o ladrilho em 0,9s a cada 8s, com
atraso diferente por marco (`--atraso`), para o mapa nunca piscar inteiro.
Aberto, ele sobe 3px, o filete engrossa e um anel de ouro abre uma vez. Ao
passar do zoom 13, nasce da ponta em 360ms.

### 5.8 Tags do story

| tag | quando | desenho | gesto |
|---|---|---|---|
| Agora | publicado há menos de 10 min | pílula escura, ponto em `danger` | o ponto ecoa para fora a cada 1,6s; o anel do pin respira em coral |
| Em alta | entre os 3 primeiros do Trends, com engajamento ≥ 5 | pílula cheia em `accent`, seta | a seta sobe em loop; no pin, um brilho gira no anel e o pin vai a 58px |
| Divulgação | categoria estabelecimento | pílula escura, contorno creme, ícone de loja | nenhum: publicidade identificada, não acontecimento |

Um pin mostra no máximo uma tag (Divulgação, senão Em alta, senão Agora). No
visualizador e no Trends cabem todas, e Em alta mostra a posição (1º, 2º, 3º).
Regra de movimento: story pulsa para fora (é o agora), marco reflete por
dentro (é o que fica); nunca os dois com o mesmo gesto.

### 5.9 Histórico

A aba Histórico mostra um dia dos últimos 30 no mapa, escolhido numa régua de
dias no rodapé (dia vazio fica apagado). Os pins do histórico têm o anel cheio
em `muted`, sem tempo e sem tags, e o topo mostra "Histórico · 28/09" para
ninguém confundir com o agora. No visualizador, "registrado em 28/09 às
18:40" toma o lugar do relógio, sem "Ainda está rolando?".

---

## 6. Movimento

| duração | uso |
|---|---|
| 160ms | hover, escala do pin |
| 520ms | círculo da troca de tema (View Transitions, portado do NAS), pouso do pin |
| 2,4s | respiração do pin novo (Agora), brilho que gira no anel (Em alta) |
| 1,6s / 1,8s | eco do ponto de Agora / seta de Em alta |
| 0,9s a cada 8s | reflexo do marco |
| 360ms | marco nascendo ao passar do zoom 13 |
| ~1s | ponto "ao vivo" (`animate-ping`) |

`prefers-reduced-motion: reduce` desliga tudo, inclusive o círculo do tema.

---

## 7. Estados

- **Carregando:** spinner no status "ao vivo" do cabeçalho.
- **Vazio:** "Tudo calmo por aqui" no meio do mapa; com filtro, "Nada de
  alagamento agora" + "Ver tudo".
- **Erro de rede:** "Sem sinal" + "Tentar de novo".
- **Localização:** buscando (com segundos), ok (`--ok`), aproximada (`--warn`,
  até 500 m), baixa (espera), negada (`--danger`, com o caminho nos ajustes).
- **Publicação:** o botão diz o que falta ("Tire a foto", "Escolha o que é",
  "Aguardando localização") em vez de só ficar desabilitado.

Foco: `:focus-visible` com contorno de 2px em acento.

---

## 8. Contraste

`npm run contraste`: **43 pares, 43 passando** (escuro, claro e sala escura).
Os destaques:

| par | escuro | claro |
|---|---|---|
| corpo sobre fundo | 16,15:1 | 15,84:1 |
| secundário sobre superfície | 6,46:1 | 7,04:1 |
| botão primário / chip ativo | 16,15:1 | 15,84:1 |
| perigo sobre superfície | 5,21:1 | 5,71:1 |
| legenda sobre foto (degradê) | 13,17:1 | — (sala escura) |

O botão primário saltou para 16:1 porque deixou de ser dourado. O par que
quase reprovou foi **a borda sobre o fundo no claro**: `#d8d4ca` no papel dava
1,26 contra um alvo de 1,4, então o fio escureceu para `#c8c2b4`. No visual
novo o fio faz o trabalho que a sombra não faz, e precisa aparecer no papel,
não só no cartaz branco.

---

## 9. Contradições conhecidas

1. **O fundo dos selos sobre foto é medido contra um cinza fixo** (`#262626`),
   não contra a foto real. O degradê `from-black/85` torna o pior caso
   previsível, mas previsível não é medido — a mesma ressalva do NAS sobre o
   pôster sem capa.
2. **O ícone de app é fixo no escuro** (limitação do iOS, como no NAS). Os PNG
   são gerados à mão a partir do SVG; não há script no build.
3. **O mapa tem cores fora dos tokens** (§2.3), de propósito: legibilidade
   do mapa vence a coerência da paleta. Elas vivem em `lib/map/style.ts`, não
   em `design/tokens.mjs`, e dependem dos ids de camada do positron.
4. **As telas internas ficaram para trás.** `/admin` e `/defesa-civil` ainda
   têm 71 `.rotulo` e os cantos arredondados antigos. Foi decisão, não
   esquecimento: são ferramentas internas, e ali o mono denso em caixa alta
   serve. Se alguma delas virar produto, migra junto.
5. **A LP ainda é isométrica.** As ilustrações (`components/landing/scenes.tsx`,
   622 linhas, usadas por oito componentes) continuam no desenho isométrico do
   visual antigo. No papel claro elas passaram a funcionar como blocos de foto,
   o que comprou tempo, mas a linguagem de ilustração ainda não é a do mural.
   O degradê de dia e noite do "um dia em Itapetininga" fica dourado de
   propósito: ali o ouro é o sol, não a marca.

---

## 10. Como mexer sem quebrar

- **Cor nova?** Na interface, não existe (o mapa é a exceção, §2.3). Procure entre os 11 tokens; se precisar mesmo,
  entra em `design/tokens.mjs`, e depois `npm run tokens && npm run contraste`.
- **Categoria nova?** Ícone em `icons.tsx` (mesmo traço) + severidade em
  `tokens.mjs`. Nunca uma cor.
- **Algo por cima de foto?** Contêiner com `sala-escura`, e confira no tema claro.
- **Componente novo?** Parta de uma receita do §5. Se ele precisa de sombra
  para se separar, devia ser uma borda.
