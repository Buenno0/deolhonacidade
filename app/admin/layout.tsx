"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Counts } from "@/lib/admin/types";
import { AdminContext } from "@/components/admin/context";
import Mark from "@/components/ui/Mark";
import { EmptyState, Spinner, cx } from "@/components/ui";

const TABS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/moderacao", label: "Moderação" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/registro", label: "Registro" },
  { href: "/admin/custos", label: "Custos" },
  { href: "/admin/cidades", label: "Cidades" },
];

// O painel só abre para contas com profiles.is_admin. Aqui é só a porta: o
// banco confere de novo em cada função (require_admin).
export default function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const pathname = usePathname();
  const [state, setState] = useState<"carregando" | "sem-login" | "negado" | "ok">("carregando");
  const [me, setMe] = useState("");
  const [counts, setCounts] = useState<Counts | null>(null);

  const refreshCounts = useCallback(() => {
    supabase.rpc("admin_counts").then(({ data }) => data && setCounts(data as Counts));
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return setState("sem-login");
      const { data, error } = await supabase.rpc("admin_counts");
      if (error) return setState("negado");
      setMe(session.session.user.id);
      setCounts(data as Counts);
      setState("ok");
    })();
  }, [supabase]);

  const queue = counts ? counts.posts + counts.requests + counts.businesses : 0;
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <header className="flex items-center gap-3">
        <Mark size={36} className="shrink-0" />
        <div className="flex-1">
          <p className="rotulo">painel</p>
          <h1 className="font-display text-2xl font-bold">Viu na Cidade</h1>
        </div>
        <Link href="/mapa" className="rotulo text-accent">
          ← mapa
        </Link>
      </header>

      {state === "carregando" && (
        <div className="mt-16 flex justify-center">
          <Spinner />
        </div>
      )}
      {state === "sem-login" && (
        <div className="mt-10">
          <EmptyState title="Entre para acessar o painel" action={<Link href="/mapa" className="text-accent underline">Ir ao mapa e entrar</Link>} />
        </div>
      )}
      {state === "negado" && (
        <div className="mt-10">
          <EmptyState title="Acesso restrito">Esta conta não faz parte da moderação.</EmptyState>
        </div>
      )}

      {state === "ok" && (
        <AdminContext.Provider value={{ me, counts, refreshCounts }}>
          <nav className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] shadow-[inset_0_-1px_0_var(--line)] sm:mx-0 sm:px-0" aria-label="Seções do painel">
            <ul className="flex gap-1">
              {TABS.map((t) => (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={isActive(t.href) ? "page" : undefined}
                    className={cx(
                      "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition",
                      isActive(t.href) ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink",
                    )}
                  >
                    {t.label}
                    {t.href === "/admin/moderacao" && queue > 0 && (
                      <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5 text-accent-ink tabular-nums">{queue}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6">{children}</div>
        </AdminContext.Provider>
      )}
    </main>
  );
}
