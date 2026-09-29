"use client";

import { useState } from "react";
import { cx } from "@/components/ui";
import { fmt } from "@/lib/admin/types";

export type Column = { key: string; tick?: string; tip: string; value: number };

// Um teto redondo para o eixo (0 / 5 / 10, 0 / 50 / 100…)
function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v / 2)!;
  return step * pow * 2;
}

// Colunas de uma série só, no acento. Hover ou setas mostram o valor; a tabela
// fica logo abaixo para quem não usa o ponteiro.
export default function Columns({ columns, unit, height = 160 }: { columns: Column[]; unit: string; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...columns.map((c) => c.value)));
  const current = active === null ? null : columns[active];

  function onKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const d = e.key === "ArrowRight" ? 1 : -1;
    setActive((a) => Math.min(columns.length - 1, Math.max(0, (a ?? (d > 0 ? -1 : columns.length)) + d)));
  }

  return (
    <div>
      <div className="relative flex gap-2">
        {/* eixo y */}
        <div className="rotulo flex flex-col justify-between text-right tabular-nums" style={{ height }} aria-hidden>
          <span>{fmt(max)}</span>
          <span>{fmt(max / 2)}</span>
          <span>0</span>
        </div>
        <div
          className="relative flex-1 outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ height }}
          tabIndex={0}
          role="img"
          aria-label={`${columns.length} valores de ${unit}; use as setas para ler cada um`}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          {/* grade */}
          {[0, 0.5, 1].map((f) => (
            <div key={f} className="absolute inset-x-0 border-t border-line" style={{ top: `${f * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {columns.map((c, i) => (
              <div
                key={c.key}
                className="relative flex h-full flex-1 items-end justify-center"
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              >
                <div
                  className={cx("w-full max-w-6 rounded-t bg-accent transition-opacity", active !== null && active !== i && "opacity-45")}
                  style={{ height: c.value ? `max(2px, ${(c.value / max) * 100}%)` : 0 }}
                />
              </div>
            ))}
          </div>
          {current && (
            <div
              className="pointer-events-none absolute -top-2 z-10 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs"
              style={{
                left: `${((active! + 0.5) / columns.length) * 100}%`,
                transform: `translate(${active! < columns.length / 3 ? "-10%" : active! > (columns.length * 2) / 3 ? "-90%" : "-50%"}, -100%)`,
              }}
            >
              <span className="font-semibold tabular-nums">{fmt(current.value)}</span> <span className="text-muted">{unit}</span>
              <span className="block text-muted">{current.tip}</span>
            </div>
          )}
        </div>
      </div>
      {/* eixo x: só alguns rótulos, sem encavalar */}
      <div className="rotulo mt-1.5 flex justify-between pl-8" aria-hidden>
        {columns
          .filter((c, i) => c.tick && (i === 0 || i === columns.length - 1 || i === Math.floor(columns.length / 2)))
          .map((c) => (
            <span key={c.key}>{c.tick}</span>
          ))}
      </div>
      <details className="mt-2">
        <summary className="rotulo cursor-pointer select-none">ver tabela</summary>
        <table className="mt-2 w-full text-xs tabular-nums">
          <tbody>
            {columns.map((c) => (
              <tr key={c.key} className="border-t border-line">
                <td className="py-1 text-muted">{c.tip}</td>
                <td className="py-1 text-right">{fmt(c.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
