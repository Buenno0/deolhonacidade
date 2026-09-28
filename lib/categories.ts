export type Category =
  | "transito"
  | "alagamento"
  | "acidente"
  | "evento"
  | "seguranca"
  | "falta_energia"
  | "obra"
  | "outro";

export const CATEGORIES: Record<Category, { label: string; emoji: string; color: string }> = {
  transito: { label: "Trânsito", emoji: "🚗", color: "#f59e0b" },
  alagamento: { label: "Alagamento", emoji: "🌊", color: "#0ea5e9" },
  acidente: { label: "Acidente", emoji: "🚑", color: "#ef4444" },
  evento: { label: "Evento", emoji: "🎉", color: "#a855f7" },
  seguranca: { label: "Segurança", emoji: "🚨", color: "#dc2626" },
  falta_energia: { label: "Falta de energia", emoji: "💡", color: "#eab308" },
  obra: { label: "Obra", emoji: "🚧", color: "#f97316" },
  outro: { label: "Outro", emoji: "📍", color: "#64748b" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];
