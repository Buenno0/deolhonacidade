import "server-only";

// Avisos do INMET (https://apiprevmet3.inmet.gov.br/avisos/ativos).
//
// A resposta vem em dois blocos, "hoje" e "futuro", e cada aviso traz a lista
// de municípios atingidos como códigos IBGE em `geocodes`. Como
// public.cities.id já é o código IBGE, o recorte por cidade é exato.
//
// A resposta passa de 700 KB porque cada aviso carrega o ícone em base64.
// Nada disso é usado: o parse joga fora tudo o que não entra no banco.

const URL_AVISOS = "https://apiprevmet3.inmet.gov.br/avisos/ativos";

export type Severity = "potencial" | "perigo" | "grande_perigo";

export type Alert = {
  id: number;
  sequence: number;
  kind: string;
  severity: Severity;
  startsAt: string;
  endsAt: string;
  risks: string[];
  instructions: string[];
  geocodes: Set<string>;
};

const SEVERITY: Record<string, Severity> = {
  "Perigo Potencial": "potencial",
  Perigo: "perigo",
  "Grande Perigo": "grande_perigo",
};

type Raw = {
  id_aviso?: number;
  id_sequencia?: number;
  descricao?: string;
  severidade?: string;
  inicio?: string;
  fim?: string;
  riscos?: unknown;
  instrucoes?: unknown;
  geocodes?: string;
  encerrado?: boolean;
};

// "2026-11-04 09:00" vem no horário de Brasília. O país não tem mais horário
// de verão desde 2019, então o deslocamento é fixo.
function instant(local: string | undefined) {
  const m = local?.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

function parse(raw: Raw): Alert | null {
  const severity = SEVERITY[raw.severidade ?? ""];
  const startsAt = instant(raw.inicio);
  const endsAt = instant(raw.fim);
  // Sem id, sem severidade conhecida ou sem janela, o aviso não entra: é
  // melhor perder um aviso do que mostrar um aviso errado no mapa da cidade.
  if (!raw.id_aviso || !severity || !startsAt || !endsAt || raw.encerrado) return null;
  const geocodes = (raw.geocodes ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  if (!geocodes.length) return null;

  return {
    id: raw.id_aviso,
    sequence: raw.id_sequencia ?? 1,
    kind: (raw.descricao ?? "Aviso").trim(),
    severity,
    startsAt,
    endsAt,
    risks: strings(raw.riscos),
    instructions: strings(raw.instrucoes),
    geocodes: new Set(geocodes),
  };
}

export async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetch(URL_AVISOS, {
    headers: { accept: "application/json", "user-agent": "viunacidade.com.br" },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`INMET respondeu ${res.status}`);
  const body = (await res.json()) as Record<string, Raw[]>;

  const out = new Map<number, Alert>();
  for (const bloco of ["hoje", "futuro"]) {
    for (const raw of body[bloco] ?? []) {
      const a = parse(raw);
      // o mesmo aviso aparece nos dois blocos; fica a sequência maior
      if (a && (out.get(a.id)?.sequence ?? -1) < a.sequence) out.set(a.id, a);
    }
  }
  return [...out.values()];
}

export const alertsForCity = (alerts: Alert[], cityId: number) =>
  alerts.filter((a) => a.geocodes.has(String(cityId)));
