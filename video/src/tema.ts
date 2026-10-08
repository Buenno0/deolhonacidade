// Paleta do app (design/tokens.mjs, tema escuro, o padrão). Tudo que aparece sobre foto ou cena usa estes valores
// ("sala escura"): ouro, nunca terracota. Sem sombra: profundidade é fundo → superfície → elevado → borda de 1 px.
export const COR = {
  bg: '#0c0a08',
  surface: '#16130f',
  elev: '#211c15',
  line: '#40372b',
  ink: '#f4efe4',
  muted: '#a99a84',
  accent: '#d29a44',
  accentInk: '#1a1206',
  ok: '#7fb79a',
  warn: '#dca84a',
  danger: '#e08163',
  marco: '#3563d9',
  marcoInk: '#f4efe4',
  marcoTexto: '#8fb0f5',
};

// Anel dos pinos: a severidade da categoria (lib/categories.ts → design/tokens.mjs). A trilha é a cor a 22% sobre o fundo.
export const SEVERIDADE = {
  acc: { cor: COR.accent, trilha: '#382a15' },
  warn: { cor: COR.warn, trilha: '#3a2d16' },
  danger: { cor: COR.danger, trilha: '#3b241c' },
  ink: { cor: COR.ink, trilha: '#3a3732' },
} as const;
export type Severidade = keyof typeof SEVERIDADE;

// Ilustrações: mesma família de cores, mais céu, água e luz.
export const CENA = {
  ceuNoite: '#1d2a44',
  ceuFundo: '#141a33',
  agua: '#0e2a3f',
  aguaClara: '#8fb0f5',
  luz: '#ffd98a',
  luzJanela: '#f2c879',
  telha: '#9d5a26',
  telhaEscura: '#7d4520',
  pedra: '#d8ccb4',
  creme: '#e9e1d0',
  chao: '#15171b',
  rua: '#30353e',
  calcada: '#1d2025',
  praca: '#172a20',
  folha: '#2f5a43',
  folhaClara: '#3b6b51',
};
