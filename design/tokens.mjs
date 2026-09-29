// Fonte única da paleta do De Olho. Herdada do design system do NAS
// (~/nas/DESIGN.md): basalto à noite, papel morno de dia, ouro gasto e
// terracota como acento, e três semânticas que são o teto de cor.
//
// Tudo que precisa de cor lê daqui:
//   - app/tokens.css         gerado por scripts/gerar-tokens.mjs (npm run tokens)
//   - cores do mapa          lib/map/paleta.ts importa este arquivo
//   - scripts/contraste.mjs  mede os pares em cima destes valores
// No NAS a paleta vivia copiada à mão em quatro lugares (contradição nº 1 do
// DESIGN.md de lá). Aqui ela vive em um.

export const tema = {
  escuro: {
    bg: "#0c0a08", // basalto: a pedra à noite
    surface: "#16130f",
    elev: "#211c15",
    line: "#40372b",
    ink: "#f4efe4",
    muted: "#a99a84",
    accent: "#d29a44", // ouro gasto
    accentInk: "#1a1206",
    ok: "#7fb79a", // pátina de bronze
    warn: "#dca84a", // ocre
    danger: "#e08163", // óxido
    marco: "#3563d9", // azul azulejo: só os marcos da cidade
    marcoInk: "#f4efe4",
    marcoTexto: "#8fb0f5",
  },
  claro: {
    bg: "#f6f3ee", // papel morno
    surface: "#fdfbf7",
    elev: "#efe9df",
    line: "#d0c4b1",
    ink: "#241e17",
    muted: "#6b6154",
    accent: "#9d5a26", // terracota
    accentInk: "#fdfbf7",
    ok: "#2f6f52",
    warn: "#8a5a12",
    danger: "#9c3f1d",
    marco: "#3563d9",
    marcoInk: "#f4efe4",
    marcoTexto: "#2f5fd0",
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
