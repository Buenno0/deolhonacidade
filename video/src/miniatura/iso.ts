// Projeção isométrica (2:1) e utilitários da miniatura. Coordenadas do mundo em "unidades de quadra";
// a tela do protótipo (680×400) é o espaço de desenho, e a câmera escala isso para 1920×1080 ou 1080×1920.
export type P2 = [number, number];

export const TW = 60;
export const TH = 30;
export const OX = 340;
export const OY = 104;
export const LOOP_S = 14;
export const TAU = Math.PI * 2;

export const iso = (x: number, y: number, z = 0): P2 => [OX + ((x - y) * TW) / 2, OY + ((x + y) * TH) / 2 - z];
export const pts = (a: P2[]) => a.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

// Raio no chão (unidades) → semieixos da elipse na tela
export const elipseChao = (r: number) => ({ rx: (r * TW) / Math.SQRT2, ry: (r * TH) / Math.SQRT2 });

export const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
// Mesma curva do pin-pousa do app (cubic-bezier(.2,.9,.3,1.2)): passa um pouco e volta
export const outBack = (v: number) => 1 + 2.2 * Math.pow(v - 1, 3) + 1.2 * Math.pow(v - 1, 2);
export const outCubic = (v: number) => 1 - Math.pow(1 - v, 3);
export const inOut = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);

// Sorteio com semente: a cidade sai igual em todo quadro e em todo render
export function sorteador(semente: number) {
  let s = semente;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function escurecer(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
