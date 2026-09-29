"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { fmt } from "@/lib/admin/types";
import Bars from "@/components/admin/Bars";
import { EmptyState, Spinner } from "@/components/ui";

// "Quero o De Olho na minha cidade": quem abriu o app fora de Itapetininga e
// pediu. Só a célula de ~10 km (0,1°), nunca o ponto exato.
export default function Cidades() {
  const supabase = getSupabase();
  const [cells, setCells] = useState<{ cell: string; n: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc("admin_city_interest").then(({ data, error }) => {
      if (error) setError(error.message);
      else setCells(data);
    });
  }, [supabase]);

  if (error) return <EmptyState title="Não deu para carregar">{error}</EmptyState>;
  if (!cells)
    return (
      <div className="mt-16 flex justify-center">
        <Spinner />
      </div>
    );

  const total = cells.reduce((s, c) => s + c.n, 0);

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="rotulo mb-1">Interesse de outras cidades · {fmt(total)} pedidos</h2>
      <p className="mb-4 text-xs text-muted">
        Cada linha é uma área de ~10 km. Um pedido por aparelho e área. Toque para ver no mapa e decidir a próxima cidade.
      </p>
      {cells.length === 0 ? (
        <EmptyState title="Ninguém pediu ainda">Os pedidos aparecem quando alguém abre o app fora da área atendida.</EmptyState>
      ) : (
        <Bars
          bars={cells.map((c) => ({
            key: c.cell,
            label: <span className="font-mono text-xs">{c.cell.replace(",", ", ")}</span>,
            value: c.n,
            href: `https://www.google.com/maps/@${c.cell},11z`,
          }))}
        />
      )}
    </section>
  );
}
