"use client";

import { useEffect, useRef } from "react";
import {
  MapLibreMap,
  Marker,
  setWorkerUrl,
  type GeoJSONSource,
  type LayerSpecification,
  type SourceSpecification,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CITY } from "@/lib/city";
import { severityVar } from "@/lib/categories";
import { thumbUrl, photoUrl } from "@/lib/media";
import { buildMapStyle, mapTone, type MapType } from "@/lib/map/style";
import { isFresh, remaining, type PostFeature, type PostProperties, type RequestFeature } from "@/lib/posts";
import { KIND_LABEL, LANDMARK_MIN_ZOOM, landmarkSvg, type Landmark } from "@/lib/landmarks";
import type { Theme } from "@/lib/theme";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const WORLD_RING = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];
const OUR_SOURCES = ["city-mask", "city-boundary", "posts", "posts-now", "heat-history"];
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export type HeatState = { now: boolean; history: GeoJSON.FeatureCollection | null };
const CLUSTER_MAX_ZOOM = 17;

type Props = {
  posts: PostFeature[];
  theme: Theme;
  mapType: MapType;
  focus: [number, number] | null;
  activeId: string | null;
  userPos: [number, number] | null;
  requests: RequestFeature[];
  heat: HeatState;
  onSelect: (id: string) => void;
  onSelectMany: (ids: string[]) => void;
  onSelectRequest: (id: string) => void;
  landmarks: Landmark[];
  activeLandmark: string | null;
  onSelectLandmark: (id: string) => void;
  onMove?: (center: [number, number]) => void;
};



// Calor: âmbar → óxido → vermelho, transparente onde não há nada
const HEAT_COLOR = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0, "rgba(0,0,0,0)",
  0.15, "rgba(220,168,74,0.35)",
  0.45, "rgba(224,129,99,0.6)",
  0.75, "rgba(214,72,56,0.8)",
  1, "rgba(255,226,160,0.95)",
];
function heatLayer(id: string, source: string, visible: boolean, weight: unknown): LayerSpecification {
  return {
    id,
    type: "heatmap",
    source,
    layout: { visibility: visible ? "visible" : "none" },
    paint: {
      "heatmap-weight": weight,
      "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 2.2],
      // raio grande de propósito: numa cidade com poucos registros, o calor
      // precisa aparecer em volta dos pins, não escondido embaixo deles
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 28, 14, 70, 17, 120],
      "heatmap-color": HEAT_COLOR,
      "heatmap-opacity": 0.85,
    },
  } as unknown as LayerSpecification;
}

// Camadas nossas por cima do estilo base. Seguem o tom do mapa desenhado
// (escuro, claro ou satélite), não o tema da interface.
function ourLayers(theme: Theme, type: MapType, heat: HeatState): LayerSpecification[] {
  const tone = mapTone(theme, type);
  const mask =
    type === "satelite" ? { c: "#000000", o: 0.5 } : tone === "dark" ? { c: "#0b0c0f", o: 0.62 } : { c: "#f3f0e9", o: 0.66 };
  return [
    heatLayer("heat-history", "heat-history", Boolean(heat.history), ["interpolate", ["linear"], ["get", "n"], 3, 0.5, 20, 1]),
    heatLayer("heat-now", "posts-now", heat.now, 1),
    {
      id: "city-mask",
      type: "fill",
      source: "city-mask",
      paint: { "fill-color": mask.c, "fill-opacity": mask.o },
    },
    {
      id: "city-boundary",
      type: "line",
      source: "city-boundary",
      paint: { "line-color": tone === "dark" ? "#e0a84e" : "#9d5a26", "line-width": 2, "line-dasharray": [3, 2], "line-opacity": 0.8 },
    },
    // Invisível: só existe para o MapLibre carregar e agrupar o source dos posts
    { id: "posts-hit", type: "circle", source: "posts", paint: { "circle-radius": 0, "circle-opacity": 0 } },
  ];
}

function postsSource(posts: PostFeature[]): SourceSpecification {
  return {
    type: "geojson",
    data: toData(posts),
    cluster: true,
    clusterRadius: 56,
    clusterMaxZoom: CLUSTER_MAX_ZOOM - 1,
    // O cluster carrega o horário do post mais novo: é a foto que ele mostra
    clusterProperties: { newest: ["max", ["get", "t"]] },
  };
}

const toData = (posts: PostFeature[]): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: posts.map((f) => ({ ...f, properties: { ...f.properties, t: new Date(f.properties.created_at).getTime() } })),
});

function pinElement(post: PostProperties, count?: number) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `pin sala-escura${count ? " pin-cluster" : ""}`;
  el.setAttribute("aria-label", count ? `${count} posts aqui` : "Ver post");
  const img = document.createElement("img");
  img.alt = "";
  img.decoding = "async";
  img.src = thumbUrl(post.photo_path);
  // Post sem miniatura (anterior a ela existir): cai para a foto inteira
  img.onerror = () => {
    img.onerror = null;
    img.src = photoUrl(post.photo_path);
  };
  el.appendChild(img);
  if (count) {
    const badge = document.createElement("span");
    badge.className = "pin-contagem";
    badge.textContent = count > 99 ? "99+" : String(count);
    el.appendChild(badge);
  }
  return el;
}

function paintPin(el: HTMLElement, post: PostProperties, active: boolean) {
  el.style.setProperty("--sev", severityVar(post.category));
  el.style.setProperty("--restante", remaining(post).toFixed(3));
  el.dataset.novo = isFresh(post.created_at) ? "sim" : "nao";
  el.dataset.ativo = active ? "sim" : "nao";
}

export default function CityMap({
  posts,
  theme,
  mapType,
  focus,
  activeId,
  userPos,
  requests,
  heat,
  onSelect,
  onSelectMany,
  onSelectRequest,
  landmarks,
  activeLandmark,
  onSelectLandmark,
  onMove,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; postId: string }>());
  const byId = useRef(new Map<string, PostProperties>());
  const byTime = useRef(new Map<number, PostProperties>());
  // Ids já vistos: um post que chega depois disso "pousa" com animação
  const known = useRef<Set<string> | null>(null);
  const latest = useRef({ posts, activeId, theme, mapType, heat, onSelect, onSelectMany, onSelectRequest, onSelectLandmark, onMove });
  const landmarkMarkers = useRef(new Map<string, Marker>());
  const requestMarkers = useRef(new Map<string, Marker>());
  const syncRef = useRef<() => void>(() => {});
  const userMarker = useRef<Marker | null>(null);

  useEffect(() => {
    latest.current = { posts, activeId, theme, mapType, heat, onSelect, onSelectMany, onSelectRequest, onSelectLandmark, onMove };
  });

  // Cria o mapa uma vez
  useEffect(() => {
    let m: MapLibreMap | null = null;
    let cancelled = false;
    let tick: ReturnType<typeof setInterval> | undefined;
    const markerMap = markers.current;

    // Marcadores HTML acompanham o que o agrupamento nativo decidiu mostrar
    const sync = () => {
      if (!m || !m.getSource("posts") || !m.isSourceLoaded("posts")) return;
      const seen = new Set<string>();
      const active = latest.current.activeId;
      for (const f of m.querySourceFeatures("posts")) {
        const props = f.properties as Record<string, unknown>;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        const isCluster = Boolean(props.cluster);
        const key = isCluster ? `c${props.cluster_id}` : `p${props.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const post = isCluster ? byTime.current.get(props.newest as number) : byId.current.get(props.id as string);
        if (!post) continue;
        let entry = markerMap.get(key);
        if (!entry || entry.postId !== post.id) {
          entry?.marker.remove();
          const el = pinElement(post, isCluster ? (props.point_count as number) : undefined);
          if (!isCluster && known.current && !known.current.has(post.id)) el.dataset.pousando = "sim";
          el.addEventListener("click", async (ev) => {
            ev.stopPropagation();
            if (!isCluster) return latest.current.onSelect(post.id);
            const source = m!.getSource<GeoJSONSource>("posts")!;
            const clusterId = props.cluster_id as number;
            const zoom = await source.getClusterExpansionZoom(clusterId);
            if (zoom < CLUSTER_MAX_ZOOM) {
              m!.easeTo({ center: coords, zoom: zoom + 0.3 });
            } else {
              // Tudo no mesmo ponto: abre a sequência de fotos direto
              const leaves = await source.getClusterLeaves(clusterId, 100, 0);
              latest.current.onSelectMany(leaves.map((l) => l.properties!.id as string));
            }
          });
          entry = {
            marker: new Marker({ element: el, anchor: "bottom", offset: [0, -5] }).setLngLat(coords).addTo(m),
            postId: post.id,
          };
          markerMap.set(key, entry);
        } else {
          entry.marker.setLngLat(coords);
        }
        paintPin(entry.marker.getElement(), post, !isCluster && post.id === active);
      }
      for (const [key, entry] of markerMap) {
        if (!seen.has(key)) {
          entry.marker.remove();
          markerMap.delete(key);
        }
      }
      if (!known.current) known.current = new Set(byId.current.keys());
      else for (const id of byId.current.keys()) known.current.add(id);
    };
    syncRef.current = sync;

    (async () => {
      let styleKey = `${latest.current.theme}/${latest.current.mapType}`;
      let styleTheme = latest.current.theme;
      let styleType = latest.current.mapType;
      const [firstBase, boundary] = await Promise.all([
        buildMapStyle(styleTheme, styleType),
        fetch(`/cities/${CITY.slug}.geojson`).then(
          (r) => r.json() as Promise<GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>>,
        ),
      ]);
      let base = firstBase;
      // Na hidratação o tema começa no valor do servidor e logo vira o salvo:
      // se mudou enquanto o estilo carregava, monta com o atual
      while (!cancelled && `${latest.current.theme}/${latest.current.mapType}` !== styleKey) {
        styleTheme = latest.current.theme;
        styleType = latest.current.mapType;
        styleKey = `${styleTheme}/${styleType}`;
        base = await buildMapStyle(styleTheme, styleType);
      }
      if (cancelled) return;
      const geom = boundary.features[0].geometry;
      const holes = geom.type === "Polygon" ? [geom.coordinates[0]] : geom.coordinates.map((p) => p[0]);

      const style: StyleSpecification = {
        ...base,
        sources: {
          ...base.sources,
          "city-mask": {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [WORLD_RING, ...holes] } },
          },
          "city-boundary": { type: "geojson", data: boundary },
          posts: postsSource(latest.current.posts),
          "posts-now": { type: "geojson", data: toData(latest.current.posts) },
          "heat-history": { type: "geojson", data: latest.current.heat.history ?? EMPTY },
        },
        layers: [...base.layers, ...ourLayers(styleTheme, styleType, latest.current.heat)],
      };

      m = new MapLibreMap({
        container: container.current!,
        style,
        center: CITY.center,
        zoom: CITY.zoom,
        maxBounds: CITY.maxBounds,
        minZoom: 10,
        maxZoom: 19,
        attributionControl: { compact: true },
      });
      map.current = m;
      m.on("data", (e) => {
        if ((e as { sourceId?: string }).sourceId === "posts") sync();
      });
      m.on("moveend", sync);
      const reportCenter = () => {
        const c = m!.getCenter();
        latest.current.onMove?.([c.lng, c.lat]);
      };
      m.on("load", reportCenter);
      m.on("moveend", reportCenter);
      tick = setInterval(sync, 60_000);
    })();

    return () => {
      cancelled = true;
      clearInterval(tick);
      for (const { marker } of markerMap.values()) marker.remove();
      markerMap.clear();
      m?.remove();
      map.current = null;
    };
  }, []);

  // Dados novos
  useEffect(() => {
    byId.current = new Map(posts.map((f) => [f.properties.id, f.properties]));
    byTime.current = new Map(posts.map((f) => [new Date(f.properties.created_at).getTime(), f.properties]));
    map.current?.getSource<GeoJSONSource>("posts")?.setData(toData(posts));
    map.current?.getSource<GeoJSONSource>("posts-now")?.setData(toData(posts));
    syncRef.current();
  }, [posts]);

  // Camadas de calor
  useEffect(() => {
    const m = map.current;
    if (!m || !m.getLayer("heat-now")) return;
    m.setLayoutProperty("heat-now", "visibility", heat.now ? "visible" : "none");
    m.setLayoutProperty("heat-history", "visibility", heat.history ? "visible" : "none");
    m.getSource<GeoJSONSource>("heat-history")?.setData(heat.history ?? EMPTY);
  }, [heat]);

  // Marcos da cidade: placas fixas, escondidas com o mapa longe
  useEffect(() => {
    const markerMap = landmarkMarkers.current;
    let cleanupZoom: (() => void) | undefined;
    const place = (mm: MapLibreMap) => {
      for (const l of landmarks) {
        if (markerMap.has(l.id)) continue;
        const el = document.createElement("button");
        el.type = "button";
        el.className = "marco";
        el.setAttribute("aria-label", `${KIND_LABEL[l.kind]}: ${l.name}`);
        el.title = l.name;
        el.innerHTML = landmarkSvg(l.kind);
        if (l.heritage) el.dataset.tombado = "sim";
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          latest.current.onSelectLandmark(l.id);
        });
        markerMap.set(l.id, new Marker({ element: el, anchor: "bottom", offset: [0, -6] }).setLngLat([l.lng, l.lat]).addTo(mm));
      }
      const byZoom = () => {
        const show = mm.getZoom() >= LANDMARK_MIN_ZOOM;
        for (const m of markerMap.values()) m.getElement().style.display = show ? "" : "none";
      };
      byZoom();
      mm.on("zoom", byZoom);
      cleanupZoom = () => mm.off("zoom", byZoom);
    };
    let t: ReturnType<typeof setInterval> | undefined;
    if (map.current) place(map.current);
    else
      t = setInterval(() => {
        if (map.current) {
          clearInterval(t);
          place(map.current);
        }
      }, 300);
    return () => {
      clearInterval(t);
      cleanupZoom?.();
    };
  }, [landmarks]);

  useEffect(() => {
    for (const [id, m] of landmarkMarkers.current) m.getElement().dataset.ativo = id === activeLandmark ? "sim" : "nao";
  }, [activeLandmark]);

  // "Alguém aí?": um balão por pedido aberto (são poucos, sem agrupamento)
  useEffect(() => {
    const m = map.current;
    const markerMap = requestMarkers.current;
    const seen = new Set<string>();
    const place = (mm: MapLibreMap) => {
      for (const r of requests) {
        const id = r.properties.id;
        seen.add(id);
        let marker = markerMap.get(id);
        if (!marker) {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "pedido";
          el.setAttribute("aria-label", `Pedido: ${r.properties.question}`);
          el.innerHTML =
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/><path d="M10 9a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2M12 14h.01"/></svg><span class="pedido-n"></span>';
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            latest.current.onSelectRequest(id);
          });
          marker = new Marker({ element: el, anchor: "bottom", offset: [0, -4] }).setLngLat(r.geometry.coordinates as [number, number]).addTo(mm);
          markerMap.set(id, marker);
        }
        const n = marker.getElement().querySelector(".pedido-n")!;
        n.textContent = r.properties.answer_count ? String(r.properties.answer_count) : "";
      }
      for (const [id, marker] of markerMap) {
        if (!seen.has(id)) {
          marker.remove();
          markerMap.delete(id);
        }
      }
    };
    if (m) place(m);
    else {
      // o mapa nasce assíncrono: tenta de novo quando existir
      const t = setInterval(() => {
        if (map.current) {
          clearInterval(t);
          place(map.current);
        }
      }, 300);
      return () => clearInterval(t);
    }
  }, [requests]);

  // Pin ativo
  useEffect(() => {
    syncRef.current();
  }, [activeId]);

  // Tema ou tipo de mapa: troca o estilo base e mantém nossas fontes e camadas
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    let cancelled = false;
    buildMapStyle(theme, mapType).then((base) => {
      if (cancelled) return;
      m.setStyle(base, {
        transformStyle: (prev, next) => ({
          ...next,
          sources: {
            ...next.sources,
            ...Object.fromEntries(OUR_SOURCES.filter((id) => prev?.sources[id]).map((id) => [id, prev!.sources[id]])),
          },
          layers: [...next.layers, ...ourLayers(theme, mapType, latest.current.heat)],
        }),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [theme, mapType]);

  useEffect(() => {
    if (focus) map.current?.flyTo({ center: focus, zoom: Math.max(map.current.getZoom(), 16), speed: 1.4 });
  }, [focus]);

  // Você está aqui
  useEffect(() => {
    const m = map.current;
    if (!m || !userPos) return;
    if (!userMarker.current) {
      const el = document.createElement("div");
      el.className = "voce";
      el.setAttribute("aria-label", "Você está aqui");
      userMarker.current = new Marker({ element: el }).setLngLat(userPos).addTo(m);
    } else {
      userMarker.current.setLngLat(userPos);
    }
  }, [userPos]);

  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" />
    </div>
  );
}
