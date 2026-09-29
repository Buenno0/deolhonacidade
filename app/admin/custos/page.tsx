"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { loadCosts } from "@/lib/admin/costs";
import { SERVICE_LABEL, dateTime, plural, usd, type AwsCosts, type Overview } from "@/lib/admin/types";
import Stat from "@/components/admin/Stat";
import Columns from "@/components/admin/Columns";
import Bars from "@/components/admin/Bars";
import { EmptyState, Spinner, cx } from "@/components/ui";

const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });

// Custos da AWS (Cost Explorer), cruzados com o uso do app para dar o custo
// por post. Os números da AWS chegam com até 24 h de atraso.
export default function Custos() {
  const supabase = getSupabase();
  const [costs, setCosts] = useState<AwsCosts | null>(null);
  const [posts30, setPosts30] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCosts().then((r) => ("error" in r ? setError(r.error) : setCosts(r.data)));
    supabase.rpc("admin_overview", { p_days: 30 }).then(({ data }) => data && setPosts30((data as Overview).totals.posts_period));
  }, [supabase]);

  if (error) return <EmptyState title="Custos indisponíveis">{error}</EmptyState>;
  if (!costs)
    return (
      <div className="mt-16 flex justify-center">
        <Spinner />
      </div>
    );

  const limit = costs.budget?.limit ?? null;
  const used = limit ? costs.month_to_date / limit : null;
  const projected = limit && costs.forecast !== null ? costs.forecast / limit : null;
  const total30 = costs.daily.reduce((s, d) => s + d.total, 0);
  const perPost = posts30 ? total30 / posts30 : null;
  const month = monthName.format(new Date(`${costs.month}-01T00:00:00Z`));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={`Gasto em ${month}`} value={usd(costs.month_to_date)} hint="até ontem" />
        <Stat
          label="Previsão do mês"
          value={costs.forecast === null ? "—" : usd(costs.forecast)}
          hint={costs.forecast === null ? "a AWS ainda não tem histórico" : "pela tendência da AWS"}
          tone={projected !== null && projected > 1 ? "danger" : projected !== null && projected > 0.8 ? "warn" : undefined}
        />
        <Stat label="Mês passado" value={usd(costs.last_month)} />
        <Stat
          label="Custo por post"
          value={perPost === null ? "—" : usd(perPost)}
          hint={posts30 === null ? "carregando…" : `${usd(total30)} ÷ ${plural(posts30, "post", "posts")} em 30 dias`}
        />
      </div>

      {limit !== null && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="rotulo">Orçamento {costs.budget!.name}</h2>
            <p className="text-sm">
              <span className="font-semibold">{usd(costs.month_to_date)}</span> <span className="text-muted">de {usd(limit)}</span>
              {used !== null && <span className="rotulo ml-2">{Math.round(used * 100)}%</span>}
            </p>
          </div>
          {/* A barra: gasto até agora e, mais clara, até onde a previsão leva */}
          <div className="relative h-3 overflow-hidden rounded-full bg-elev" role="img" aria-label={`${Math.round((used ?? 0) * 100)}% do orçamento usado`}>
            {projected !== null && (
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent opacity-30" style={{ width: `${Math.min(1, projected) * 100}%` }} />
            )}
            <div
              className={cx("absolute inset-y-0 left-0 rounded-full", (used ?? 0) > 1 ? "bg-danger" : "bg-accent")}
              style={{ width: `${Math.min(1, used ?? 0) * 100}%` }}
            />
          </div>
          {projected !== null && (
            <p className="mt-2 text-xs text-muted">
              A previsão chega a {Math.round(projected * 100)}% do limite. A AWS avisa por e-mail em 50% gasto e em 100% previsto.
            </p>
          )}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="rotulo mb-4">Por serviço · {month}</h2>
          <Bars
            empty="Nenhum gasto neste mês ainda"
            format={usd}
            bars={costs.by_service.map((s) => ({ key: s.service, label: SERVICE_LABEL[s.service] ?? s.service, value: s.amount }))}
          />
        </section>
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="rotulo mb-4">Por dia · 30 dias</h2>
          <Columns
            unit="no dia"
            height={140}
            format={usd}
            columns={costs.daily.map((d) => ({
              key: d.day,
              tick: dayFmt.format(new Date(d.day)),
              tip: weekday.format(new Date(d.day)),
              value: d.total,
            }))}
          />
        </section>
      </div>

      <p className="text-xs text-muted">
        Fonte: AWS Cost Explorer, em dólar e sem impostos, atualizada até três vezes por dia e com até 24 h de atraso. O painel guarda a
        consulta por 6 h, porque cada consulta custa US$ 0,01. Entra tudo com a tag projeto=deolhonacidade, mais Rekognition e SES da
        conta inteira, que só o De Olho usa. Vercel e Supabase não entram. Consultado em {dateTime(costs.fetched_at)}.
      </p>
    </div>
  );
}
