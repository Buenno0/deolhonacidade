"use client";

import { useState } from "react";
import { MAP_TYPES, type MapType } from "@/lib/map/style";
import { setMapType, useMapType } from "@/lib/mapType";
import type { Theme } from "@/lib/theme";
import { IconButton, cx } from "./ui";
import { FlameIcon, LayersIcon } from "./ui/icons";

// Um pedaço real do centro de Itapetininga como miniatura do satélite
const SAT_THUMB = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/18594/12010";

function Thumb({ type, theme }: { type: MapType; theme: Theme }) {
  if (type === "satelite") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={SAT_THUMB} alt="" className="h-full w-full object-cover" />;
  }
  // Desenho das cores reais de cada estilo: chão, parque, água, rua e avenida
  const c =
    type === "colorido"
      ? { land: "#f8f4f0", park: "#d8e8c8", water: "#9fc8e8", road: "#ffffff", casing: "#e2d9cc", major: "#fcd6a4" }
      : theme === "dark"
        ? { land: "#15171b", park: "#172a20", water: "#0e2a3f", road: "#343a44", casing: "#15171b", major: "#b98a3e" }
        : { land: "#f3f0e9", park: "#d6eacd", water: "#a8d2e6", road: "#ffffff", casing: "#dcd5c9", major: "#fbd494" };
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
      <rect width="48" height="48" fill={c.land} />
      <rect x="28" y="4" width="16" height="12" rx="3" fill={c.park} />
      <path d="M0 38c10-4 18 2 28-2s14-6 20-4v16H0z" fill={c.water} />
      <path d="M-2 22h52M18 -2v52" stroke={c.casing} strokeWidth="6" />
      <path d="M-2 22h52M18 -2v52" stroke={c.road} strokeWidth="4" />
      <path d="M-4 8 52 30" stroke={c.major} strokeWidth="4" />
    </svg>
  );
}

export type HeatMode = "off" | "agora" | "historico";

type PickerProps = {
  theme: Theme;
  heat: HeatMode;
  onHeat: (h: HeatMode) => void;
  className?: string;
};

const HEAT_OPTIONS: { id: HeatMode; label: string; hint: string }[] = [
  { id: "agora", label: "Calor de agora", hint: "Onde tem mais registros no ar" },
  { id: "historico", label: "Últimos 30 dias", hint: "Onde costuma acontecer" },
];

export default function MapTypePicker({ theme, heat, onHeat, className }: PickerProps) {
  const current = useMapType();
  const [open, setOpen] = useState(false);

  return (
    <div className={cx("relative", className)}>
      <IconButton label="Tipo de mapa" aria-expanded={open} onClick={() => setOpen(!open)} className="h-11 w-11">
        <LayersIcon />
      </IconButton>
      {open && (
        <>
          <button aria-label="Fechar" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label="Tipo de mapa"
            className="absolute right-0 top-12 z-20 w-60 rounded-2xl border border-line bg-surface p-2"
          >
            <p className="rotulo px-2 pb-2 pt-1">Tipo de mapa</p>
            {MAP_TYPES.map((t) => (
              <button
                key={t.id}
                role="menuitemradio"
                aria-checked={current === t.id}
                onClick={() => {
                  setMapType(t.id);
                  setOpen(false);
                }}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl border p-1.5 pr-3 text-left transition",
                  current === t.id ? "border-accent bg-elev" : "border-transparent hover:bg-elev",
                )}
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line">
                  <Thumb type={t.id} theme={theme} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{t.label}</span>
                  <span className="block text-xs text-muted">{t.hint}</span>
                </span>
              </button>
            ))}
            <p className="rotulo px-2 pb-2 pt-3">Mapa de calor</p>
            {HEAT_OPTIONS.map((h) => (
              <button
                key={h.id}
                role="menuitemcheckbox"
                aria-checked={heat === h.id}
                onClick={() => onHeat(heat === h.id ? "off" : h.id)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl border p-2 pr-3 text-left transition",
                  heat === h.id ? "border-accent bg-elev" : "border-transparent hover:bg-elev",
                )}
              >
                <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line", heat === h.id ? "text-danger" : "text-muted")}>
                  <FlameIcon />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{h.label}</span>
                  <span className="block text-xs text-muted">{h.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
