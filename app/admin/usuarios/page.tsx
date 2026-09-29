"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { BUSINESS_STATUS } from "@/lib/business";
import { levelName } from "@/lib/progress";
import { download, toCsv, today } from "@/lib/admin/csv";
import { PROVIDER_LABEL, dateOnly, dateTime, fmt, type AdminUserRow } from "@/lib/admin/types";
import { Button, Chip, EmptyState, Spinner, cx } from "@/components/ui";

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "novos", label: "Novos (7 dias)" },
  { key: "banidos", label: "Banidos" },
  { key: "admins", label: "Moderação" },
  { key: "estabelecimento", label: "Estabelecimentos" },
  { key: "sem_termos", label: "Sem termos" },
];
const SORTS = [
  { key: "recentes", label: "Mais recentes" },
  { key: "acesso", label: "Último acesso" },
  { key: "xp", label: "XP" },
  { key: "posts", label: "Posts" },
];
const PAGE = 50;

function Tags({ u }: { u: AdminUserRow }) {
  return (
    <>
      {u.is_admin && <span className="rotulo text-accent">moderação</span>}
      {u.banned_at && <span className="rotulo text-danger">banido</span>}
      {u.business_status && <span className={cx("rotulo", BUSINESS_STATUS[u.business_status].tone)}>loja {BUSINESS_STATUS[u.business_status].label}</span>}
      {!u.accepted_terms_at && <span className="rotulo">sem termos</span>}
    </>
  );
}

export default function Usuarios() {
  const supabase = getSupabase();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todos");
  const [sort, setSort] = useState("recentes");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Espera a pessoa parar de digitar
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_users", {
        p_search: query || null,
        p_filter: filter,
        p_sort: sort,
        p_limit: PAGE,
        p_offset: page * PAGE,
      });
      if (!alive) return;
      if (error) setError(error.message);
      else {
        setError(null);
        setRows(data.users);
        setTotal(data.total);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [supabase, query, filter, sort, page]);

  async function exportCsv() {
    setExporting(true);
    const { data, error } = await supabase.rpc("admin_export_users");
    setExporting(false);
    if (error) return setError(error.message);
    const list = (data as AdminUserRow[]).map((u) => ({
      ...u,
      provider: PROVIDER_LABEL[u.provider] ?? u.provider,
      banned: Boolean(u.banned_at),
    }));
    download(
      `de-olho-usuarios-${today()}.csv`,
      toCsv(list, [
        { key: "id", label: "id" },
        { key: "email", label: "e-mail" },
        { key: "provider", label: "login" },
        { key: "created_at", label: "cadastro" },
        { key: "last_sign_in_at", label: "último acesso" },
        { key: "nickname", label: "apelido" },
        { key: "xp", label: "xp" },
        { key: "level", label: "nível" },
        { key: "posts", label: "posts" },
        { key: "requests", label: "pedidos de foto" },
        { key: "reports_received", label: "denúncias recebidas" },
        { key: "is_admin", label: "moderação" },
        { key: "banned", label: "banido" },
        { key: "business_status", label: "estabelecimento" },
      ]),
    );
  }

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por e-mail, apelido ou id"
          aria-label="Buscar usuários"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <Button variant="secundario" className="px-3 py-2 text-xs" disabled={exporting} onClick={exportCsv}>
          {exporting ? <Spinner /> : null} Exportar CSV
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            active={filter === f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(0);
            }}
          >
            {f.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rotulo">ordenar</span>
        {SORTS.map((s) => (
          <Chip
            key={s.key}
            active={sort === s.key}
            onClick={() => {
              setSort(s.key);
              setPage(0);
            }}
          >
            {s.label}
          </Chip>
        ))}
        <span className="rotulo ml-auto">
          {fmt(total)} {total === 1 ? "conta" : "contas"}
        </span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {rows === null ? (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhuma conta encontrada" />
      ) : (
        <div className={cx("transition-opacity", loading && "opacity-60")}>
          {/* Desktop: tabela */}
          <table className="hidden w-full text-sm md:table">
            <thead>
              <tr className="rotulo text-left">
                <th className="pb-2 font-medium">Conta</th>
                <th className="pb-2 font-medium">Login</th>
                <th className="pb-2 font-medium">Cadastro</th>
                <th className="pb-2 font-medium">Último acesso</th>
                <th className="pb-2 text-right font-medium">Posts</th>
                <th className="pb-2 text-right font-medium">XP</th>
                <th className="pb-2 text-right font-medium">Denúncias</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-line hover:bg-surface">
                  <td className="py-2 pr-3">
                    <Link href={`/admin/usuarios/${u.id}`} className="block hover:text-accent">
                      <span className="block truncate font-medium">{u.email ?? "—"}</span>
                      <span className="flex flex-wrap gap-x-2">
                        {u.nickname && <span className="text-xs text-muted">@{u.nickname}</span>}
                        <Tags u={u} />
                      </span>
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-muted">{PROVIDER_LABEL[u.provider] ?? u.provider}</td>
                  <td className="py-2 pr-3 tabular-nums text-muted">{dateOnly(u.created_at)}</td>
                  <td className="py-2 pr-3 tabular-nums text-muted">{dateTime(u.last_sign_in_at)}</td>
                  <td className="py-2 text-right tabular-nums">{fmt(u.posts)}</td>
                  <td className="py-2 text-right tabular-nums" title={levelName(u.level)}>
                    {fmt(u.xp)}
                  </td>
                  <td className={cx("py-2 text-right tabular-nums", u.reports_received > 0 && "text-danger")}>{fmt(u.reports_received)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Celular: cartões */}
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/usuarios/${u.id}`} className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3">
                  <span className="truncate text-sm font-medium">{u.email ?? "—"}</span>
                  <span className="flex flex-wrap gap-x-2">
                    {u.nickname && <span className="text-xs text-muted">@{u.nickname}</span>}
                    <Tags u={u} />
                  </span>
                  <span className="rotulo flex flex-wrap gap-x-3">
                    <span>{PROVIDER_LABEL[u.provider] ?? u.provider}</span>
                    <span>desde {dateOnly(u.created_at)}</span>
                    <span>{fmt(u.posts)} posts</span>
                    <span>{fmt(u.xp)} XP</span>
                    {u.reports_received > 0 && <span className="text-danger">{fmt(u.reports_received)} denúncias</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="secundario" className="px-3 py-1.5 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>
                ← anterior
              </Button>
              <span className="rotulo">
                {page + 1} de {pages}
              </span>
              <Button variant="secundario" className="px-3 py-1.5 text-xs" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
                próxima →
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
