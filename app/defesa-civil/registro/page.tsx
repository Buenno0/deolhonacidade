"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import { download, toCsv } from "@/lib/admin/csv";
import {
  INCIDENT_KEYS,
  coord,
  dateTime,
  fmt,
  trust,
  type AgencyLog,
  type IncidentCategory,
} from "@/lib/agency/types";
import { useAgency } from "@/components/agency/context";
import EventCard from "@/components/agency/EventCard";
import { Button, Chip, EmptyState, Spinner } from "@/components/ui";

const PAGE = 200;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};

// Registro de ocorrências: a lista que vira ofício. Enquanto a retenção do
// município estiver desligada, só aparece o que ainda está no ar.
export default function Registro() {
  const supabase = getSupabase();
  const { summary } = useAgency();
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(iso(new Date()));
  const [cats, setCats] = useState<Set<IncidentCategory>>(new Set());
  const [log, setLog] = useState<AgencyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => (cats.size ? [...cats] : null), [cats]);

  const load = useCallback(() => {
    setLoading(true);
    return supabase
      .rpc("agency_log", { p_from: from, p_to: to, p_categories: categories, p_limit: PAGE })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) setError(error.message);
        else {
          setError(null);
          setLog(data as AgencyLog);
        }
      });
  }, [supabase, from, to, categories]);

  useEffect(() => void Promise.resolve().then(load), [load]);

  function toggle(c: IncidentCategory) {
    setCats((s) => {
      const next = new Set(s);
      if (!next.delete(c)) next.add(c);
      return next;
    });
  }

  function exportCsv() {
    if (!log) return;
    const rows = log.events.map((e) => ({
      data: dateTime(e.created_at),
      categoria: CATEGORIES[e.category].label,
      legenda: e.caption ?? "",
      latitude: e.lat.toFixed(6),
      longitude: e.lng.toFixed(6),
      coordenada: coord(e.lat, e.lng),
      confirmacoes: e.confirm_count,
      contestacoes: e.deny_count,
      situacao: e.live ? "no ar" : "encerrada",
      veracidade: trust(e).label,
      ficha: `${location.origin}/defesa-civil/evento/${e.id}`,
    }));
    download(
      `ocorrencias-${from}-a-${to}.csv`,
      toCsv(rows, [
        { key: "data", label: "Data e hora" },
        { key: "categoria", label: "Categoria" },
        { key: "legenda", label: "Descrição" },
        { key: "latitude", label: "Latitude" },
        { key: "longitude", label: "Longitude" },
        { key: "coordenada", label: "Coordenada" },
        { key: "confirmacoes", label: "Confirmações" },
        { key: "contestacoes", label: "Contestações" },
        { key: "situacao", label: "Situação" },
        { key: "veracidade", label: "Veracidade" },
        { key: "ficha", label: "Ficha" },
      ]),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="rotulo mb-3">Período</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="rotulo">de</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-line bg-elev px-3 py-2 text-sm outline-none focus-visible:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="rotulo">até</span>
            <input
              type="date"
              value={to}
              min={from}
              max={iso(new Date())}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-line bg-elev px-3 py-2 text-sm outline-none focus-visible:border-accent"
            />
          </label>
          <div className="flex gap-1.5">
            <Chip onClick={() => (setFrom(daysAgo(6)), setTo(iso(new Date())))}>7 dias</Chip>
            <Chip onClick={() => (setFrom(daysAgo(29)), setTo(iso(new Date())))}>30 dias</Chip>
            <Chip onClick={() => (setFrom(daysAgo(89)), setTo(iso(new Date())))}>90 dias</Chip>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {INCIDENT_KEYS.map((c) => (
            <Chip key={c} active={cats.has(c)} onClick={() => toggle(c)}>
              {CATEGORIES[c].label}
            </Chip>
          ))}
          {cats.size > 0 && <Chip onClick={() => setCats(new Set())}>limpar</Chip>}
        </div>
      </section>

      {summary && summary.retention_days === 0 && (
        <p className="rounded-xl border border-warn/40 bg-surface p-3 text-xs text-muted">
          A retenção de ocorrências está desligada nesta cidade. A lista abaixo traz só o que ainda está no ar: as fotos
          vencidas foram apagadas, como promete a página de privacidade. Ligar a guarda da evidência é decisão de
          convênio, e exige acertar antes os termos de uso.
        </p>
      )}

      {error && <EmptyState title="Não deu para carregar">{error}</EmptyState>}

      {loading && !log ? (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      ) : log ? (
        <section>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="rotulo">
              {fmt(log.total)} {log.total === 1 ? "ocorrência" : "ocorrências"}
              {log.total > log.events.length && ` · mostrando ${fmt(log.events.length)}`}
            </h2>
            <Button variant="secundario" onClick={exportCsv} disabled={!log.events.length}>
              Baixar CSV
            </Button>
          </div>
          {log.events.length === 0 ? (
            <EmptyState title="Nada no período">Mude as datas ou tire os filtros de categoria.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {log.events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
