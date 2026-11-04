// Formas das respostas das RPCs do painel da Defesa Civil
// (supabase/migrations/…_defesa_civil.sql). O agente só enxerga ocorrência da
// própria cidade: nada aqui carrega conta, e-mail ou autor.
import type { Category } from "@/lib/categories";

// As categorias que a Defesa Civil atende. Espelha public.is_incident (SQL):
// mude as duas juntas.
export const INCIDENT_KEYS = [
  "alagamento",
  "acidente",
  "falta_energia",
  "obra",
  "transito",
  "seguranca",
] as const;

export type IncidentCategory = (typeof INCIDENT_KEYS)[number];
export const isIncident = (c: Category): c is IncidentCategory =>
  (INCIDENT_KEYS as readonly string[]).includes(c);

export type AgencyEvent = {
  id: string;
  category: IncidentCategory;
  caption: string | null;
  photo_path: string;
  created_at: string;
  expires_at: string;
  live: boolean;
  confirm_count: number;
  deny_count: number;
  view_count: number;
  last_confirmed_at: string | null;
  answers_request: boolean;
  lat: number;
  lng: number;
};

export type AgencyAsk = {
  id: string;
  question: string;
  created_at: string;
  expires_at: string;
  answer_count: number;
  lat: number;
  lng: number;
};

export type AgencyLive = { city_id: number; at: string; features: AgencyEvent[]; requests: AgencyAsk[] };

export type AgencySummary = {
  days: number;
  since: string;
  city: { id: number; name: string; uf: string };
  agency: string;
  retention_days: number;
  live_now: number;
  total: number;
  confirmed: number;
  by_category: { category: IncidentCategory; n: number }[];
  series: { day: string; n: number }[];
  by_hour: number[];
};

export type AgencyLog = { from: string; to: string; total: number; events: AgencyEvent[] };

export type AgencySpot = {
  lat: number;
  lng: number;
  n: number;
  days: number;
  first_at: string;
  last_at: string;
  categories: IncidentCategory[];
};

export type AgencyEventSheet = {
  event: AgencyEvent & {
    share_count: number;
    report_count: number;
    agency_until: string | null;
    faces_blurred: number;
    plates_blurred: number;
    checked_by: string | null;
  };
  city: { name: string; uf: string };
  issued_by: { agency: string; at: string };
};

// ---------------------------------------------------------------------------
// Formatação. O painel é lido por quem está decidindo mandar equipe: número
// grande, unidade escrita, zero abreviação que precise de legenda.

const nf = new Intl.NumberFormat("pt-BR");
export const fmt = (n: number) => nf.format(n);

const full = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const clock = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

export const dateTime = (iso: string | null) => (iso ? full.format(new Date(iso)) : "—");
export const hour = (iso: string) => clock.format(new Date(iso));
export const shortDay = (iso: string) => dayMonth.format(new Date(`${iso}T12:00:00-03:00`));

// Há quanto tempo chegou. A Defesa Civil decide por isso, não pelo relógio.
export function ago(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;
  const d = Math.floor(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

// Coordenada do jeito que entra em ofício e em GPS de viatura
export const coord = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
export const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

// Confiança da ocorrência: quem estava perto disse que era verdade?
export function trust(e: { confirm_count: number; deny_count: number }) {
  if (e.deny_count >= 3 && e.deny_count > e.confirm_count) return { label: "contestada", tone: "danger" as const };
  if (e.confirm_count >= 3) return { label: `confirmada por ${e.confirm_count}`, tone: "ok" as const };
  if (e.confirm_count > 0) return { label: `confirmada por ${e.confirm_count}`, tone: "warn" as const };
  return { label: "sem confirmação", tone: "muted" as const };
}
