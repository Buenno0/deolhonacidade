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

Três decisões que se repetem em tudo:

- **Escuro é o padrão.** O app é usado na rua, muitas vezes à noite, e o mapa
  em basalto deixa a foto brilhar. O claro é um tema completo, não um filtro.
- **Pedra e areia na interface, cor só em ação e em foto.** Nenhuma categoria
  tem cor própria. Categoria é ícone + rótulo.
- **O tempo é visível.** Tudo some em 12h, então o tempo restante aparece em
  todo lugar do mesmo jeito: um anel que esvazia e um relógio de missão (`11:37`).

---

## 2. Paleta

**Fonte única: `design/tokens.mjs`.** Dela saem o CSS (`app/tokens.css`,
gerado por `npm run tokens`), as cores do mapa (`lib/map/style.ts`) e a
medição de contraste (`scripts/contraste.mjs`). No NAS a paleta era copiada à
mão em quatro lugares (a contradição nº 1 de lá); aqui não.

| token | escuro | claro | uso |
|---|---|---|---|
| `--bg` | `#0c0a08` | `#f6f3ee` | fundo, chão do mapa |
| `--surface` | `#16130f` | `#fdfbf7` | cabeçalho, sheets, chips |
| `--elev` | `#211c15` | `#efe9df` | hover, poço da foto, ruas no escuro |
| `--line` | `#40372b` | `#d0c4b1` | toda borda e divisória |
| `--ink` | `#f4efe4` | `#241e17` | texto |
| `--muted` | `#a99a84` | `#6b6154` | texto secundário, micro-rótulo |
| `--accent` | `#d29a44` | `#9d5a26` | ação primária, marca, limite da cidade |
| `--accent-ink` | `#1a1206` | `#fdfbf7` | texto sobre o acento |

**Quatro níveis de profundidade** (`bg` → `surface` → `elev` → borda) e nenhuma
sombra. A única "elevação" do app é o `backdrop-blur` do cabeçalho sobre o mapa.

### 2.1 As três semânticas — e a severidade

| token | escuro | claro |
|---|---|---|
| `--ok` | `#7fb79a` | `#2f6f52` |
| `--warn` | `#dca84a` | `#8a5a12` |
| `--danger` | `#e08163` | `#9c3f1d` |

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

As mesmas famílias do NAS, servidas pelo app (`app/fonts/`, variáveis, latin):

| família | onde |
|---|---|
| **Archivo** 600/700 (`font-display`) | nome do app, títulos de sheet, legenda no visualizador, estado vazio |
| **JetBrains Mono** 400/500 (`.rotulo`, `.num`) | micro-rótulos, contagens, relógio, precisão do GPS |
| pilha do sistema | corpo |

O NAS tinha a tipografia partida (Archivo só no login). Aqui a Archivo é
usada no produto inteiro desde o início.

- `.rotulo`: mono 10px, 500, `letter-spacing: .16em`, maiúsculo, `--muted`.
- `.num`: mono com `tabular-nums`, para o relógio não dançar quando o minuto vira.

Corpo em 14px (`text-sm`), campos em 16px (`text-base`, evita zoom no iOS).

---

## 4. Forma

Quanto maior a superfície, maior o raio:

| raio | uso |
|---|---|
| `rounded-lg` 8px | botão, campo |
| `rounded-full` | chip, botão de ícone, pin, pílula de status |
| `rounded-xl` 12px | poço da foto, caixa de localização |
| `rounded-2xl` 16px | cabeçalho, sheet, estado vazio |

Sheet: sobe de baixo no celular, centraliza a partir de `sm:`.

---

## 5. Componentes

| componente | arquivo | notas |
|---|---|---|
| `Button` | `components/ui/index.tsx` | `primario`, `secundario`, `fantasma`, `perigo`; `size="lg"` |
| `IconButton` | idem | 40px, borda, `aria-label` obrigatório |
| `Chip` | idem | filtro e escolha de categoria; `aria-pressed` |
| `Spinner`, `EmptyState` | idem | carregando / vazio |
| `Sheet` | `components/Sheet.tsx` | eyebrow em `.rotulo` + título em Archivo; Esc fecha |
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

`npm run contraste`: **37 pares, 37 passando** (escuro, claro e sala escura).
Os destaques:

| par | escuro | claro |
|---|---|---|
| corpo sobre fundo | 17,24:1 | 14,90:1 |
| secundário sobre superfície | 6,74:1 | 5,87:1 |
| botão primário / chip ativo | 7,45:1 | 5,18:1 |
| perigo sobre superfície | 6,60:1 | 6,47:1 |
| legenda sobre foto (degradê) | 13,20:1 | — (sala escura) |

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

---

## 10. Como mexer sem quebrar

- **Cor nova?** Na interface, não existe (o mapa é a exceção, §2.3). Procure entre os 11 tokens; se precisar mesmo,
  entra em `design/tokens.mjs`, e depois `npm run tokens && npm run contraste`.
- **Categoria nova?** Ícone em `icons.tsx` (mesmo traço) + severidade em
  `tokens.mjs`. Nunca uma cor.
- **Algo por cima de foto?** Contêiner com `sala-escura`, e confira no tema claro.
- **Componente novo?** Parta de uma receita do §5. Se ele precisa de sombra
  para se separar, devia ser uma borda.
