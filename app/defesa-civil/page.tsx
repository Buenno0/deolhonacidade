"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import { ago, coord, fmt, hour, type AgencyLive, type AgencyEvent } from "@/lib/agency/types";
import { useAgency } from "@/components/agency/context";
import SituationMap, { eventSpot } from "@/components/agency/SituationMap";
import EventCard from "@/components/agency/EventCard";
import Stat from "@/components/admin/Stat";
import { Button, Chip, EmptyState, Spinner } from "@/components/ui";

const REFRESH_MS = 60_000;

// Agora: o que está no ar neste minuto, só ocorrência. É a tela que fica
// aberta num monitor da sala durante a chuva.
export default function Agora() {
  const supabase = getSupabase();
  const { summary } = useAgency();
  const [live, setLive] = useState<AgencyLive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [pick, setPick] = useState<[number, number] | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const askBox = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    supabase.rpc("agency_live").then(({ data, error }) => {
      if (error) setError(error.message);
      else setLive(data as AgencyLive);
    });
  }, [supabase]);

  useEffect(() => {
    // fora do corpo do efeito: o setState entra pela promessa, não na render
    Promise.resolve().then(load);
    const id = setInterval(load, REFRESH_MS);
    // Voltar para a aba traz o estado atual na hora, sem esperar o intervalo
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [load]);

  const events = useMemo(
    () => (live?.features ?? []).filter((e) => cats.size === 0 || cats.has(e.category)),
    [live, cats],
  );
  const spots = useMemo(() => events.map(eventSpot), [events]);

  // Quais categorias estão no ar agora: o filtro só mostra o que existe
  const present = useMemo(() => {
    const n = new Map<string, number>();
    for (const e of live?.features ?? []) n.set(e.category, (n.get(e.category) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]);
  }, [live]);

  function toggle(c: string) {
    setCats((s) => {
      const next = new Set(s);
      if (!next.delete(c)) next.add(c);
      return next;
    });
  }

  async function ask() {
    if (!pick || question.trim().length < 3) return;
    setAsking(true);
    const { error } = await supabase.rpc("agency_ask", {
      p_lat: pick[1],
      p_lng: pick[0],
      p_question: question.trim(),
    });
    setAsking(false);
    if (error) return setError(error.message);
    setPick(null);
    setQuestion("");
    load();
  }

  if (error && !live) return <EmptyState title="Não deu para carregar">{error}</EmptyState>;
  if (!live || !summary)
    return (
      <div className="mt-16 flex justify-center">
        <Spinner />
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="no ar agora"
          value={fmt(live.features.length)}
          hint="ocorrências com foto"
          tone={live.features.length ? "warn" : undefined}
        />
        <Stat label="últimos 30 dias" value={fmt(summary.total)} hint="ocorrências registradas" />
        <Stat
          label="confirmadas"
          value={summary.total ? `${Math.round((summary.confirmed / summary.total) * 100)}%` : "—"}
          hint="alguém perto confirmou"
        />
        <Stat label="pedidos abertos" value={fmt(live.requests.length)} hint="esperando foto" />
      </section>

      {present.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {present.map(([c, n]) => (
            <Chip key={c} active={cats.has(c)} onClick={() => toggle(c)}>
              {CATEGORIES[c as keyof typeof CATEGORIES]?.label ?? c} <span className="tabular-nums">{n}</span>
            </Chip>
          ))}
          {cats.size > 0 && (
            <Chip onClick={() => setCats(new Set())}>limpar</Chip>
          )}
        </div>
      )}

      <SituationMap
        spots={spots}
        activeId={active}
        onSelect={setActive}
        onPick={(lng, lat) => {
          setPick([lng, lat]);
          setTimeout(() => askBox.current?.focus(), 0);
        }}
      />

      {pick ? (
        <section className="rounded-2xl border border-accent bg-surface p-4">
          <h2 className="rotulo mb-1">Pedir olhos neste ponto</h2>
          <p className="mb-3 text-xs text-muted">
            Quem estiver a até 1 km de <span className="font-mono">{coord(pick[1], pick[0])}</span> recebe o pedido e pode
            responder com uma foto. O pedido fica aberto por 2 horas.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={askBox}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              maxLength={140}
              placeholder="A água já baixou na ponte?"
              className="flex-1 rounded-lg border border-line bg-elev px-3 py-2 text-sm outline-none focus-visible:border-accent"
            />
            <div className="flex gap-2">
              <Button onClick={ask} disabled={asking || question.trim().length < 3}>
                {asking ? "Enviando…" : "Pedir"}
              </Button>
              <Button variant="fantasma" onClick={() => setPick(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <p className="text-xs text-muted">Toque num ponto do mapa para pedir uma foto de lá.</p>
      )}

      {live.requests.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="rotulo mb-2">Pedidos abertos</h2>
          <ul className="flex flex-col gap-2">
            {live.requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 border-t border-line pt-2 text-sm first:border-0 first:pt-0">
                <span className="flex-1">{r.question}</span>
                <span className="text-xs text-muted">
                  {ago(r.created_at)} · fecha {hour(r.expires_at)} ·{" "}
                  {r.answer_count ? `${fmt(r.answer_count)} resposta${r.answer_count > 1 ? "s" : ""}` : "sem resposta"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="rotulo mb-2">
          {events.length === live.features.length
            ? `${fmt(events.length)} no ar`
            : `${fmt(events.length)} de ${fmt(live.features.length)}`}
        </h2>
        {events.length === 0 ? (
          <EmptyState title="Nada no ar agora">
            Quando alguém publicar alagamento, acidente, falta de energia, obra, trânsito ou segurança, aparece aqui na hora.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((e: AgencyEvent) => (
              <EventCard key={e.id} event={e} active={e.id === active} onSelect={setActive} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
