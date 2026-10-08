// A planta da cidade em miniatura (porte de prototipos/cidade-miniatura.html). Tudo que não se mexe é gerado uma
// vez como descrição de formas SVG; as janelas guardam a fase do pisca. Carros, guindaste, chuva e pinos são
// calculados a cada quadro em Miniatura.tsx.
import { CENA, COR } from '../tema';
import { escurecer, iso, pts, sorteador, TAU, type P2 } from './iso';

export type Forma = { el: 'polygon' | 'line' | 'circle' | 'ellipse' | 'rect' | 'polyline' | 'path'; a: Record<string, string | number> };
export type Janela = { pontos: string; cor: string; fase: number; periodo: number; acesa: boolean };
export type Peca = { id: number; chave: number; formas: Forma[]; janelas: Janela[] };
export type Faixa = { dir: 'x+' | 'x-' | 'y+' | 'y-'; c: number; fase: number; voltas: number; cor: string };
export type Luz = { x: number; y: number; fase: number };

export type Cidade = {
  chao: Forma[];
  pecas: Peca[];
  fios: Forma[];
  luzes: Luz[];
  faixas: Faixa[];
  gotas: Array<{ x: number; y: number; o: number }>;
};

// Períodos que dividem o loop de 14 s: o pisca das janelas emenda no começo
const PERIODOS = [14, 7, 14 / 3];

const PREDIO = ['#2c3038', '#1f2228', '#16191e'];
const PEDRA = [CENA.pedra, '#bfb39b', '#a69a83'];
const CREME = [CENA.creme, '#cfc6b8', '#b8ae9f'];
const OCRE = ['#c9a46a', '#b08c55', '#957644'];
const SALVIA = ['#9fb7a4', '#87a08d', '#708877'];
const TELHA = [CENA.telhaEscura, CENA.telha, '#86502a'];

export const RUAS: Array<[number, number]> = [[2.2, 2.8], [5.0, 5.6]];
export const BORDA: [number, number] = [-0.4, 8.2];
const QUADRAS: Array<[number, number]> = [[0, 2.2], [2.8, 5.0], [5.6, 7.8]];

// Pontos da cidade que as cenas usam (pinos, bolha, comércio)
export const LUGAR = {
  catedral: { x: 1.1, y: 1.65 },
  obra: { x: 5.85, y: 1.35 },
  feira: { x: 6.45, y: 3.62 },
  coreto: { x: 3.9, y: 3.9, z: 25 },
  posto: { x: 3.85, y: 6.4 },
  alagamento: { x: 6.3, y: 6.95 },
  transito: { x: 0.9, y: 5.3 },
  comercio: { x: 6.22, y: 7.25 },
  poca: { x: 5.3, y: 6.9 },
} as const;

export function criarCidade(): Cidade {
  const rnd = sorteador(11);
  const chao: Forma[] = [];
  const pecas: Peca[] = [];

  const poly = (f: Forma[], p: P2[], fill: string, extra: Record<string, string | number> = {}) => f.push({ el: 'polygon', a: { points: pts(p), fill, ...extra } });
  const seg = (f: Forma[], a: P2, b: P2, stroke: string, w: number, extra: Record<string, string | number> = {}) =>
    f.push({ el: 'line', a: { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1), stroke, strokeWidth: w, strokeLinecap: 'round', ...extra } });
  const circ = (f: Forma[], c: P2, r: number, fill: string, extra: Record<string, string | number> = {}) =>
    f.push({ el: 'circle', a: { cx: c[0].toFixed(1), cy: c[1].toFixed(1), r, fill, ...extra } });

  const peca = (chave: number, fn: (f: Forma[], j: Janela[]) => void) => {
    const p: Peca = { id: pecas.length, chave, formas: [], janelas: [] };
    fn(p.formas, p.janelas);
    pecas.push(p);
    return p;
  };

  const caixa = (f: Forma[], x0: number, y0: number, x1: number, y1: number, h: number, c: string[], z0 = 0) => {
    const t = z0 + h;
    poly(f, [iso(x0, y1, t), iso(x1, y1, t), iso(x1, y1, z0), iso(x0, y1, z0)], c[1]);
    poly(f, [iso(x1, y0, t), iso(x1, y1, t), iso(x1, y1, z0), iso(x1, y0, z0)], c[2]);
    poly(f, [iso(x0, y0, t), iso(x1, y0, t), iso(x1, y1, t), iso(x0, y1, t)], c[0]);
  };
  const janelasEm = (j: Janela[], x0: number, y0: number, x1: number, y1: number, h: number, dens: number) => {
    for (let z = 5; z + 5 <= h - 3; z += 9) {
      for (let x = x0 + 0.1; x + 0.13 <= x1 - 0.05; x += 0.26) {
        j.push({ pontos: pts([iso(x, y1, z), iso(x + 0.13, y1, z), iso(x + 0.13, y1, z + 5), iso(x, y1, z + 5)]), cor: CENA.luzJanela, fase: rnd() * TAU, periodo: PERIODOS[Math.floor(rnd() * 3)], acesa: rnd() < dens });
      }
      for (let y = y0 + 0.1; y + 0.13 <= y1 - 0.05; y += 0.26) {
        j.push({ pontos: pts([iso(x1, y, z), iso(x1, y + 0.13, z), iso(x1, y + 0.13, z + 5), iso(x1, y, z + 5)]), cor: '#d9a95a', fase: rnd() * TAU, periodo: PERIODOS[Math.floor(rnd() * 3)], acesa: rnd() < dens * 0.8 });
      }
    }
  };
  const telhado = (f: Forma[], x0: number, y0: number, x1: number, y1: number, t: number, hr: number, c: string[]) => {
    const ym = (y0 + y1) / 2;
    poly(f, [iso(x0, y0, t), iso(x1, y0, t), iso(x1, ym, t + hr), iso(x0, ym, t + hr)], c[0]);
    poly(f, [iso(x0, y1, t), iso(x1, y1, t), iso(x1, ym, t + hr), iso(x0, ym, t + hr)], c[1]);
    poly(f, [iso(x1, y0, t), iso(x1, y1, t), iso(x1, ym, t + hr)], c[2]);
  };
  const piramide = (f: Forma[], x0: number, y0: number, x1: number, y1: number, t: number, hr: number, c: string[]) => {
    const a = iso((x0 + x1) / 2, (y0 + y1) / 2, t + hr);
    poly(f, [iso(x0, y1, t), iso(x1, y1, t), a], c[0]);
    poly(f, [iso(x1, y0, t), iso(x1, y1, t), a], c[1]);
  };
  const predio = (x0: number, y0: number, x1: number, y1: number, h: number, dens: number) =>
    peca((x0 + x1 + y0 + y1) / 2, (f, j) => { caixa(f, x0, y0, x1, y1, h, PREDIO); janelasEm(j, x0, y0, x1, y1, h, dens); });
  const casa = (x0: number, y0: number, x1: number, y1: number, h: number, paredes: string[]) =>
    peca((x0 + x1 + y0 + y1) / 2, (f) => {
      caixa(f, x0, y0, x1, y1, h, paredes);
      telhado(f, x0, y0, x1, y1, h, 7, TELHA);
      const xm = (x0 + x1) / 2;
      poly(f, [iso(xm - 0.08, y1, 2.5), iso(xm + 0.08, y1, 2.5), iso(xm + 0.08, y1, 6.5), iso(xm - 0.08, y1, 6.5)], CENA.luzJanela);
    });

  // chão, ruas, quadras, praça, faixas e a borda tracejada (a mesma do município no app)
  const [G0, G1] = BORDA;
  poly(chao, [iso(G0, G0), iso(G1, G0), iso(G1, G1), iso(G0, G1)], CENA.chao);
  for (const r of RUAS) {
    poly(chao, [iso(G0, r[0]), iso(G1, r[0]), iso(G1, r[1]), iso(G0, r[1])], CENA.rua);
    poly(chao, [iso(r[0], G0), iso(r[1], G0), iso(r[1], G1), iso(r[0], G1)], CENA.rua);
  }
  for (const a of QUADRAS) for (const b of QUADRAS) poly(chao, [iso(a[0], b[0]), iso(a[1], b[0]), iso(a[1], b[1]), iso(a[0], b[1])], CENA.calcada);
  poly(chao, [iso(2.9, 2.9), iso(4.9, 2.9), iso(4.9, 4.9), iso(2.9, 4.9)], CENA.praca);
  poly(chao, [iso(3.8, 2.9), iso(4.0, 2.9), iso(4.0, 4.9), iso(3.8, 4.9)], '#26342c');
  poly(chao, [iso(2.9, 3.8), iso(4.9, 3.8), iso(4.9, 4.0), iso(2.9, 4.0)], '#26342c');
  for (const r of RUAS) {
    const m = (r[0] + r[1]) / 2;
    seg(chao, iso(G0, m), iso(G1, m), '#4d5461', 1, { strokeDasharray: '5 7' });
    seg(chao, iso(m, G0), iso(m, G1), '#4d5461', 1, { strokeDasharray: '5 7' });
  }
  poly(chao, [iso(G0, G0), iso(G1, G0), iso(G1, G1), iso(G0, G1)], 'none', { stroke: '#e0a84e', strokeWidth: 1.5, strokeDasharray: '6 4', opacity: 0.8 });

  // Catedral (o marco: azulejo flutuando em cima, desenhado no céu)
  peca(2.3, (f) => {
    caixa(f, 0.35, 0.4, 1.85, 1.45, 28, PEDRA);
    telhado(f, 0.35, 0.4, 1.85, 1.45, 28, 10, [CENA.telhaEscura, CENA.telha, '#bfb39b']);
    caixa(f, 0.35, 1.45, 0.8, 1.9, 52, PEDRA);
    piramide(f, 0.35, 1.45, 0.8, 1.9, 52, 16, [CENA.telha, CENA.telhaEscura]);
    caixa(f, 0.8, 1.55, 1.4, 1.85, 34, PEDRA);
    poly(f, [iso(1.0, 1.85, 0), iso(1.2, 1.85, 0), iso(1.2, 1.85, 12), iso(1.0, 1.85, 12)], '#3a2a1f');
    caixa(f, 1.4, 1.45, 1.85, 1.9, 52, PEDRA);
    piramide(f, 1.4, 1.45, 1.85, 1.9, 52, 16, [CENA.telha, CENA.telhaEscura]);
    for (const p of [[0.5, 1.9], [1.55, 1.9]]) poly(f, [iso(p[0], p[1], 30), iso(p[0] + 0.12, p[1], 30), iso(p[0] + 0.12, p[1], 44), iso(p[0], p[1], 44)], CENA.luzJanela);
    poly(f, [iso(1.85, 1.58, 30), iso(1.85, 1.74, 30), iso(1.85, 1.74, 44), iso(1.85, 1.58, 44)], '#d9a95a');
    for (const c of [[0.575, 1.675], [1.625, 1.675]]) {
      const m = iso(c[0], c[1], 74);
      seg(f, iso(c[0], c[1], 68), iso(c[0], c[1], 77), COR.accent, 1.4);
      seg(f, [m[0] - 3, m[1]], [m[0] + 3, m[1]], COR.accent, 1.4);
    }
  });

  predio(2.95, 0.2, 3.85, 1.15, 66, 0.65);
  predio(3.95, 0.25, 4.85, 1.0, 46, 0.55);
  predio(2.95, 1.35, 4.85, 2.05, 22, 0.5);

  // obra: esqueleto do prédio, base e torre do guindaste (a lança gira no céu), cavaletes e cones
  peca(7.25, (f) => {
    const [x0, x1, y0, y1] = [5.8, 6.9, 0.3, 1.5];
    poly(f, [iso(x0, y0), iso(x1, y0), iso(x1, y1), iso(x0, y1)], '#2a2d33');
    for (const z of [12, 24]) poly(f, [iso(x0, y0, z), iso(x1, y0, z), iso(x1, y1, z), iso(x0, y1, z)], '#3a3f48', { stroke: '#6b7380', strokeWidth: 1, opacity: 0.85 });
    poly(f, [iso(x0, y0, 34), iso(x1, y0, 34), iso(x1, y1, 34), iso(x0, y1, 34)], 'none', { stroke: '#8a919c', strokeWidth: 1 });
    for (const p of [[x0, y1], [x1, y1], [x1, y0], [(x0 + x1) / 2, y1], [x1, (y0 + y1) / 2]]) seg(f, iso(p[0], p[1], 0), iso(p[0], p[1], 34), '#8a919c', 1.6);
  });
  peca(8.05, (f) => {
    caixa(f, 7.15, 0.5, 7.55, 0.9, 4, ['#6b7380', '#4d5461', '#3a3f48']);
    caixa(f, 7.29, 0.64, 7.41, 0.76, 100, [COR.warn, '#c08f3a', '#9a722b']);
    for (let z = 6; z < 98; z += 8) seg(f, iso(7.29, 0.76, z), iso(7.41, 0.76, z + 8), COR.accentInk, 0.8);
  });
  for (const x of [5.8, 6.25, 6.7, 7.15]) {
    peca(x + 2.165, (f) => {
      caixa(f, x, 1.95, x + 0.35, 2.03, 6, [COR.warn, '#c08f3a', '#9a722b']);
      for (let k = 0; k < 4; k += 2) {
        const a = x + k * 0.0875;
        const b = a + 0.0875;
        poly(f, [iso(a, 2.03, 0.5), iso(b, 2.03, 0.5), iso(b, 2.03, 5.5), iso(a, 2.03, 5.5)], COR.accentInk);
      }
    });
  }
  for (const [x, y] of [[5.7, 1.7], [5.7, 1.25]]) {
    peca(x + y, (f) => {
      const p = iso(x, y);
      poly(f, [[p[0] - 3, p[1]], [p[0] + 3, p[1]], [p[0], p[1] - 9]], COR.danger);
      poly(f, [[p[0] - 2, p[1] - 3.5], [p[0] + 2, p[1] - 3.5], [p[0] + 1.4, p[1] - 5.5], [p[0] - 1.4, p[1] - 5.5]], COR.ink);
    });
  }

  predio(0.2, 3.0, 1.0, 3.8, 18, 0.5);
  predio(1.2, 3.0, 2.0, 4.0, 14, 0.5);
  predio(0.2, 4.1, 2.0, 4.85, 12, 0.45);

  const arvore = (x: number, y: number, r: number) =>
    peca(x + y, (f) => {
      const c = iso(x, y, 13);
      seg(f, iso(x, y), c, '#4a3324', 2.2);
      circ(f, [c[0], c[1] - 2], r, CENA.folha);
      circ(f, [c[0] - 2.5, c[1] - 5], +(r * 0.55).toFixed(1), CENA.folhaClara);
    });
  for (const [x, y] of [[3.1, 3.1], [3.9, 3.05], [4.7, 3.1], [3.05, 3.9], [4.75, 3.9], [3.1, 4.7], [3.9, 4.75], [4.7, 4.7], [7.72, 7.72], [7.72, 5.7], [1.95, 7.6], [0.1, 5.75]]) arvore(x, y, 8);

  // coreto no meio da praça
  peca(7.8, (f) => {
    const [cx, cy] = [3.9, 3.9];
    const hex = (r: number, z: number) => Array.from({ length: 6 }, (_, k) => {
      const an = (k * Math.PI) / 3 + Math.PI / 6;
      return [cx + r * Math.cos(an), cy + r * Math.sin(an), z] as [number, number, number];
    });
    const lados = (b0: Array<[number, number, number]>, b1: Array<[number, number, number]>, fn: (k: number, k2: number, nx: number, ny: number) => void) => {
      for (let k = 0; k < 6; k++) {
        const m = ((k + 0.5) * Math.PI) / 3 + Math.PI / 6;
        const nx = Math.cos(m);
        const ny = Math.sin(m);
        if (nx + ny > 0.01) fn(k, (k + 1) % 6, nx, ny);
      }
      void b0; void b1;
    };
    const b0 = hex(0.44, 0);
    const b1 = hex(0.44, 3);
    lados(b0, b1, (k, k2, nx, ny) => poly(f, [iso(...b1[k]), iso(...b1[k2]), iso(...b0[k2]), iso(...b0[k])], ny > nx ? CREME[1] : CREME[2]));
    poly(f, b1.map((p) => iso(...p)), CREME[0]);
    poly(f, hex(0.3, 3.2).map((p) => iso(...p)), CENA.luz, { opacity: 0.4 });
    for (const p of hex(0.36, 3)) seg(f, iso(p[0], p[1], 3), iso(p[0], p[1], 13), CENA.creme, 1.5);
    const rb = hex(0.52, 13);
    const ap = iso(cx, cy, 25);
    lados(rb, rb, (k, k2, nx, ny) => poly(f, [iso(...rb[k]), iso(...rb[k2]), ap], ny > nx ? CENA.telha : CENA.telhaEscura));
    circ(f, [ap[0], ap[1] - 1], 1.8, COR.accent);
  });

  // feira: barracas de lona listrada
  const LONAS = [[COR.danger, COR.ink], [COR.warn, COR.ink], [COR.ok, COR.ink]];
  let li = 0;
  for (const y of [3.1, 3.95]) {
    for (const x of [5.75, 6.45, 7.15]) {
      const c = LONAS[li++ % 3];
      peca(x + y + 0.55, (f) => {
        const [x1, y1, ym, n] = [x + 0.55, y + 0.55, y + 0.275, 4];
        const dx = 0.55 / n;
        caixa(f, x + 0.03, y + 0.36, x1 - 0.03, y1 - 0.02, 4, ['#6b4a33', '#5a3e2b', '#4a3324']);
        for (const p of [[x, y1], [x1, y1], [x1, y]]) seg(f, iso(p[0], p[1]), iso(p[0], p[1], 9), COR.muted, 1);
        for (let k = 0; k < n; k++) poly(f, [iso(x + k * dx, y, 9), iso(x + (k + 1) * dx, y, 9), iso(x + (k + 1) * dx, ym, 14), iso(x + k * dx, ym, 14)], c[k % 2], { opacity: 0.9 });
        for (let k = 0; k < n; k++) poly(f, [iso(x + k * dx, y1, 9), iso(x + (k + 1) * dx, y1, 9), iso(x + (k + 1) * dx, ym, 14), iso(x + k * dx, ym, 14)], c[k % 2]);
        poly(f, [iso(x1, y, 9), iso(x1, y1, 9), iso(x1, ym, 14)], c[0], { opacity: 0.85 });
        [COR.danger, COR.warn, COR.ok].forEach((cf, k) => {
          const p = iso(x + 0.14 + k * 0.14, y1 - 0.1, 4);
          circ(f, [p[0], p[1] - 1], 1.6, cf);
        });
      });
    }
  }

  // gente (sem rosto): só corpo e cabeça
  for (const [x, y, cor] of [[6.35, 3.78, COR.ok], [7.05, 3.82, COR.danger], [5.95, 4.72, COR.muted], [6.8, 4.68, '#3a5a8a'], [3.5, 4.3, COR.warn], [4.3, 3.5, CENA.creme], [3.62, 3.52, '#b5523a'], [6.45, 7.95, CENA.creme], [6.7, 8.0, '#3a5a8a']] as Array<[number, number, string]>) {
    peca(x + y, (f) => {
      const p = iso(x, y);
      f.push({ el: 'rect', a: { x: (p[0] - 2.2).toFixed(1), y: (p[1] - 9).toFixed(1), width: 4.4, height: 8, rx: 2, fill: cor } });
      circ(f, [p[0], p[1] - 11], 2.2, '#cfc6b8');
    });
  }

  casa(0.25, 5.85, 1.0, 6.55, 9, PEDRA);
  casa(1.25, 5.85, 2.0, 6.55, 9, OCRE);
  casa(0.25, 6.85, 1.0, 7.6, 9, SALVIA);
  casa(1.25, 6.85, 2.0, 7.6, 9, CREME);

  // posto: loja nos fundos, bombas, cobertura (a fila de carros fica na frente)
  peca(3.85 + 6.45, (f) => {
    caixa(f, 3.1, 5.65, 4.6, 5.95, 11, PREDIO);
    poly(f, [iso(3.7, 5.95), iso(4.0, 5.95), iso(4.0, 5.95, 7), iso(3.7, 5.95, 7)], CENA.luzJanela);
    for (const p of [[3.6, 6.3], [4.05, 6.3]]) caixa(f, p[0], p[1], p[0] + 0.14, p[1] + 0.2, 7, [COR.ok, '#5f8f78', '#4b7360']);
    for (const p of [[3.15, 6.75], [4.55, 6.75], [4.55, 6.15]]) seg(f, iso(p[0], p[1]), iso(p[0], p[1], 12), '#cfc6b8', 1.6);
    caixa(f, 3.05, 6.05, 4.65, 6.85, 3, CREME, 12);
    poly(f, [iso(3.05, 6.85, 12), iso(4.65, 6.85, 12), iso(4.65, 6.85, 13.5), iso(3.05, 6.85, 13.5)], COR.ok);
  });

  predio(5.8, 5.8, 6.6, 6.6, 16, 0.6);
  casa(6.85, 5.85, 7.6, 6.55, 9, OCRE);
  casa(6.85, 6.85, 7.6, 7.6, 9, PEDRA);

  // "Seu Comércio": o café de exemplo (nunca um comércio real), com toldo listrado e vitrine acesa
  peca(5.85 + 7.6, (f) => {
    const [x0, y0, x1, y1] = [5.85, 6.9, 6.6, 7.6];
    caixa(f, x0, y0, x1, y1, 12, ['#b5523a', '#9c4530', '#843a28']);
    poly(f, [iso(x0, y0, 12), iso(x1, y0, 12), iso(x1, y1, 12), iso(x0, y1, 12)], '#6e3324');
    poly(f, [iso(x0 + 0.1, y1, 1.5), iso(x1 - 0.1, y1, 1.5), iso(x1 - 0.1, y1, 7.5), iso(x0 + 0.1, y1, 7.5)], CENA.luzJanela);
    const n = 6;
    for (let k = 0; k < n; k++) {
      const a = x0 + 0.05 + (k * (x1 - x0 - 0.1)) / n;
      const b = a + (x1 - x0 - 0.1) / n;
      poly(f, [iso(a, y1, 9.5), iso(b, y1, 9.5), iso(b, y1 + 0.22, 7), iso(a, y1 + 0.22, 7)], k % 2 ? COR.ink : COR.danger);
    }
    poly(f, [iso(x0 + 0.2, y1, 10), iso(x1 - 0.2, y1, 10), iso(x1 - 0.2, y1, 11.7), iso(x0 + 0.2, y1, 11.7)], COR.accent);
  });

  // postes de luz
  for (const [x, y] of [[2.15, 0.6], [2.15, 4.4], [5.65, 3.2], [5.65, 6.75], [1.0, 2.85], [4.4, 2.15], [6.9, 4.95], [1.6, 5.65]]) {
    peca(x + y, (f) => {
      const c = iso(x, y, 16);
      seg(f, iso(x, y), c, '#4d5461', 1.3);
      circ(f, c, 2.2, CENA.luz);
    });
  }

  // fios de luz do coreto até as árvores
  const fios: Forma[] = [];
  const luzes: Luz[] = [];
  const ac = iso(3.9, 3.9, 20);
  for (const [tx, ty] of [[3.1, 3.1], [4.7, 3.1], [3.1, 4.7], [4.7, 4.7]]) {
    const b = iso(tx, ty, 18);
    const caminho: P2[] = [];
    for (let i = 0; i <= 8; i++) {
      const s = i / 8;
      caminho.push([ac[0] + (b[0] - ac[0]) * s, ac[1] + (b[1] - ac[1]) * s + 7 * Math.sin(Math.PI * s)]);
    }
    fios.push({ el: 'polyline', a: { points: pts(caminho), fill: 'none', stroke: '#4d5461', strokeWidth: 0.8 } });
    for (let i = 1; i < 8; i++) luzes.push({ x: caminho[i][0], y: caminho[i][1], fase: rnd() * TAU });
  }

  // carros: duas faixas por rua, um ou dois carros por faixa; voltas inteiras por loop para emendar
  const CORES = [CENA.creme, COR.muted, '#6b7380', '#b5523a', '#3a5a8a', COR.accent, '#cfc6b8', COR.ok];
  const DIRS: Array<[Faixa['dir'], number]> = [['x+', 2.38], ['x-', 2.62], ['x+', 5.18], ['x-', 5.42], ['y+', 2.38], ['y-', 2.62], ['y+', 5.18], ['y-', 5.42]];
  const faixas: Faixa[] = [];
  DIRS.forEach(([dir, c], i) => {
    [0, 0.5].forEach((ph, j) => {
      if (j === 1 && i % 3 === 2) return;
      faixas.push({ dir, c, fase: (ph + i * 0.13) % 1, voltas: (i % 2) + 1, cor: CORES[(i * 2 + j) % 8] });
    });
  });

  // a chuva cai só até ~70 de altura: mais alto que isso, na projeção, as gotas cobririam a praça
  const gotas = Array.from({ length: 56 }, () => ({ x: 4.95 + rnd() * 2.85, y: 5.6 + rnd() * 2.2, o: rnd() * 70 }));

  return { chao, pecas, fios, luzes, faixas, gotas };
}

// Carros parados na fila do posto
export const FILA_POSTO: Array<{ x: number; y: number; cor: string }> = [
  { x: 3.15, y: 7.05, cor: COR.muted },
  { x: 3.65, y: 7.05, cor: '#3a5a8a' },
  { x: 4.15, y: 7.05, cor: CENA.creme },
];

export { escurecer };
