// Avisos do tempo na cidade (public.city_alerts). Vêm do INMET e não dependem
// de ninguém postar: é o que o mapa tem para mostrar num dia sem registro.

export type Severity = "potencial" | "perigo" | "grande_perigo";

export type CityAlert = {
  id: number;
  kind: string;
  severity: Severity;
  starts_at: string;
  ends_at: string;
  live: boolean;
  risks: string[];
  instructions: string[];
  source: string;
};

// Severidade aponta para as mesmas três semânticas do resto do app
// (DESIGN.md §2.1). O aviso não traz cor própria: a cor do INMET é dele.
export const SEVERITY: Record<Severity, { label: string; tone: "warn" | "danger" }> = {
  potencial: { label: "aviso", tone: "warn" },
  perigo: { label: "perigo", tone: "danger" },
  grande_perigo: { label: "grande perigo", tone: "danger" },
};

export const severityVar = (s: Severity) => `var(--${SEVERITY[s].tone})`;

const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const diaHora = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
const mesmoDia = (a: Date, b: Date) => dia.format(a) === dia.format(b);

// "até as 23:59" quando acaba hoje, "até sex, 18:00" quando passa do dia.
// Quem está na rua decide pelo relógio, não pela data.
export function janela(alert: CityAlert, agora = new Date()) {
  const inicio = new Date(alert.starts_at);
  const fim = new Date(alert.ends_at);
  if (alert.live) return `até ${mesmoDia(fim, agora) ? hora.format(fim) : diaHora.format(fim)}`;
  return `a partir de ${mesmoDia(inicio, agora) ? hora.format(inicio) : diaHora.format(inicio)}`;
}

// O mais grave que está valendo agora; se nada vale, o mais grave que vem aí.
export function principal(alerts: CityAlert[]): CityAlert | null {
  if (!alerts.length) return null;
  return alerts.find((a) => a.live) ?? alerts[0];
}

// Uma linha, do jeito que entra no banner e no estado vazio
export const resumo = (a: CityAlert) => `${a.kind} · ${SEVERITY[a.severity].label} ${janela(a)}`;
