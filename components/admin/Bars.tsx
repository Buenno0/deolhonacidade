import type { ReactNode } from "react";
import { fmt } from "@/lib/admin/types";

export type Bar = { key: string; label: ReactNode; value: number; href?: string };

// Barras horizontais de uma série: rótulo à esquerda, valor na ponta. Todo
// valor está escrito, então não precisa de hover nem de tabela.
export default function Bars({ bars, empty = "Nada no período" }: { bars: Bar[]; empty?: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  if (!bars.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {bars.map((b) => {
        const row = (
          <>
            <span className="w-36 shrink-0 truncate text-sm sm:w-44">{b.label}</span>
            <span className="flex flex-1 items-center gap-2">
              <span className="h-3 rounded-r bg-accent" style={{ width: `${Math.max(1, (b.value / max) * 100)}%` }} />
              <span className="text-xs tabular-nums text-muted">{fmt(b.value)}</span>
            </span>
          </>
        );
        return (
          <li key={b.key}>
            {b.href ? (
              <a href={b.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-accent">
                {row}
              </a>
            ) : (
              <div className="flex items-center gap-3">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
