"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES } from "@/lib/categories";
import { levelName } from "@/lib/progress";
import { download, toCsv, today } from "@/lib/admin/csv";
import { loadCosts } from "@/lib/admin/costs";
import { fmt, pct, plural, usd, type AwsCosts, type DayPoint, type Overview } from "@/lib/admin/types";
import { useAdmin } from "@/components/admin/context";
import Stat from "@/components/admin/Stat";
import Columns from "@/components/admin/Columns";
import Bars from "@/components/admin/Bars";
import { Button, Chip, EmptyState, Spinner, cx } from "@/components/ui";
import { CategoryIcon } from "@/components/ui/icons";

const PERIODS = [7, 30, 90] as const;
const SERIES: { key: keyof Omit<DayPoint, "day">; label: string; unit: string }[] = [
  { key: "active", label: "Contas ativas", unit: "contas" },
  { key: "posts", label: "Posts", unit: "posts" },
  { key: "signups", label: "Cadastros", unit: "cadastros" },
  { key: "votes", label: "Votos", unit: "votos" },
  { key: "requests", label: "Pedidos de foto", unit: "pedidos" },
];

const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-2xl border border-line bg-surface p-4", className)}>
      <h2 className="rotulo mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function VisaoGeral() {
  const supabase = getSupabase();
  const { counts } = useAdmin();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [series, setSeries] = useState<(typeof SERIES)[number]["key"]>("active");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costs, setCosts] = useState<AwsCosts | null>(null);

  // Resumo dos custos (a rota guarda a consulta por 6 h; sem permissão, some)
  useEffect(() => {
    loadCosts().then((r) => "data" in r && setCosts(r.data));
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_overview", { p_days: days });
      if (!alive) return;
      if (error) setError(error.message);
      else setData(data as Overview);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [supabase, days]);

  if (!data) {
    return error ? (
      <EmptyState title="Não deu para carregar as métricas">{error}</EmptyState>
    ) : (
      <div className="mt-16 flex justify-center">
        <Spinner />
      </div>
    );
  }

  const t = data.totals;
  const m = data.moderation;
  const s = SERIES.find((x) => x.key === series)!;
  const queue = counts ? counts.posts + counts.requests + counts.businesses : 0;

  function exportCsv() {
    download(
      `de-olho-metricas-${data!.days}d-${today()}.csv`,
      toCsv(data!.series, [
        { key: "day", label: "dia" },
        { key: "signups", label: "cadastros" },
        { key: "active", label: "contas ativas" },
        { key: "posts", label: "posts" },
        { key: "votes", label: "votos" },
        { key: "requests", label: "pedidos de foto" },
      ]),
    );
  }

  return (
    // Recarregando: mantém o quadro anterior, mais apagado, sem pular
    <div className={cx("flex flex-col gap-4 transition-opacity", loading && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Chip key={p} active={days === p} onClick={() => setDays(p)}>
            {p} dias
          </Chip>
        ))}
        {loading && <Spinner />}
        <Button variant="fantasma" className="ml-auto px-3 py-1.5 text-xs" onClick={exportCsv}>
          Exportar CSV
        </Button>
      </div>

      {queue > 0 && (
        <Link
          href="/admin/moderacao"
          className="flex items-center justify-between rounded-xl border border-accent bg-surface px-4 py-3 text-sm hover:bg-elev"
        >
          <span>
            <strong className="font-semibold">{queue}</strong> {queue === 1 ? "item espera" : "itens esperam"} a moderação
            {counts!.businesses > 0 && ` · ${counts!.businesses} estabelecimento${counts!.businesses > 1 ? "s" : ""} em análise`}
          </span>
          <span className="rotulo text-accent">revisar →</span>
        </Link>
      )}

      {costs && (
        <Link
          href="/admin/custos"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm hover:bg-elev"
        >
          <span>
            AWS neste mês: <strong className="font-semibold">{usd(costs.month_to_date)}</strong>
            {costs.forecast !== null && <span className="text-muted"> · previsão {usd(costs.forecast)}</span>}
            {costs.budget && costs.budget.limit > 0 && (
              <span className="text-muted"> · {Math.round((costs.month_to_date / costs.budget.limit) * 100)}% do orçamento</span>
            )}
          </span>
          <span className="rotulo text-accent">custos →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Usuários" value={fmt(t.users)} hint={`+${fmt(t.users_new_7d)} nos últimos 7 dias`} />
        <Stat
          label="Contas ativas"
          value={fmt(data.active.d7)}
          hint={`${fmt(data.active.d1)} hoje · ${fmt(data.active.d30)} em 30 dias`}
        />
        <Stat label="No ar agora" value={fmt(t.live_now)} hint={plural(t.requests_open, "pedido de foto aberto", "pedidos de foto abertos")} />
        <Stat label={`Posts em ${data.days} dias`} value={fmt(t.posts_period)} hint={`${fmt(t.posts_all)} desde o início`} />
        <Stat label={`Cadastros em ${data.days} dias`} value={fmt(t.users_new_period)} hint={`${fmt(t.no_terms)} sem aceitar os termos`} />
        <Stat
          label="Recusa automática"
          value={pct(m.auto_rejected, m.finalized)}
          hint={`${fmt(m.auto_rejected)} de ${plural(m.finalized, "foto", "fotos")}`}
          tone={m.finalized && m.auto_rejected / m.finalized > 0.1 ? "warn" : undefined}
        />
        <Stat
          label="Denúncias"
          value={fmt(m.post_reports + m.request_reports)}
          hint={`${plural(m.hidden_by_admin, "escondido", "escondidos")} · ${plural(m.bans, "banimento", "banimentos")}`}
          tone={m.post_reports + m.request_reports > 0 ? "danger" : undefined}
        />
        <Stat
          label="Pedidos respondidos"
          value={pct(data.requests.answered, data.requests.total)}
          hint={`${fmt(data.requests.answered)} de ${plural(data.requests.total, "pedido", "pedidos")}`}
        />
      </div>

      <Card title={`${s.label} por dia`}>
        <div className="mb-4 flex flex-wrap gap-2">
          {SERIES.map((x) => (
            <Chip key={x.key} active={series === x.key} onClick={() => setSeries(x.key)}>
              {x.label}
            </Chip>
          ))}
        </div>
        <Columns
          unit={s.unit}
          columns={data.series.map((d) => ({
            key: d.day,
            tick: dayFmt.format(new Date(d.day)),
            tip: weekday.format(new Date(d.day)),
            value: d[series],
          }))}
        />
        {series === "active" && (
          <p className="mt-3 text-xs text-muted">
            Conta ativa é a que fez algo: postou, votou, pediu foto ou denunciou. Quem só abre o mapa não fica registrado.
          </p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Posts por categoria · ${data.days} dias`}>
          <Bars
            bars={data.by_category.map((c) => ({
              key: c.category,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <CategoryIcon category={c.category} /> {CATEGORIES[c.category]?.label ?? c.category}
                </span>
              ),
              value: c.n,
            }))}
          />
        </Card>
        <Card title={`Posts por hora do dia · ${data.days} dias`}>
          <Columns
            unit="posts"
            height={120}
            columns={data.by_hour.map((n, h) => ({ key: String(h), tick: `${h}h`, tip: `das ${h}h às ${h + 1}h`, value: n }))}
          />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`Engajamento · posts de ${data.days} dias`}>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["Visualizações", data.engagement.views],
              ["Compartilhamentos", data.engagement.shares],
              ["Ainda está rolando", data.engagement.confirms],
              ["Já acabou", data.engagement.denies],
            ].map(([label, n]) => (
              <div key={label as string}>
                <dt className="rotulo">{label}</dt>
                <dd className="font-display text-xl font-semibold">{fmt(n as number)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted">
            {fmt(t.in_history)} no histórico · {plural(t.push, "inscrição de alerta", "inscrições de alerta")} ·{" "}
            {plural(t.businesses.approved ?? 0, "estabelecimento aprovado", "estabelecimentos aprovados")} · {fmt(t.admins)} na moderação ·{" "}
            {plural(t.banned, "banido", "banidos")}
          </p>
        </Card>
        <Card title="Quem mais ajuda (XP)">
          {data.top.length === 0 ? (
            <p className="text-sm text-muted">Ninguém ganhou XP ainda.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {data.top.map((u, i) => (
                <li key={u.id}>
                  <Link href={`/admin/usuarios/${u.id}`} className="flex items-center gap-3 text-sm hover:text-accent">
                    <span className="rotulo w-4">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{u.nickname ? `@${u.nickname}` : u.email}</span>
                    <span className="rotulo">{levelName(u.level)}</span>
                    <span className="w-16 text-right text-xs tabular-nums text-muted">{fmt(u.xp)} XP</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
