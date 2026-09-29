"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { BUSINESS_STATUS } from "@/lib/business";
import { CATEGORIES } from "@/lib/categories";
import { photoUrl, thumbUrl } from "@/lib/media";
import { BADGES, TIER_NAMES, levelName, type BadgeId } from "@/lib/progress";
import { PROVIDER_LABEL, actionLabel, dateOnly, dateTime, fmt, plural, type AdminUserDetail } from "@/lib/admin/types";
import { useAdmin } from "@/components/admin/context";
import Stat from "@/components/admin/Stat";
import Medal from "@/components/Medal";
import { Button, EmptyState, Spinner, cx } from "@/components/ui";
import { CategoryIcon } from "@/components/ui/icons";

const POST_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "pendente", tone: "text-muted" },
  published: { label: "no ar", tone: "text-ok" },
  hidden: { label: "escondido", tone: "text-danger" },
  expired: { label: "vencido", tone: "text-muted" },
  open: { label: "aberto", tone: "text-ok" },
};

// A ficha liga a conta aos posts. Abrir já fica no registro (admin_view_user).
export default function Ficha() {
  const { id } = useParams<{ id: string }>();
  const supabase = getSupabase();
  const { me } = useAdmin();
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_user", { p_id: id });
    if (error) setError(error.message);
    else setData(data as AdminUserDetail);
  }, [supabase, id]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function act(fn: string, args: Record<string, unknown>, question: string) {
    if (!confirm(question)) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc(fn, args);
    if (error) setError(error.message);
    await load();
    setBusy(false);
  }

  if (!data) {
    return error ? (
      <EmptyState title="Não deu para abrir a ficha" action={<Link href="/admin/usuarios" className="text-accent underline">Voltar aos usuários</Link>}>
        {error}
      </EmptyState>
    ) : (
      <div className="mt-16 flex justify-center">
        <Spinner />
      </div>
    );
  }

  const u = data.user;
  const self = u.id === me;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/usuarios" className="rotulo text-accent">
        ← usuários
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="font-display text-xl font-semibold break-all">{u.email ?? "(sem e-mail)"}</h2>
          {u.is_admin && <span className="rotulo text-accent">moderação</span>}
          {u.banned_at && <span className="rotulo text-danger">banido em {dateOnly(u.banned_at)}</span>}
          {self && <span className="rotulo">você</span>}
        </div>
        <p className="rotulo flex flex-wrap gap-x-3">
          <span>login: {PROVIDER_LABEL[u.provider] ?? u.provider}</span>
          <span>cadastro {dateTime(u.created_at)}</span>
          <span>último acesso {dateTime(u.last_sign_in_at)}</span>
          <span>termos {u.accepted_terms_at ? dateOnly(u.accepted_terms_at) : "não aceitos"}</span>
          {u.nickname && <span>@{u.nickname}{u.show_nickname ? " (público)" : " (oculto)"}</span>}
        </p>
        <p className="rotulo select-all">id {u.id}</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="mt-1 flex flex-wrap gap-2">
          {!self && (
            <Button
              variant="perigo"
              className="px-3 py-1.5 text-xs"
              disabled={busy}
              onClick={() =>
                act(
                  "admin_ban_user",
                  { p_user_id: u.id, p_ban: !u.banned_at },
                  u.banned_at ? "Desbanir a conta? O que foi escondido não volta." : "Banir a conta? Tudo o que ela tem no ar sai do mapa.",
                )
              }
            >
              {u.banned_at ? "Desbanir" : "Banir"}
            </Button>
          )}
          {!(self && u.is_admin) && (
            <Button
              variant="secundario"
              className="px-3 py-1.5 text-xs"
              disabled={busy}
              onClick={() =>
                act(
                  "admin_set_admin",
                  { p_user_id: u.id, p_admin: !u.is_admin },
                  u.is_admin ? "Tirar a moderação desta conta?" : "Dar acesso à moderação e ao painel para esta conta?",
                )
              }
            >
              {u.is_admin ? "Tirar moderação" : "Dar moderação"}
            </Button>
          )}
          <Link href={`/admin/registro?user=${u.id}`} className="inline-flex items-center px-3 py-1.5 text-xs text-accent hover:underline">
            Ver todo o registro
          </Link>
          {busy && <Spinner />}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Posts" value={fmt(u.posts)} hint={plural(u.requests, "pedido de foto", "pedidos de foto")} />
        <Stat label="XP" value={fmt(u.xp)} hint={`${levelName(u.level)} · sequência de ${plural(u.streak_days, "dia", "dias")}`} />
        <Stat label="Votos dados" value={fmt(u.votes)} hint={plural(u.reports_made, "denúncia feita", "denúncias feitas")} />
        <Stat
          label="Denúncias recebidas"
          value={fmt(u.reports_received)}
          hint={plural(u.push, "alerta ativo", "alertas ativos")}
          tone={u.reports_received > 0 ? "danger" : undefined}
        />
      </div>

      {data.business && (
        <section className="rounded-xl border border-line bg-surface p-3">
          <p className="rotulo mb-1">Estabelecimento</p>
          <p className="text-sm">
            <CategoryIcon category="estabelecimento" /> {data.business.name}{" "}
            <span className={cx("rotulo", BUSINESS_STATUS[data.business.status].tone)}>{BUSINESS_STATUS[data.business.status].label}</span>
          </p>
          <p className="text-xs text-muted">{data.business.address}</p>
        </section>
      )}

      {data.badges.length > 0 && (
        <section>
          <h3 className="rotulo mb-3">Conquistas · {data.badges.length}</h3>
          <ul className="flex flex-wrap gap-4">
            {data.badges.map((b) => {
              const def = BADGES[b.badge as BadgeId];
              return (
                <li key={`${b.badge}-${b.tier}`} className="flex w-20 flex-col items-center gap-1 text-center" title={def?.tiers[b.tier - 1]}>
                  <Medal icon={def?.icon} tier={def?.first ? 3 : b.tier} size={44} />
                  <span className="text-xs leading-tight">{def?.name ?? b.badge}</span>
                  {!def?.first && <span className="rotulo">{TIER_NAMES[b.tier - 1]}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h3 className="rotulo mb-3">Posts · {data.posts.length === 60 ? "os 60 mais recentes" : data.posts.length}</h3>
        {data.posts.length === 0 ? (
          <EmptyState title="Nenhum post" />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data.posts.map((p) => {
              const alive = new Date(p.expires_at).getTime() > now;
              const st = POST_STATUS[p.status === "published" && !alive ? "expired" : p.status];
              return (
                <li key={p.id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
                  {p.photo_path ? (
                    <a href={photoUrl(p.photo_path)} target="_blank" rel="noreferrer" className="aspect-square bg-elev">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumbUrl(p.photo_path)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </a>
                  ) : (
                    <div className="rotulo grid aspect-square place-items-center bg-elev">foto apagada</div>
                  )}
                  <div className="flex flex-col gap-1 p-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium">
                      <CategoryIcon category={p.category} /> {CATEGORIES[p.category]?.label}
                    </span>
                    {p.caption && <p className="line-clamp-2 text-xs">{p.caption}</p>}
                    <p className="rotulo flex flex-wrap gap-x-2">
                      <span className={st.tone}>{st.label}</span>
                      <span>{dateOnly(p.created_at)}</span>
                      {p.auto_rejected && <span className="text-danger">recusado</span>}
                      {p.archived_until && new Date(p.archived_until).getTime() > now && <span>histórico</span>}
                    </p>
                    <p className="rotulo flex flex-wrap gap-x-2">
                      <span>{p.view_count} views</span>
                      <span>{p.confirm_count}✓</span>
                      <span>{p.deny_count}✗</span>
                      {p.report_count > 0 && <span className="text-danger">{p.report_count} denúncias</span>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {data.requests.length > 0 && (
        <section>
          <h3 className="rotulo mb-3">Pedidos de foto · {data.requests.length}</h3>
          <ul className="flex flex-col gap-2">
            {data.requests.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-surface p-3">
                <p className="text-sm">{r.question}</p>
                <p className="rotulo mt-1 flex flex-wrap gap-x-3">
                  <span className={POST_STATUS[r.status]?.tone}>{POST_STATUS[r.status]?.label ?? r.status}</span>
                  <span>{dateTime(r.created_at)}</span>
                  <span>{r.answer_count} respostas</span>
                  {r.report_count > 0 && <span className="text-danger">{r.report_count} denúncias</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="rotulo mb-3">Últimas ações</h3>
        {data.logs.length === 0 ? (
          <p className="text-sm text-muted">Nada registrado.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line text-sm">
            {data.logs.map((l) => (
              <li key={l.id} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
                <span className="w-36 shrink-0 text-xs tabular-nums text-muted">{dateTime(l.created_at)}</span>
                <span className="flex-1">
                  {l.user_id === u.id ? (
                    <>
                      {actionLabel(l.action)}
                      {l.target_user && <> {l.target_user === u.id ? "esta conta" : (l.target_email ?? l.target_user.slice(0, 8))}</>}
                    </>
                  ) : (
                    <span className="text-muted">
                      {l.user_email ?? "a moderação"} {actionLabel(l.action)} esta conta
                    </span>
                  )}
                </span>
                {l.ip && <span className="rotulo">{l.ip}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
