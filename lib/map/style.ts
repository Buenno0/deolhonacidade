import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { Theme } from "@/lib/theme";

// Três tipos de mapa. O mapa não segue a paleta da interface: ele é feito
// para ser lido de relance (ruas bem separadas do chão, água azul, parque
// verde), e a interface continua pedra e areia por cima dele.
//
//  padrao    positron do OpenFreeMap repintado camada a camada: "noturno" no
//            tema escuro, "dia" no claro
//  colorido  liberty do OpenFreeMap como vem (familiar, com comércios)
//  satelite  imagem do Esri World Imagery + nomes de ruas e bairros por cima

export type MapType = "padrao" | "colorido" | "satelite";

export const MAP_TYPES: { id: MapType; label: string; hint: string }[] = [
  { id: "padrao", label: "Padrão", hint: "Limpo, a foto em destaque" },
  { id: "colorido", label: "Colorido", hint: "Com comércios e pontos" },
  { id: "satelite", label: "Satélite", hint: "Imagem aérea com nomes" },
];

const POSITRON = process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://tiles.openfreemap.org/styles/positron";
const LIBERTY = "https://tiles.openfreemap.org/styles/liberty";
// Esri World Imagery: livre para testar. Em produção, use uma chave gratuita
// do ArcGIS Location Platform (ou MapTiler) e troque a URL pela variável.
const SATELLITE_TILES =
  process.env.NEXT_PUBLIC_SATELLITE_TILES ??
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

type Role =
  | "land" | "residential" | "park" | "wood" | "ice" | "water" | "waterway"
  | "building" | "buildingLine" | "path" | "minor" | "minorCasing" | "majorCasing" | "major" | "majorSubtle"
  | "motorwayCasing" | "motorway" | "motorwaySubtle" | "rail" | "railDash" | "boundary" | "aeroway"
  | "label" | "labelMinor" | "roadLabel" | "waterLabel" | "halo";

const NOTURNO: Record<Role, string> = {
  land: "#15171b",
  residential: "#191c21",
  park: "#172a20",
  wood: "#183024",
  ice: "#20242a",
  water: "#0e2a3f",
  waterway: "#1d4a66",
  building: "#21252c",
  buildingLine: "#2b3038",
  path: "#2a2f36",
  minor: "#343a44",
  minorCasing: "#15171b",
  majorCasing: "#0d0f12",
  major: "#4d5461",
  majorSubtle: "#3a404a",
  // A rodovia tem a cor das outras ruas; a largura já basta para destacá-la
  motorwayCasing: "#0d0f12",
  motorway: "#4d5461",
  motorwaySubtle: "#3a404a",
  rail: "#3a3f47",
  railDash: "#15171b",
  boundary: "#5a616c",
  aeroway: "#2a2f36",
  label: "#e6e9ed",
  labelMinor: "#b8bfc9",
  roadLabel: "#aeb5bf",
  waterLabel: "#7fb2d6",
  halo: "#101216",
};

const DIA: Record<Role, string> = {
  land: "#f3f0e9",
  residential: "#ece8e0",
  park: "#d6eacd",
  wood: "#cbe3c0",
  ice: "#ffffff",
  water: "#a8d2e6",
  waterway: "#8cc2dc",
  building: "#e4dfd6",
  buildingLine: "#d4cdc1",
  path: "#e0d9cd",
  minor: "#ffffff",
  minorCasing: "#dcd5c9",
  majorCasing: "#cfc6b8",
  major: "#ffffff",
  majorSubtle: "#e6e0d5",
  motorwayCasing: "#cfc6b8",
  motorway: "#ffffff",
  motorwaySubtle: "#e6e0d5",
  rail: "#cbc4b7",
  railDash: "#f3f0e9",
  boundary: "#a39b8e",
  aeroway: "#e0d9cd",
  label: "#2d3136",
  labelMinor: "#50575f",
  roadLabel: "#5a5f67",
  waterLabel: "#3a7898",
  halo: "#ffffff",
};

const SATELITE_TEXTO: Partial<Record<Role, string>> = {
  label: "#ffffff",
  labelMinor: "#f1f1f1",
  roadLabel: "#f5f5f5",
  waterLabel: "#cfe8f7",
  halo: "rgba(0,0,0,0.78)",
};

function roleOf(id: string): Role | null {
  if (id === "background" || id.startsWith("road_area_pier") || id === "road_pier") return "land";
  if (id === "park") return "park";
  if (id === "water") return "water";
  if (id.startsWith("landcover_ice") || id.startsWith("landcover_glacier")) return "ice";
  if (id === "landuse_residential") return "residential";
  if (id === "landcover_wood") return "wood";
  if (id === "waterway") return "waterway";
  if (id === "building") return "building";
  if (id.startsWith("aeroway")) return "aeroway";
  if (id === "highway_path") return "path";
  if (id === "highway_minor") return "minor";
  if (id === "highway_major_casing") return "majorCasing";
  if (id === "highway_major_inner") return "major";
  if (id === "highway_major_subtle") return "majorSubtle";
  if (id.includes("motorway") && id.includes("casing")) return "motorwayCasing";
  if (id.includes("motorway") && id.includes("subtle")) return "motorwaySubtle";
  if (id.includes("motorway")) return "motorway";
  if (id.startsWith("railway") && id.endsWith("dashline")) return "railDash";
  if (id.startsWith("railway")) return "rail";
  if (id.startsWith("boundary")) return "boundary";
  if (id.startsWith("water") && id.includes("label")) return "waterLabel";
  if (id.startsWith("highway-name") || id.includes("shield")) return "roadLabel";
  if (id === "airport" || id === "label_other" || id === "label_village") return "labelMinor";
  if (id.startsWith("label_")) return "label";
  return null;
}

// Multiplica as larguras de uma expressão interpolate por zoom (não dá para
// embrulhar em ["*"]: zoom só pode ficar no topo da expressão)
function scaleWidth(w: unknown, k: number): unknown {
  if (typeof w === "number") return w * k;
  if (Array.isArray(w) && w[0] === "interpolate") {
    return w.map((v, i) => (i >= 3 && i % 2 === 0 && typeof v === "number" ? v * k : v));
  }
  return w;
}

const cache = new Map<string, Promise<StyleSpecification>>();
function load(url: string) {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => r.json()));
  return cache.get(url)!.then((s) => structuredClone(s));
}

function paintPositron(base: StyleSpecification, pal: Record<Role, string>, withMinorCasing: boolean) {
  const layers: LayerSpecification[] = [];
  for (const layer of base.layers) {
    const role = roleOf(layer.id);
    const l = layer as LayerSpecification & { paint?: Record<string, unknown> };
    if (layer.type === "raster") {
      // relevo sombreado do Natural Earth: só distrai numa cidade
      continue;
    }
    const paint = (l.paint ??= {});
    if (role) {
      if (layer.type === "background") paint["background-color"] = pal[role];
      if (layer.type === "fill") {
        paint["fill-color"] = pal[role];
        if (role === "building") paint["fill-outline-color"] = pal.buildingLine;
      }
      if (layer.type === "line") paint["line-color"] = pal[role];
      if (layer.type === "symbol") {
        paint["text-color"] = pal[role];
        paint["text-halo-color"] = pal.halo;
        paint["text-halo-width"] = 1.4;
      }
    }
    if (layer.id === "highway_minor") {
      paint["line-width"] = scaleWidth(paint["line-width"], 1.3);
      if (withMinorCasing) {
        // No claro, rua branca sobre papel some: um contorno por baixo a separa
        layers.push({
          ...(structuredClone(l) as LayerSpecification),
          id: "highway_minor_casing",
          paint: { "line-color": pal.minorCasing, "line-width": scaleWidth(paint["line-width"], 1.45) },
        } as LayerSpecification);
      }
    }
    if (layer.id === "highway_major_inner" || layer.id === "highway_major_casing") {
      paint["line-width"] = scaleWidth(paint["line-width"], 1.15);
    }
    layers.push(l);
  }
  base.layers = layers;
  return base;
}

// No colorido, rodovias e avenidas vêm em amarelo e laranja: ficam brancas
// com o mesmo contorno das ruas comuns
function neutralRoads(style: StyleSpecification) {
  for (const layer of style.layers) {
    if (layer.type !== "line" || !/^(road|tunnel|bridge)_/.test(layer.id) || /rail|path|pedestrian/.test(layer.id)) continue;
    const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
    paint["line-color"] = layer.id.endsWith("_casing") ? "#cfcdca" : "#ffffff";
  }
  return style;
}

export async function buildMapStyle(theme: Theme, type: MapType): Promise<StyleSpecification> {
  if (type === "colorido") return neutralRoads(await load(LIBERTY));

  const base = await load(POSITRON);
  if (type === "padrao") return paintPositron(base, theme === "dark" ? NOTURNO : DIA, theme === "light");

  // Satélite: a imagem por baixo e só os textos do positron por cima
  const pal = { ...NOTURNO, ...SATELITE_TEXTO } as Record<Role, string>;
  const labels = paintPositron(base, pal, false).layers.filter((l) => l.type === "symbol");
  return {
    ...base,
    sources: {
      ...base.sources,
      satelite: {
        type: "raster",
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Imagens © Esri, Maxar, Earthstar Geographics",
      },
    },
    layers: [{ id: "satelite", type: "raster", source: "satelite" }, ...labels],
  };
}

// Se o mapa desenhado é escuro ou claro (decide a cor da máscara fora da cidade)
export const mapTone = (theme: Theme, type: MapType): "dark" | "light" =>
  type === "satelite" ? "dark" : type === "colorido" ? "light" : theme;
