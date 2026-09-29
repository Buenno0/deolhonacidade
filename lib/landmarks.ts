export type LandmarkKind = "igreja" | "monumento" | "estatua" | "marco" | "patrimonio";

export type LandmarkPhoto = { url: string; page: string; author: string; license: string };

export type Landmark = {
  id: string;
  name: string;
  kind: LandmarkKind;
  summary: string | null;
  // Artigo da Wikipédia sobre o próprio lugar (texto principal da ficha)
  wiki_title: string | null;
  // Artigo sobre quem/o que o lugar homenageia (seção "Quem foi…")
  about_title: string | null;
  about_label: string | null;
  photos: LandmarkPhoto[];
  heritage: string | null;
  address: string | null;
  wikidata: string | null;
  osm: string | null;
  lng: number;
  lat: number;
};

export const KIND_LABEL: Record<LandmarkKind, string> = {
  igreja: "Igreja",
  monumento: "Monumento",
  estatua: "Estátua",
  marco: "Marco da cidade",
  patrimonio: "Patrimônio histórico",
};

// Os desenhos dos marcos: 24×24, traço 2, pensados para ler a 20px dentro do
// marcador dourado. Um só lugar para o mapa (texto SVG) e a ficha (React).
export const LANDMARK_PATHS: Record<LandmarkKind, string> = {
  // torre com cruz, nave e porta em arco
  igreja:
    '<path d="M12 1.5v4M10 3.5h4"/><path d="M8.5 21V9.5L12 6.5l3.5 3v11.5"/><path d="M8.5 13 3.5 16v5M15.5 13l5 3v5"/><path d="M2 21h20"/><path d="M10.5 21v-3a1.5 1.5 0 0 1 3 0v3"/>',
  // figura de braço erguido sobre pedestal
  estatua:
    '<circle cx="12" cy="3.8" r="1.8"/><path d="M12 6.5v6.5M12 8.5l3.5-2.5M12 8.5 9 11"/><path d="M12 13l-1.5 3.5M12 13l1.5 3.5"/><path d="M7.5 17h9v4h-9zM5.5 21h13"/>',
  // obelisco
  monumento: '<path d="M12 1.5 14 5v12h-4V5z"/><path d="M8 17h8v2.5H8zM6 21.5h12"/>',
  // fachada com frontão e colunas
  patrimonio:
    '<path d="M2.5 9 12 3.5 21.5 9"/><path d="M3.5 9h17"/><path d="M6 11.5v6.5M10 11.5v6.5M14 11.5v6.5M18 11.5v6.5"/><path d="M3.5 18.5h17M2 21.5h20"/>',
  // portal em arco
  marco: '<path d="M4 21.5V10a8 8 0 0 1 16 0v11.5"/><path d="M8.5 21.5V11a3.5 3.5 0 0 1 7 0v10.5"/><path d="M2 21.5h20"/>',
};

export const landmarkSvg = (kind: LandmarkKind, size = 22) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LANDMARK_PATHS[kind]}</svg>`;

// O marco some quando o mapa está longe: de perto ele é referência, de longe é ruído
export const LANDMARK_MIN_ZOOM = 13;
// "O que está rolando aqui": posts até esta distância do marco
export const LANDMARK_RADIUS_M = 300;

export type WikiSummary = { title: string; extract: string; image: string | null; url: string };
