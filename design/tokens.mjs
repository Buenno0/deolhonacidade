// Fonte única da paleta do De Olho. Redesign "mural da cidade": papel de
// jornal de dia, o mesmo papel virado do avesso à noite, e nenhum acento
// colorido. A ação é preta sobre papel (creme sobre tinta no escuro), e o
// vermelho fica reservado ao que está acontecendo agora.
//
// O que saiu daqui foi o ouro gasto herdado do NAS: um acento dourado que era
// marca, botão, anel de evento e selo ao mesmo tempo, e por isso não destacava
// nada. Agora cada cor tem um trabalho só.
//
// Tudo que precisa de cor lê daqui:
//   - app/tokens.css         gerado por scripts/gerar-tokens.mjs (npm run tokens)
//   - cores do mapa          lib/map/paleta.ts importa este arquivo
//   - scripts/contraste.mjs  mede os pares em cima destes valores
// No NAS a paleta vivia copiada à mão em quatro lugares (contradição nº 1 do
// DESIGN.md de lá). Aqui ela vive em um.

export const tema = {
  escuro: {
    bg: "#121110", // o papel virado do avesso
    surface: "#1b1917",
    elev: "#262320",
    line: "#3b3733",
    ink: "#f2efe7",
    muted: "#a8a096",
    accent: "#f2efe7", // a ação é o contrário do fundo, não uma cor
    accentInk: "#15130f",
    ok: "#86c0a0",
    warn: "#d9a24a", // ocre: só severidade, nunca a marca
    danger: "#e8614a", // o vermelho do agora
    marco: "#3563d9", // azul azulejo: só os marcos da cidade
    marcoInk: "#f2efe7",
    marcoTexto: "#8fb0f5",
  },
  claro: {
    bg: "#efede6", // papel de jornal
    surface: "#ffffff", // o cartaz colado no poste
    elev: "#e6e3da", // o chão do mapa
    line: "#c8c2b4", // o fio precisa aparecer no papel, não só no cartaz branco
    ink: "#15130f",
    muted: "#5e584e",
    accent: "#15130f", // o botão principal é preto
    accentInk: "#efede6",
    ok: "#1f6b46",
    warn: "#8a5a12",
    danger: "#c62516", // o vermelho do agora
    marco: "#1b3fa8",
    marcoInk: "#f2efe7",
    marcoTexto: "#1b3fa8",
  },
};

// Sala escura: chrome desenhado POR CIMA de foto usa sempre o escuro, mesmo no
// tema claro. Terracota sobre uma foto escura vira botão escuro em fundo escuro.
export const salaEscura = ["accent", "accentInk", "ink", "muted", "ok", "warn", "danger"];

// Severidade de cada categoria → uma das três semânticas (ou o acento).
// Não existe cor por categoria: a foto é a cor; a categoria é rótulo + ícone.
export const severidade = {
  acidente: "danger",
  seguranca: "danger",
  alagamento: "warn",
  falta_energia: "warn",
  transito: "warn",
  obra: "warn",
  evento: "accent",
  outro: "accent",
};

export const kebab = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
