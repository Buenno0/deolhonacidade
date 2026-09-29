import { severidade } from "@/design/tokens.mjs";

export type Category =
  | "transito"
  | "alagamento"
  | "acidente"
  | "evento"
  | "seguranca"
  | "falta_energia"
  | "obra"
  | "outro"
  | "estabelecimento";

export type Severity = "danger" | "warn" | "accent";

// Não há cor por categoria (a foto é a cor). A categoria é ícone + rótulo, e a
// severidade escolhe uma das três semânticas para o anel do pin.
// special: não é acontecimento. Não aparece no seletor comum, não vai para o
// Trends, o calor, os alertas nem o histórico.
export const CATEGORIES: Record<Category, { label: string; severity: Severity; special?: boolean }> = {
  transito: { label: "Trânsito", severity: severidade.transito as Severity },
  alagamento: { label: "Alagamento", severity: severidade.alagamento as Severity },
  acidente: { label: "Acidente", severity: severidade.acidente as Severity },
  evento: { label: "Evento", severity: severidade.evento as Severity },
  seguranca: { label: "Segurança", severity: severidade.seguranca as Severity },
  falta_energia: { label: "Falta de energia", severity: severidade.falta_energia as Severity },
  obra: { label: "Obra", severity: severidade.obra as Severity },
  outro: { label: "Outro", severity: severidade.outro as Severity },
  estabelecimento: { label: "Estabelecimento", severity: "accent", special: true },
};

export const ALL_CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];
// O seletor comum: só o que é acontecimento
export const CATEGORY_KEYS = ALL_CATEGORY_KEYS.filter((k) => !CATEGORIES[k].special);
export const isSpecial = (c: Category) => Boolean(CATEGORIES[c].special);

// Quanto cada categoria dura no mapa. Espelha public.category_lifetime (SQL):
// o que muda rápido some antes; nada passa de 12h.
export const LIFETIME_HOURS: Record<Category, number> = {
  transito: 2,
  acidente: 3,
  seguranca: 3,
  alagamento: 6,
  falta_energia: 6,
  evento: 12,
  obra: 12,
  outro: 12,
  estabelecimento: 12,
};

export const severityVar = (c: Category) => `var(--${CATEGORIES[c].severity})`;
