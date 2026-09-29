"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { actionLabel, dateTime, type LogEntry } from "@/lib/admin/types";
import { Button, Chip, EmptyState, Spinner, cx } from "@/components/ui";

const PAGE = 100;

// Registro de acesso (Marco Civil, art. 15) e auditoria da moderação: do mais
// novo para o mais antigo. Filtra por ação e por conta (?user=).
function Registro() {
  const supabase = getSupabase();
  const router = useRouter();
  const params = useSearchParams();
  const user = params.get("user");
  const [action, setAction] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (before: number | null) => {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_logs", {
        p_action: action || null,
        p_user: user,
        p_before: before,
        p_limit: PAGE,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return null;
      }
      setError(null);
      setActions(data.actions);
      setMore(data.logs.length === PAGE);
      return data.logs as LogEntry[];
    },
    [supabase, action, user],
  );

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => fetchPage(null))
      .then((page) => alive && page && setLogs(page));
    return () => {
      alive = false;
    };
  }, [fetchPage]);

  async function loadMore() {
    const last = logs?.at(-1);
    if (!last) return;
    const page = await fetchPage(last.id);
    if (page) setLogs([...(logs ?? []), ...page]);
  }

  const shown = logs ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          aria-label="Filtrar por ação"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="">Todas as ações</option>
          <option value="admin_*">Toda a moderação</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
        {user && (
          <Chip active onClick={() => router.push("/admin/registro")}>
            Conta {user.slice(0, 8)}… ✕
          </Chip>
        )}
        {loading && <Spinner />}
      </div>
      <p className="text-xs text-muted">
        Guardado por 6 meses (Marco Civil, art. 15). Contas excluídas aparecem sem e-mail: o registro fica, o vínculo com a pessoa não.
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}
      {logs === null ? (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState title="Nada registrado com esse filtro" />
      ) : (
        <ul className={cx("flex flex-col divide-y divide-line transition-opacity", loading && "opacity-60")}>
          {shown.map((l) => (
            <li key={l.id} className="flex flex-col gap-0.5 py-2 text-sm sm:flex-row sm:items-baseline sm:gap-3">
              <span className="shrink-0 text-xs tabular-nums text-muted sm:w-36">{dateTime(l.created_at)}</span>
              <span className="min-w-0 flex-1">
                {l.user_id ? (
                  <Link href={`/admin/usuarios/${l.user_id}`} className="font-medium hover:text-accent">
                    {l.user_email ?? l.user_id.slice(0, 8)}
                  </Link>
                ) : (
                  <span className="text-muted">conta excluída</span>
                )}{" "}
                <span className={cx(l.action.startsWith("admin_") && "text-accent")}>{actionLabel(l.action)}</span>
                {l.target_user && (
                  <>
                    {" "}
                    <Link href={`/admin/usuarios/${l.target_user}`} className="font-medium hover:text-accent">
                      {l.target_email ?? l.target_user.slice(0, 8)}
                    </Link>
                  </>
                )}
                {l.post_id && <span className="rotulo ml-2">post {l.post_id.slice(0, 8)}</span>}
              </span>
              <span className="rotulo truncate sm:max-w-56" title={l.user_agent ?? undefined}>
                {l.ip ?? "sem IP"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {more && (
        <div className="flex justify-center">
          <Button variant="secundario" className="px-3 py-1.5 text-xs" disabled={loading} onClick={loadMore}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      }
    >
      <Registro />
    </Suspense>
  );
}
