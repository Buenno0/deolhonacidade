"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { AgencySummary } from "@/lib/agency/types";
import { AgencyContext } from "@/components/agency/context";
import Mark from "@/components/ui/Mark";
import { EmptyState, Spinner, cx } from "@/components/ui";

const TABS = [
  { href: "/defesa-civil", label: "Agora" },
  { href: "/defesa-civil/registro", label: "Registro" },
  { href: "/defesa-civil/recorrencia", label: "Recorrência" },
];

// O painel do órgão conveniado. Porta separada da moderação de propósito: o
// agente não vê conta, e-mail, custo nem fila. O banco confere de novo em
// cada função (require_agent), e cada ficha aberta fica no registro.
export default function AgencyLayout({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const pathname = usePathname();
  const [state, setState] = useState<"carregando" | "sem-login" | "negado" | "ok">("carregando");
  const [summary, setSummary] = useState<AgencySummary | null>(null);
  const [motivo, setMotivo] = useState("");

  // A ficha em PDF é página inteira, sem a casca do painel
  const bare = pathname.startsWith("/defesa-civil/evento/");

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return setState("sem-login");
      const { data, error } = await supabase.rpc("agency_summary", { p_days: 30 });
      if (error) {
        setMotivo(error.message);
        return setState("negado");
      }
      setSummary(data as AgencySummary);
      setState("ok");
    })();
  }, [supabase]);

  if (bare) return <AgencyContext.Provider value={{ summary }}>{children}</AgencyContext.Provider>;

  const isActive = (href: string) =>
    href === "/defesa-civil" ? pathname === "/defesa-civil" : pathname.startsWith(href);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <header className="flex items-center gap-3">
        <Mark size={36} className="shrink-0" />
        <div className="flex-1">
          <p className="rotulo">sala de situação</p>
          <h1 className="font-display text-2xl font-bold">
            {summary ? `${summary.city.name}/${summary.city.uf}` : "Viu na Cidade"}
          </h1>
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
          <EmptyState
            title="Entre para acessar a sala de situação"
            action={
              <Link href="/mapa" className="text-accent underline">
                Ir ao mapa e entrar
              </Link>
            }
          />
        </div>
      )}
      {state === "negado" && (
        <div className="mt-10">
          <EmptyState title="Acesso restrito aos órgãos conveniados">{motivo}</EmptyState>
        </div>
      )}

      {state === "ok" && summary && (
        <AgencyContext.Provider value={{ summary }}>
          <nav
            className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] shadow-[inset_0_-1px_0_var(--line)] sm:mx-0 sm:px-0"
            aria-label="Seções da sala de situação"
          >
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
                    {t.href === "/defesa-civil" && summary.live_now > 0 && (
                      <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5 text-accent-ink tabular-nums">
                        {summary.live_now}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6">{children}</div>
          <p className="mt-10 text-xs text-muted">
            {summary.agency} · as fotos saem com rosto e placa desfocados.{" "}
            {summary.retention_days > 0
              ? `Ocorrências ficam ${summary.retention_days} dias no registro do município.`
              : "O registro de ocorrências está desligado nesta cidade: só aparece aqui o que ainda está no ar."}
          </p>
        </AgencyContext.Provider>
      )}
    </main>
  );
}
