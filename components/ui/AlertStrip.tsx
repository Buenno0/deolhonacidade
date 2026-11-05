"use client";

import { useState } from "react";
import Sheet from "@/components/Sheet";
import { SEVERITY, janela, severityVar, type CityAlert } from "@/lib/alerts";

// A faixa de aviso, logo abaixo do cabeçalho do mapa.
//
// É a única coisa na tela que não veio de morador nenhum, e por isso ela
// existe: num dia sem registro, o mapa deixa de dizer "nada acontecendo" e
// passa a dizer "vem tempestade até as 23:59". Toque abre o detalhe do INMET.
export default function AlertStrip({ alerts }: { alerts: CityAlert[] }) {
  const [aberto, setAberto] = useState<CityAlert | null>(null);
  if (!alerts.length) return null;

  return (
    <>
      <ul className="pointer-events-auto mx-auto mt-2 flex max-w-lg flex-col gap-1.5">
        {alerts.slice(0, 2).map((a) => {
          const sev = SEVERITY[a.severity];
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setAberto(a)}
                className="sala-escura flex w-full items-center gap-2.5 rounded-none border bg-surface/90 py-2 pl-3 pr-3 text-left backdrop-blur"
                style={{ borderColor: severityVar(a.severity) }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: severityVar(a.severity) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-tight">
                    {a.kind} · <span style={{ color: severityVar(a.severity) }}>{sev.label}</span>
                  </span>
                  <span className="legenda truncate">
                    {janela(a)} · {a.source === "inmet" ? "INMET" : a.source}
                  </span>
                </span>
                <span className="legenda shrink-0 text-accent">ver</span>
              </button>
            </li>
          );
        })}
      </ul>

      {aberto && (
        <Sheet
          eyebrow={`${SEVERITY[aberto.severity].label} · ${aberto.source === "inmet" ? "INMET" : aberto.source}`}
          title={aberto.kind}
          onClose={() => setAberto(null)}
        >
          <p className="text-sm text-muted">{janela(aberto)}</p>

          {aberto.risks.length > 0 && (
            <section className="mt-4">
              <h3 className="legenda mb-1.5">o que pode acontecer</h3>
              <ul className="flex flex-col gap-1.5">
                {aberto.risks.map((r, i) => (
                  <li key={i} className="text-sm leading-relaxed">
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {aberto.instructions.length > 0 && (
            <section className="mt-4">
              <h3 className="legenda mb-1.5">o que fazer</h3>
              <ul className="flex flex-col gap-1.5">
                {aberto.instructions.map((r, i) => (
                  <li key={i} className="text-sm leading-relaxed">
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-4 text-xs text-muted">
            Aviso oficial do Instituto Nacional de Meteorologia para a cidade inteira. O mapa mostra o que as pessoas
            estão vendo na rua agora.
          </p>
        </Sheet>
      )}
    </>
  );
}
