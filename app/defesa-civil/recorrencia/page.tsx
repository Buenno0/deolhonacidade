"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES, severityVar } from "@/lib/categories";
import { download, toCsv } from "@/lib/admin/csv";
import { INCIDENT_KEYS, coord, dateTime, fmt, mapsUrl, type AgencySpot, type IncidentCategory } from "@/lib/agency/types";
import SituationMap from "@/components/agency/SituationMap";
import { Button, Chip, EmptyState, Spinner } from "@/components/ui";

const PERIODS = [
  { days: 90, label: "90 dias" },
  { days: 180, label: "6 meses" },
  { days: 365, label: "1 ano" },
];

// Onde o mesmo problema volta. Cada linha é um trecho de ~110 m, não um
// endereço: serve para dizer "esta esquina alaga", que é o insumo de Plano
// Diretor e de priorização de obra.
export default function Recorrencia() {
  const supabase = getSupabase();
  const [days, setDays] = useState(90);
  const [cat, setCat] = useState<IncidentCategory | null>(null);
  const [spots, setSpots] = useState<AgencySpot[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setSpots(null);
    return supabase.rpc("agency_recurrence", { p_days: days, p_category: cat }).then(({ data, error }) => {
      if (error) setError(error.message);
      else {
        setError(null);
        setSpots(data as AgencySpot[]);
      }
    });
  }, [supabase, days, cat]);

  useEffect(() => void Promise.resolve().then(load), [load]);

  const key = (s: AgencySpot) => `${s.lat},${s.lng}`;

  const pins = useMemo(
    () =>
      (spots ?? []).map((s) => ({
        id: key(s),
        lat: s.lat,
        lng: s.lng,
        severity: severityVar(s.categories[0] ?? "outro"),
        badge: String(s.n),
      })),
    [spots],
  );

  function exportCsv() {
    if (!spots?.length) return;
    download(
      `recorrencia-${days}-dias.csv`,
      toCsv(
        spots.map((s) => ({
          latitude: s.lat.toFixed(3),
          longitude: s.lng.toFixed(3),
          coordenada: coord(s.lat, s.lng),
          ocorrencias: s.n,
          dias: s.days,
          categorias: s.categories.map((c) => CATEGORIES[c].label).join(", "),
          primeira: dateTime(s.first_at),
          ultima: dateTime(s.last_at),
        })),
        [
          { key: "latitude", label: "Latitude" },
          { key: "longitude", label: "Longitude" },
          { key: "coordenada", label: "Coordenada" },
          { key: "ocorrencias", label: "Ocorrências" },
          { key: "dias", label: "Dias distintos" },
          { key: "categorias", label: "Categorias" },
          { key: "primeira", label: "Primeira" },
          { key: "ultima", label: "Última" },
        ],
      ),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-center gap-1.5">
        {PERIODS.map((p) => (
          <Chip key={p.days} active={days === p.days} onClick={() => setDays(p.days)}>
            {p.label}
          </Chip>
        ))}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {INCIDENT_KEYS.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>
            {CATEGORIES[c].label}
          </Chip>
        ))}
      </section>

      {error && <EmptyState title="Não deu para carregar">{error}</EmptyState>}

      {!spots ? (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      ) : spots.length === 0 ? (
        <EmptyState title="Nenhum ponto repetiu ainda">
          Um trecho entra nesta lista a partir da segunda ocorrência no período. Com poucas semanas de uso ainda não há
          repetição para mostrar.
        </EmptyState>
      ) : (
        <>
          <SituationMap spots={pins} activeId={active} onSelect={setActive} height={380} />

          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="rotulo">
              {fmt(spots.length)} {spots.length === 1 ? "trecho" : "trechos"} com repetição
            </h2>
            <Button variant="secundario" onClick={exportCsv}>
              Baixar CSV
            </Button>
          </div>

          <ul className="flex flex-col gap-2">
            {spots.map((s) => {
              const id = key(s);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setActive(id)}
                    className={`flex w-full items-center gap-3 rounded-xl border bg-surface p-3 text-left transition ${
                      active === id ? "border-accent" : "border-line"
                    }`}
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 font-display text-sm font-semibold tabular-nums"
                      style={{ borderColor: severityVar(s.categories[0] ?? "outro") }}
                    >
                      {s.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">
                        {s.categories.map((c) => CATEGORIES[c].label).join(" · ")}
                      </span>
                      <span className="block text-xs text-muted">
                        em {s.days === 1 ? "um único dia" : `${s.days} dias diferentes`} · última em {dateTime(s.last_at)}
                      </span>
                    </span>
                    <a
                      href={mapsUrl(s.lat, s.lng)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 font-mono text-xs text-muted underline hover:text-accent"
                    >
                      {coord(s.lat, s.lng)}
                    </a>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
