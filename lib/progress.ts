// Níveis e conquistas. Os limiares espelham public.level_for e
// public.check_badges (SQL); aqui ficam nomes, textos e ícones.
export const LEVELS = [
  { level: 1, name: "Curioso", xp: 0 },
  { level: 2, name: "Olheiro", xp: 100 },
  { level: 3, name: "Vigia", xp: 400 },
  { level: 4, name: "Sentinela", xp: 1200 },
  { level: 5, name: "Guardião da Cidade", xp: 3000 },
  { level: 6, name: "Lenda de Itapetininga", xp: 8000 },
] as const;

export const levelName = (n: number) => LEVELS[Math.min(Math.max(n, 1), 6) - 1].name;

export function levelProgress(xp: number) {
  const cur = [...LEVELS].reverse().find((l) => xp >= l.xp)!;
  const next = LEVELS.find((l) => l.xp > xp) ?? null;
  const frac = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { cur, next, frac };
}

export type BadgeId =
  | "primeiro_olhar"
  | "testemunha"
  | "primeira_pergunta"
  | "mao_amiga"
  | "espalhou"
  | "olho_clinico" | "pronto_socorro" | "coruja" | "detetive" | "viral" | "sempre_de_olho";
export type Icon = "camera" | "check" | "clock" | "moon" | "flag" | "trend" | "flame" | "eye" | "question" | "share" | "chat";

// "first": conquista de primeira vez, de um degrau só, comemorada em ouro
export const BADGES: Record<BadgeId, { name: string; icon: Icon; tiers: string[]; first?: boolean }> = {
  primeiro_olhar: { name: "Primeiro olhar", icon: "camera", tiers: ["Seu primeiro registro no mapa"], first: true },
  testemunha: { name: "Testemunha", icon: "eye", tiers: ["Disse pela primeira vez se algo ainda está rolando"], first: true },
  primeira_pergunta: { name: "Primeira pergunta", icon: "question", tiers: ["Fez seu primeiro \"Alguém aí?\""], first: true },
  mao_amiga: { name: "Mão amiga", icon: "chat", tiers: ["Respondeu um pedido com foto pela primeira vez"], first: true },
  espalhou: { name: "Espalhou a notícia", icon: "share", tiers: ["Compartilhou um post pela primeira vez"], first: true },
  olho_clinico: {
    name: "Olho clínico",
    icon: "check",
    tiers: ["5 posts confirmados por outras pessoas", "25 posts confirmados", "100 posts confirmados"],
  },
  pronto_socorro: {
    name: "Pronto-socorro",
    icon: "clock",
    tiers: ["Respondeu 3 pedidos em até 15 min", "Respondeu 10 pedidos em até 15 min", "Respondeu 30 pedidos em até 15 min"],
  },
  coruja: {
    name: "Coruja",
    icon: "moon",
    tiers: ["Um post confirmado entre 0h e 5h", "5 posts confirmados de madrugada", "15 posts confirmados de madrugada"],
  },
  detetive: {
    name: "Detetive",
    icon: "flag",
    tiers: ["Ajudou a derrubar um post que não era verdade", "Ajudou a derrubar 5", "Ajudou a derrubar 20"],
  },
  viral: { name: "Viral", icon: "trend", tiers: ["Um post com 25 visualizações", "Um post com 100", "Um post com 500"] },
  sempre_de_olho: { name: "Sempre de olho", icon: "flame", tiers: ["3 dias seguidos ajudando", "7 dias seguidos", "30 dias seguidos"] },
};

export const TIER_NAMES = ["bronze", "prata", "ouro"] as const;
// Bronze é o óxido, prata é a pedra clara, ouro é o acento (sempre na sala escura)
export const TIER_COLOR = ["var(--danger)", "var(--ink)", "var(--accent)"] as const;

export type EarnedBadge = { badge: BadgeId; tier: 1 | 2 | 3; earned_at: string; seen: boolean };
export type Progress = {
  xp: number;
  level: number;
  streak_days: number;
  streak_today: boolean;
  xp_today: number;
  nickname: string | null;
  show_nickname: boolean;
  badges: EarnedBadge[];
  counts: { posts: number; confirmed: number; max_views: number };
};

export const DAILY_CAP = 150;
