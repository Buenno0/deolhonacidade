"use client";

import { useEffect, useRef, useState } from "react";
import { MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CITY } from "@/lib/city";
import { severityVar } from "@/lib/categories";
import { buildMapStyle } from "@/lib/map/style";
import { useTheme } from "@/lib/theme";
import type { AgencyEvent } from "@/lib/agency/types";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type Spot = { id: string; lat: number; lng: number; severity: string; badge?: string };

// O mapa é do pin para o ponto da cidade, não para a vizinhança lá de perto
export const eventSpot = (e: AgencyEvent): Spot => ({
  id: e.id,
  lat: e.lat,
  lng: e.lng,
  severity: severityVar(e.category),
});

// Mapa enxuto da sala de situação: o mapa padrão da cidade com um ponto por
// ocorrência, anel na cor da severidade. Sem foto, sem cluster, sem tempo
// restante. Quem precisa de detalhe clica e lê a lista ao lado.
export default function SituationMap({
  spots,
  activeId,
  onSelect,
  onPick,
  height = 420,
}: {
  spots: Spot[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  // Clique no mapa vazio: usado para marcar onde pedir olhos
  onPick?: (lng: number, lat: number) => void;
  height?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  // O mapa nasce depois do primeiro render (buildMapStyle é assíncrono). Sem
  // este sinal, a reconciliação dos pontos roda com map.current ainda nulo e
  // não acontece de novo: a lista mostra os trechos e o mapa fica vazio.
  const [ready, setReady] = useState(false);
  const { theme } = useTheme();
  // handlers mudam a cada render; o mapa é montado uma vez só, então ele lê
  // sempre o par mais recente em vez de reassinar os eventos
  const latest = useRef({ onSelect, onPick });
  useEffect(() => {
    latest.current = { onSelect, onPick };
  }, [onSelect, onPick]);

  useEffect(() => {
    if (!box.current || map.current) return;
    let alive = true;
    (async () => {
      const style = await buildMapStyle(theme, "padrao");
      if (!alive || !box.current) return;
      const m = new MapLibreMap({
        container: box.current,
        style,
        center: CITY.center,
        zoom: CITY.zoom,
        maxBounds: CITY.maxBounds,
        attributionControl: { compact: true },
      });
      m.on("click", (e) => latest.current.onPick?.(e.lngLat.lng, e.lngLat.lat));
      map.current = m;
      setReady(true);
    })();
    const pins = markers.current;
    return () => {
      alive = false;
      setReady(false);
      map.current?.remove();
      map.current = null;
      pins.clear();
    };
    // o tema entra na montagem; trocar tema no meio recarrega a página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcilia os pontos: cria o que chegou, apaga o que saiu, move o resto.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();

    for (const s of spots) {
      seen.add(s.id);
      let marker = markers.current.get(s.id);
      if (!marker) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "agency-pin";
        el.setAttribute("aria-label", "Abrir ocorrência");
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          latest.current.onSelect?.(s.id);
        });
        marker = new Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(m);
        markers.current.set(s.id, marker);
      } else {
        marker.setLngLat([s.lng, s.lat]);
      }
      const el = marker.getElement();
      el.style.setProperty("--pin", s.severity);
      el.textContent = s.badge ?? "";
      el.classList.toggle("is-active", s.id === activeId);
    }

    for (const [id, marker] of markers.current) {
      if (seen.has(id)) continue;
      marker.remove();
      markers.current.delete(id);
    }
  }, [spots, activeId, ready]);

  // Centraliza no ponto selecionado sem mexer no zoom de quem está lendo
  useEffect(() => {
    if (!activeId || !map.current) return;
    const s = spots.find((x) => x.id === activeId);
    if (s) map.current.easeTo({ center: [s.lng, s.lat], duration: 400 });
  }, [activeId, spots, ready]);

  return <div ref={box} style={{ height }} className="overflow-hidden rounded-2xl border border-line" />;
}
