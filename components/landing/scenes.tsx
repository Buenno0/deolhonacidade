import type { ReactNode } from "react";
import { C, Ground, Road, iso } from "./iso";

// Sorteio com semente: a cena sai igual no servidor e no navegador
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

// As "fotos" da LP: cenas isométricas da cidade, uma por categoria.
// Animação só por classe CSS (app/landing.css), sem JS.

const CAR = {
  azul: ["#5a7db3", "#3f5f92", "#2f4a74"],
  bege: ["#e3d6bd", "#cbbd9f", "#a99b7e"],
  verde: ["#94c4ad", "#6e9f89", "#557f6c"],
  branco: ["#f0ece4", "#d4cfc4", "#b0aa9d"],
  vermelho: ["#d0604f", "#a8463a", "#86362c"],
};
const SHIRTS = ["#d29a44", "#7fb79a", "#e08163", "#8fb0f5", "#f4efe4", "#b98bd6", "#e9c98f"];

type Item = { k: number; el: ReactNode };
// Pintor: de trás (x + y menor) para a frente
const paint = (items: Item[]) => [...items].sort((a, b) => a.k - b.k).map((i) => i.el);

// vb: recorte (viewBox) para aproximar a cena num espaço pequeno
type SceneProps = { className?: string; title?: string; vb?: string };

function Frame({ children, className, title, vb = "0 0 440 360" }: SceneProps & { children: ReactNode; vb?: string }) {
  return (
    <svg viewBox={vb} preserveAspectRatio="xMidYMid slice" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect width="100%" height="100%" fill="#0f0e0c" />
      {children}
    </svg>
  );
}

// Pin do app flutuando sobre o acontecimento
function Pin({ x, y, color, children }: { x: number; y: number; color: string; children: ReactNode }) {
  return (
    <g>
      <line x1={x} y1={y + 16} x2={x} y2={y + 40} stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity=".7" />
      <circle cx={x} cy={y} r="22" fill="none" stroke={color} strokeWidth="2" className="lp-svg-ping" />
      <circle cx={x} cy={y} r="16" fill="#211c15" stroke={color} strokeWidth="3" />
      <g transform={`translate(${x - 8} ${y - 8})`} stroke={color} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </g>
  );
}

export function AccidentScene(p: SceneProps) {
  const g = iso(22, 220, 105);
  const items: Item[] = [
    { k: 1, el: <g key="t">{g.box(0.5, 0.5, 0, 2.8, 2.8, 4.2, C.escuro)}{g.windows(0.5, 0.5, 0, 2.8, 2.8, 4.2, 0.55, 3)}</g> },
    { k: 7, el: g.house(6.6, 0.6, 1.6, 1.4, 0.9, C.bege, "h1") },
    { k: 9, el: g.house(8.4, 0.6, 1.3, 1.4, 0.8, C.verde, "h2") },
    { k: 10, el: g.house(6.6, 2.4, 3.1, 1.2, 0.85, C.areia, "h3") },
    { k: 6.5, el: g.tree(0.9, 6.9, 1, "a1") },
    { k: 8.6, el: g.house(0.6, 7.3, 2.6, 1.6, 0.9, C.verde, "h4") },
    { k: 9.5, el: g.tree(3.3, 7.4, 1.1, "a2") },
    { k: 13, el: <g key="s">{g.box(6.6, 6.6, 0, 3, 2.9, 1.6, C.bege)}{g.windows(6.6, 6.6, 0, 3, 2.9, 1.6, 0.9, 5)}</g> },
    { k: 7.4, el: g.lamp(3.6, 3.6, "l1") },
    { k: 12.3, el: g.lamp(6.3, 6.3, "l2") },
    // a batida
    { k: 8.9, el: g.car(3.6, 4.3, CAR.azul, "x", "c1") },
    { k: 10.2, el: g.car(4.95, 4.75, CAR.bege, "y", "c2") },
    { k: 7.1, el: g.cone(3.2, 3.95, "k1") },
    { k: 9.6, el: g.cone(3.1, 5.6, "k2") },
    { k: 11.9, el: g.cone(6.1, 5.8, "k3") },
    { k: 10, el: g.person(6.3, 3.7, SHIRTS[2], "#c98f62", "p1") },
    { k: 10.2, el: g.person(3.4, 6.8, SHIRTS[3], "#e0b48c", "p2") },
    { k: 10.6, el: g.person(3.9, 6.7, SHIRTS[0], "#8d5b3c", "p3") },
  ];
  const [bx, by] = g.P(5.1, 5, 0.9);
  const [lx, ly] = g.P(5.1, 4.3, 0.4);
  const [rx, ry] = g.P(3.6, 5.05, 0.4);
  return (
    <Frame {...p}>
      <Ground g={g} />
      <Road g={g} x={0} y={4} w={10} d={2} />
      <Road g={g} x={4} y={0} w={2} d={10} />
      {paint(items)}
      <circle cx={lx} cy={ly} r="3" fill="#ffb347" className="lp-blink" />
      <circle cx={rx} cy={ry} r="3" fill="#ffb347" className="lp-blink" />
      <Pin x={bx} y={by - 44} color="#e08163">
        <path d="M8 1.5 0.8 14h14.4Z" />
        <path d="M8 6v3.5M8 11.6h.01" />
      </Pin>
    </Frame>
  );
}

export function EventScene(p: SceneProps) {
  const g = iso(22, 220, 105);
  const crowd: Item[] = [];
  const rnd = rng(7);
  for (let yy = 5.6; yy < 7.8; yy += 0.5)
    for (let xx = 3.2; xx < 7; xx += 0.5) {
      const px = xx + (rnd() - 0.5) * 0.2;
      const py = yy + (rnd() - 0.5) * 0.2;
      const skins = ["#d8a57a", "#8d5b3c", "#e0b48c", "#c98f62"];
      crowd.push({ k: px + py, el: <g key={`${xx}${yy}`} className={rnd() > 0.6 ? "lp-pula" : undefined} style={{ animationDelay: `${rnd()}s` }}>{g.person(px, py, SHIRTS[Math.floor(rnd() * SHIRTS.length)], skins[Math.floor(rnd() * 4)])}</g> });
    }
  const stage = (
    <g key="st">
      {g.box(3.6, 3.2, 0, 2.8, 1.6, 0.4, ["#5a4630", "#46372a", "#3a2d22"])}
      {g.person(4.3, 3.7, "#f4efe4", "#c98f62", "m1")}
      {g.person(5.2, 3.6, "#d29a44", "#8d5b3c", "m2")}
      {/* tenda */}
      {(() => {
        const top = g.P(5, 4, 2.2);
        const a = g.P(3.5, 3.1, 1.4), b = g.P(6.5, 3.1, 1.4), c = g.P(6.5, 4.9, 1.4), d = g.P(3.5, 4.9, 1.4);
        return (
          <>
            <polygon points={g.pts(a, b, top)} fill="#9c3f1d" />
            <polygon points={g.pts(b, c, top)} fill="#c2552c" />
            <polygon points={g.pts(d, c, top)} fill="#f4efe4" />
            <polygon points={g.pts(a, d, top)} fill="#e7ddc7" />
            {[a, b, c, d].map((q, i) => (
              <line key={i} x1={q[0]} y1={q[1]} x2={q[0]} y2={q[1] + 1.4 * 22 - (i === 1 ? 0 : 0)} stroke="#55534d" strokeWidth="1.5" />
            ))}
          </>
        );
      })()}
    </g>
  );
  // varal de luzes em volta da praça
  const corners = [g.P(2.4, 2.4, 1.7), g.P(7.6, 2.4, 1.7), g.P(7.6, 8.2, 1.7), g.P(2.4, 8.2, 1.7)];
  const bulbs: ReactNode[] = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % 4];
    for (let t = 0.06; t < 1; t += 0.11) {
      const sag = Math.sin(Math.PI * t) * 10;
      bulbs.push(<circle key={`${i}${t}`} cx={a[0] + (b[0] - a[0]) * t} cy={a[1] + (b[1] - a[1]) * t + sag} r="2.3" fill="#f6d58c" className="lp-twinkle" style={{ animationDelay: `${(t * 7 + i) % 2}s` }} />);
    }
  });
  const back = bulbs.slice(0, 9);
  const front = bulbs.slice(9);
  const [px, py] = g.P(5, 4, 2.2);
  return (
    <Frame {...p}>
      <Ground g={g} />
      <Road g={g} x={0} y={0.2} w={10} d={1.6} />
      {g.tile(2.2, 2.2, 5.6, 6.2, "#20291f")}
      {g.tile(2.6, 5.2, 4.8, 2.8, "#2b3328")}
      {g.box(0.4, 8.6, 0, 1.4, 1.2, 0.01, C.escuro)}
      {back}
      {paint([
        { k: 4.8, el: g.tree(2.4, 2.4, 1.1, "a1") },
        { k: 10, el: g.tree(7.6, 2.4, 1.1, "a2") },
        { k: 8.2, el: stage },
        ...crowd,
        { k: 10.5, el: g.tree(2.4, 8.2, 1.1, "a3") },
        { k: 15.8, el: g.tree(7.6, 8.2, 1.1, "a4") },
        { k: 13, el: g.house(8.3, 4.5, 1.5, 1.6, 0.9, C.bege, "h1") },
        { k: 10, el: g.house(0.4, 4.6, 1.4, 1.7, 0.85, C.verde, "h2") },
      ])}
      {front}
      <Pin x={px} y={py - 40} color="#d29a44">
        <path d="M5.5 12V3l9-1.5v9" />
        <circle cx="3.5" cy="12" r="2" />
        <circle cx="12.5" cy="10.5" r="2" />
      </Pin>
    </Frame>
  );
}

export function FloodScene(p: SceneProps) {
  const g = iso(22, 220, 105);
  const carX = 3.4, carY = 4.3;
  const rain: ReactNode[] = [];
  const rnd = rng(3);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 460 - 10, y = rnd() * 380 - 20;
    rain.push(<line key={i} x1={x} y1={y} x2={x - 4} y2={y + 12} stroke="#a8c6dd" strokeWidth="1" opacity=".35" />);
  }
  const [cx, cy] = g.P(carX + 0.75, carY + 0.37, 0.25);
  const [px, py] = g.P(carX + 0.7, carY + 0.4, 1.4);
  return (
    <Frame {...p}>
      <Ground g={g} />
      <Road g={g} x={0} y={3.4} w={10} d={3.2} />
      {paint([
        { k: 1.5, el: <g key="b1">{g.box(0.4, 0.4, 0, 2.2, 2.4, 3.2, C.escuro)}{g.windows(0.4, 0.4, 0, 2.2, 2.4, 3.2, 0.5, 9)}</g> },
        { k: 4.4, el: g.house(3.1, 0.6, 1.8, 2, 0.95, C.bege, "h1") },
        { k: 6.6, el: g.house(5.3, 0.6, 1.6, 2, 0.85, C.verde, "h2") },
        { k: 8.6, el: <g key="b2">{g.box(7.3, 0.5, 0, 2.3, 2.3, 2.4, C.escuro)}{g.windows(7.3, 0.5, 0, 2.3, 2.3, 2.4, 0.7, 4)}</g> },
        { k: 7.2, el: g.lamp(3.2, 3.2, "l1") },
      ])}
      {g.car(carX, carY, CAR.vermelho, "x", "c")}
      {g.car(6.6, 5.2, CAR.branco, "x", "c2")}
      {/* a água sobe sobre a rua e a calçada; o carro afunda até a porta */}
      <g className="lp-agua-sobe">
        {g.tile(0, 3.0, 10, 4.0, "#2b5f86", 0.26, { opacity: 0.82 })}
      </g>
      {g.box(carX, carY, 0.27, 1.5, 0.75, 0.21, CAR.vermelho)}
      {g.box(carX + 0.3, carY + 0.045, 0.48, 0.75, 0.66, 0.3, ["#3b4652", "#7d93a6", "#5e7488"])}
      {g.box(6.6, 5.2, 0.27, 1.5, 0.75, 0.21, CAR.branco)}
      {g.box(6.9, 5.245, 0.48, 0.75, 0.66, 0.3, ["#3b4652", "#7d93a6", "#5e7488"])}
      {[0, 1.2, 2.4].map((d) => (
        <ellipse key={d} cx={cx} cy={cy + 6} rx="40" ry="18" fill="none" stroke="#a8d2e6" strokeWidth="1.2" className="lp-onda" style={{ animationDelay: `${d}s` }} />
      ))}
      {paint([
        { k: 8.4, el: g.house(0.6, 7.4, 2.4, 2, 0.9, C.areia, "h3") },
        { k: 10.6, el: g.tree(3.6, 7.6, 1, "a1") },
        { k: 11.4, el: g.person(4.4, 7.1, SHIRTS[3], "#c98f62", "p1") },
        { k: 13.2, el: <g key="b3">{g.box(5.4, 7.4, 0, 2.5, 2.2, 1.7, C.bege)}{g.windows(5.4, 7.4, 0, 2.5, 2.2, 1.7, 0.8, 2)}</g> },
        { k: 16, el: g.tree(8.6, 7.8, 0.9, "a2") },
      ])}
      <g className="lp-chuva">{rain}</g>
      <Pin x={px} y={py - 40} color="#dca84a">
        <path d="M8 1s5 5.5 5 9.5a5 5 0 0 1-10 0C3 6.5 8 1 8 1Z" />
      </Pin>
    </Frame>
  );
}

// Close de calçada: rostos e uma placa, que o app desfoca antes de publicar
export function BlurScene(p: SceneProps) {
  const g = iso(46, 205, 104);
  const people = [
    { x: 1.1, y: 1.0, shirt: "#7fb79a", skin: "#d8a57a" },
    { x: 2.3, y: 1.35, shirt: "#e08163", skin: "#8d5b3c" },
  ];
  const k = 1.5;
  const heads = people.map((q) => g.head(q.x, q.y, k));
  const carX = 2.3, carY = 2.75, ck = 1.5;
  const fx = carX + 1.5 * ck;
  // placa na frente do carro (plano x = fx), entre os faróis
  // Placa Mercosul desenhada plana (px) e levada para a face por uma matriz:
  // esquerda→direita na tela é -y, para baixo é -z
  const PW = 0.5 * g.S, PH = 0.24 * g.S;
  const y0 = carY + 0.5625 + 0.25; // canto esquerdo da placa, centrada entre os faróis
  const plO = g.P(fx, y0, 0.44);
  const pl = [g.P(fx, y0, 0.44), g.P(fx, y0 - 0.5, 0.44), g.P(fx, y0 - 0.5, 0.2), g.P(fx, y0, 0.2)] as [number, number][];
  const xs = pl.map((q) => q[0]), ys = pl.map((q) => q[1]);
  const plBox = { x: Math.min(...xs) - 5, y: Math.min(...ys) - 5, w: Math.max(...xs) - Math.min(...xs) + 10, h: Math.max(...ys) - Math.min(...ys) + 10 };
  const sign = g.P(1.2, 0.62, 2.0);

  return (
    <Frame {...p}>
      <defs>
        <filter id="lp-borrar" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {g.tile(0, 0, 6.5, 2.4, C.calcada)}
      {g.tile(0, 2.4, 6.5, 3, C.rua)}
      {g.box(0.2, 0.05, 0, 6, 0.55, 2.6, C.bege)}
      {g.quad("L", 0.2, 0.6, 0.4, 1.6, 0.25, 1.4, "#3b4652")}
      {g.quad("L", 0.2, 0.6, 2.1, 2.8, 0, 1.4, "#5a3d27")}
      {g.quad("L", 0.2, 0.6, 3.2, 5.6, 0.25, 1.4, "#3b4652")}
      {g.quad("L", 0.2, 0.6, 3.25, 5.55, 0.3, 1.35, C.janela, { opacity: 0.35 })}
      <text transform={`matrix(0.866 0.5 0 1 ${sign[0]} ${sign[1]})`} fontFamily="var(--font-display)" fontWeight="700" fontSize="15" fill="#8e4a1f">PADARIA</text>
      {g.lamp(5.6, 1.9)}
      {people.map((q, i) => g.person(q.x, q.y, q.shirt, q.skin, `p${i}`, true, k))}
      {g.car(carX, carY, CAR.azul, "x", "c", ck)}
      <g transform={`matrix(0.866 -0.5 0 1 ${plO[0]} ${plO[1]})`}>
        <rect width={PW} height={PH} rx="1.6" fill="#f7f5ef" stroke="#1a1815" strokeWidth=".7" />
        <path d={`M0 1.6a1.6 1.6 0 0 1 1.6-1.6H${PW - 1.6}a1.6 1.6 0 0 1 1.6 1.6V${PH * 0.27}H0Z`} fill="#1f4fa8" />
        <text x={PW / 2} y={PH * 0.22} textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="700" fontSize={PH * 0.17} fill="#fff" letterSpacing=".6">BRASIL</text>
        <rect x={PW - 5} y={PH * 0.06} width="3.6" height={PH * 0.15} fill="#2f9a4f" />
        <text x={PW / 2} y={PH * 0.9} textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="700" fontSize={PH * 0.6} textLength={PW * 0.86} lengthAdjust="spacingAndGlyphs" fill="#111">BRA2E19</text>
      </g>

      {/* o que o app faz: varre, acha e desfoca */}
      <g className="lp-borra">
        {heads.map((h, i) => (
          <circle key={i} cx={h.hx} cy={h.hy} r={h.hr * 1.35} fill={people[i].skin} filter="url(#lp-borrar)" />
        ))}
        <polygon points={g.pts(...pl)} fill="#d9d4c8" filter="url(#lp-borrar)" />
        <rect x={plBox.x} y={plBox.y} width={plBox.w} height={plBox.h} fill="#cfcabd" filter="url(#lp-borrar)" opacity=".85" />
      </g>
      <g className="lp-det" fill="none" stroke="#d29a44" strokeWidth="1.6" strokeDasharray="4 3">
        {heads.map((h, i) => (
          <g key={i}>
            <rect x={h.hx - h.hr * 1.5} y={h.hy - h.hr * 1.5} width={h.hr * 3} height={h.hr * 3} rx="4" />
            <rect x={h.hx - h.hr * 1.5} y={h.hy - h.hr * 1.5 - 15} width="36" height="12" rx="6" fill="#d29a44" stroke="none" />
            <text x={h.hx - h.hr * 1.5 + 18} y={h.hy - h.hr * 1.5 - 6} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="#1a1206" stroke="none">rosto</text>
          </g>
        ))}
        <rect x={plBox.x} y={plBox.y} width={plBox.w} height={plBox.h} rx="3" />
        <rect x={plBox.x} y={plBox.y + plBox.h + 3} width="36" height="12" rx="6" fill="#d29a44" stroke="none" />
        <text x={plBox.x + 18} y={plBox.y + plBox.h + 12} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="#1a1206" stroke="none">placa</text>
      </g>
      <g className="lp-scan">
        <rect x="0" y="0" width="440" height="2" fill="#d29a44" />
        <rect x="0" y="-26" width="440" height="26" fill="#d29a44" opacity=".12" />
      </g>
    </Frame>
  );
}

export const SCENES = { acidente: AccidentScene, evento: EventScene, alagamento: FloodScene };

// ---------- A cidade inteira (hero e CTA final) ----------
// Cada peça cai no lugar em ordem de profundidade (.lp-cai); fora de um .lp-rv
// a montagem roda ao carregar, dentro dele espera o bloco entrar na tela.
export const CITY_VB = { w: 560, h: 440 };
const cityIso = () => iso(20, 280, 92);

// Onde ficam os pins do hero (em % do quadro), para o HTML por cima do SVG
export function cityPins() {
  const g = cityIso();
  const at = (x: number, y: number) => {
    const [a, b] = g.P(x, y, 0);
    return { left: `${(a / CITY_VB.w) * 100}%`, top: `${(b / CITY_VB.h) * 100}%` };
  };
  return {
    acidente: at(6.8, 6.8),
    evento: at(10.4, 9.3),
    alagamento: at(3, 11.6),
    transito: at(12, 6.8),
    luz: at(2.4, 8.6),
    obra: at(12.6, 12.6),
  };
}

export function CityScene({ className, title }: SceneProps) {
  const g = cityIso();
  const cai = (k: number, el: ReactNode, key: string) => ({
    k,
    key,
    el: (
      <g key={key} className="lp-cai" style={{ animationDelay: `${0.35 + k * 0.05}s` }}>
        {el}
      </g>
    ),
  });
  const tower = (x: number, y: number, w: number, d: number, h: number, seed: number, c = C.escuro) => (
    <>
      {g.box(x, y, 0, w, d, h, c)}
      {g.windows(x, y, 0, w, d, h, 0.6, seed)}
    </>
  );
  // A matriz: nave com telhado e duas torres com cruz
  const church = (
    <>
      {g.house(1.4, 1.6, 2.6, 1.8, 1.3, C.bege)}
      {[1.0, 3.6].map((x) => {
        const [tx, ty] = g.P(x + 0.35, 1.25, 2.9);
        return (
          <g key={x}>
            {g.box(x, 0.9, 0, 0.7, 0.7, 2.4, C.bege)}
            <polygon points={g.pts(g.P(x, 0.9, 2.4), g.P(x + 0.7, 0.9, 2.4), g.P(x + 0.35, 1.25, 2.9))} fill={C.telhado[1]} />
            <polygon points={g.pts(g.P(x + 0.7, 0.9, 2.4), g.P(x + 0.7, 1.6, 2.4), g.P(x + 0.35, 1.25, 2.9))} fill={C.telhado[0]} />
            <polygon points={g.pts(g.P(x, 1.6, 2.4), g.P(x + 0.7, 1.6, 2.4), g.P(x + 0.35, 1.25, 2.9))} fill="#a85a26" />
            <path d={`M${tx} ${ty} v-9 M${tx - 3} ${ty - 6} h6`} stroke="#d29a44" strokeWidth="1.4" />
          </g>
        );
      })}
    </>
  );
  // Guindaste da obra
  const [c0x, c0y] = g.P(12.8, 12.8, 0);
  const [c1x, c1y] = g.P(12.8, 12.8, 5.2);
  const crane = (
    <g>
      {g.box(11.6, 11.9, 0, 1.6, 1.6, 1.4, ["#4a4a52", "#3a3a42", "#2e2e35"])}
      <polygon points={g.pts(g.P(11.6, 11.9, 1.4), g.P(13.2, 11.9, 1.4), g.P(13.2, 13.5, 1.4), g.P(11.6, 13.5, 1.4))} fill="none" stroke="#8a8f99" strokeWidth=".8" />
      <line x1={c0x} y1={c0y} x2={c1x} y2={c1y} stroke="#d29a44" strokeWidth="3" />
      <g className="lp-guindaste" style={{ transformOrigin: `${c1x}px ${c1y}px` }}>
        <line x1={c1x - 70} y1={c1y + 10} x2={c1x + 40} y2={c1y - 8} stroke="#d29a44" strokeWidth="2.4" />
        <line x1={c1x - 58} y1={c1y + 8} x2={c1x - 58} y2={c1y + 44} stroke="#8a8f99" strokeWidth=".8" />
        <rect x={c1x - 62} y={c1y + 44} width="8" height="6" fill="#b4a78b" />
      </g>
    </g>
  );
  // Barracas da feira na praça
  const stalls = [0, 1, 2].map((i) => (
    <g key={i}>
      {g.box(8.3 + i * 1.1, 10.1, 0, 0.8, 0.6, 0.45, ["#5a4630", "#46372a", "#3a2d22"])}
      {g.box(8.25 + i * 1.1, 10.05, 0.55, 0.9, 0.7, 0.08, i % 2 ? ["#f4efe4", "#e7ddc7", "#cfc3a8"] : ["#e08163", "#c2552c", "#9c3f1d"])}
    </g>
  ));

  const items: (Item & { key: string })[] = [
    cai(2.5, church, "igreja"),
    cai(2.2, g.tree(0.6, 4.6, 1), "a1"),
    cai(5.2, g.tree(4.6, 4.4, 1), "a2"),
    cai(7.4, g.lamp(5.5, 5.5), "l1"),
    cai(9, tower(8.1, 0.6, 2.1, 2.1, 3.8, 3), "t1"),
    cai(11.2, tower(10.7, 0.7, 2.6, 1.9, 2.6, 7), "t2"),
    cai(12.4, g.house(8.2, 3.7, 1.6, 1.5, 0.85, C.verde), "h1"),
    cai(14.4, g.house(10.4, 3.7, 1.6, 1.5, 0.85, C.areia), "h2"),
    cai(15.6, g.tree(12.9, 4.4, 1), "a3"),
    cai(8.8, g.house(0.6, 8.1, 1.6, 1.4, 0.85, C.areia), "h3"),
    cai(10.6, g.house(2.5, 8.1, 1.5, 1.4, 0.8, C.verde), "h4"),
    cai(12.3, g.house(4.3, 8.1, 1.3, 1.4, 0.8, C.bege), "h5"),
    cai(10.9, g.tree(1, 9.9, 0.9), "a4"),
    cai(14.6, g.tree(4.8, 9.9, 0.9), "a5"),
    cai(15.2, g.house(0.7, 12.5, 2.2, 1.4, 0.85, C.bege), "h6"),
    cai(17.7, tower(3.3, 12.4, 2.3, 1.5, 1.6, 11, C.bege), "s1"),
    cai(16.5, g.tree(8.3, 8.3, 1.1), "a6"),
    cai(19, g.tree(12.6, 8.4, 1.1), "a7"),
    cai(18.5, <>{stalls}</>, "feira"),
    cai(21, g.tree(8.4, 12.6, 1), "a8"),
    cai(22.6, <>{g.box(9.4, 12.4, 0, 1.6, 1.4, 1.1, C.areia)}{g.windows(9.4, 12.4, 0, 1.6, 1.4, 1.1, 0.9, 13)}</>, "s2"),
    cai(25.6, crane, "obra"),
  ];
  // Quadras de trás da avenida (y < 6) e da frente: os carros passam entre elas
  const BACK = new Set(["igreja", "a1", "a2", "l1", "t1", "t2", "h1", "h2", "a3"]);
  const back = items.filter((i) => BACK.has(i.key));
  const front = items.filter((i) => !BACK.has(i.key));

  return (
    <svg viewBox={`0 0 ${CITY_VB.w} ${CITY_VB.h}`} className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <g className="lp-chao">
        <Ground g={g} n={14} />
        {g.tile(7.9, 7.9, 5.4, 3.0, "#20291f")}
        {g.tile(8.1, 8.1, 5.0, 2.6, "#2b3328")}
        <Road g={g} x={0} y={6} w={14} d={1.6} />
        <Road g={g} x={6} y={0} w={1.6} d={14} />
        <Road g={g} x={0} y={11.2} w={6} d={1.0} />
        <Road g={g} x={7.6} y={11.2} w={6.4} d={1.0} />
      </g>
      {paint(back)}
      {/* carros andando na avenida: depois do que fica atrás, antes do que fica na frente */}
      <g className="lp-anda" style={{ animationDelay: "0s" }}>{g.car(-1.6, 6.15, ["#5a7db3", "#3f5f92", "#2f4a74"], "x")}</g>
      <g className="lp-anda" style={{ animationDelay: "-4.5s" }}>{g.car(-1.6, 6.75, ["#f0ece4", "#d4cfc4", "#b0aa9d"], "x")}</g>
      <g className="lp-anda lp-anda-lenta" style={{ animationDelay: "-2s" }}>{g.car(-1.6, 6.15, ["#94c4ad", "#6e9f89", "#557f6c"], "x")}</g>
      {g.car(6.2, 9.0, ["#e3d6bd", "#cbbd9f", "#a99b7e"], "y")}
      {paint(front)}
    </svg>
  );
}

// ---------- Um dia na cidade ----------
// A mesma quadra das 6h à meia-noite: a luz muda e cada faixa de horário tem
// o seu acontecimento. hour: 6 a 24 (fração vale).
export type DayEvent = "transito" | "feira" | "chuva" | "show" | "apagao";
export const dayEvent = (h: number): DayEvent => (h < 9 ? "transito" : h < 13 ? "feira" : h < 17 ? "chuva" : h < 21 ? "show" : "apagao");

// A cena só muda quando muda o acontecimento. Céu, sol, lua, janelas e postes
// ficam por conta do DaySection, que mexe em variáveis CSS a cada quadro
// (--luz acende janelas e postes, --noite mostra estrelas). Fundo transparente:
// o céu é a camada de baixo.
export function DayScene({ ev, className, title }: SceneProps & { ev: DayEvent }) {
  const g = iso(22, 220, 112);
  const out = ev === "apagao";
  const rnd = rng(ev.length * 7);

  const cars =
    ev === "transito"
      ? [0, 1, 2, 3, 4].map((i) => ({ k: 4 + i * 1.6, el: g.car(0.2 + i * 1.75, 4.3, i % 2 ? CAR.branco : i % 3 ? CAR.azul : CAR.vermelho, "x", `carro${i}`) }))
      : [{ k: 9, el: g.car(4.5, 4.3, CAR.azul, "x", "c1") }];
  const crowd: Item[] = [];
  if (ev === "feira" || ev === "show")
    for (let yy = 6.9; yy < 8.9; yy += 0.55)
      for (let xx = ev === "show" ? 6.2 : 6.4; xx < 9.4; xx += 0.6) {
        const px = xx + (rnd() - 0.5) * 0.25, py = yy + (rnd() - 0.5) * 0.25;
        crowd.push({ k: px + py, el: <g key={`${xx}${yy}`} className={ev === "show" && rnd() > 0.5 ? "lp-pula" : undefined} style={{ animationDelay: `${rnd()}s` }}>{g.person(px, py, SHIRTS[Math.floor(rnd() * SHIRTS.length)])}</g> });
      }
  const stalls =
    ev === "feira"
      ? [0, 1, 2].map((i) => ({
          k: 6.4 + i,
          el: (
            <g key={`b${i}`}>
              {g.box(6.3 + i * 1.05, 6.0, 0, 0.8, 0.6, 0.45, ["#5a4630", "#46372a", "#3a2d22"])}
              {g.box(6.25 + i * 1.05, 5.95, 0.55, 0.9, 0.7, 0.08, i % 2 ? ["#f4efe4", "#e7ddc7", "#cfc3a8"] : ["#7fb79a", "#5f8778", "#4a6b5e"])}
            </g>
          ),
        }))
      : [];
  const stage =
    ev === "show"
      ? [{ k: 7.2, el: <g key="palco">{g.box(6.4, 6.0, 0, 2.4, 0.8, 0.35, ["#5a4630", "#46372a", "#3a2d22"])}{g.person(7.2, 6.2, "#f4efe4", "#c98f62")}{g.person(7.9, 6.2, "#d29a44", "#8d5b3c")}</g> }]
      : [];

  const [pinX, pinY] = ev === "transito" ? g.P(4.5, 4.6, 1.6) : ev === "chuva" ? g.P(3, 5, 1.4) : ev === "apagao" ? g.P(1.6, 1.6, 4.4) : g.P(7.6, 7.2, 1.8);
  const pinColor = ev === "feira" || ev === "show" ? "#d29a44" : "#dca84a";
  const lit = out ? 0 : 0.75;

  return (
    <svg viewBox="0 0 440 360" preserveAspectRatio="xMidYMid slice" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <g className="lp-estrelas">
        {[40, 90, 150, 260, 320, 390, 70, 360, 200, 120].map((x, i) => (
          <circle key={i} cx={x} cy={18 + ((i * 37) % 70)} r="1.2" fill="#f4efe4" className="lp-twinkle" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </g>
      <Ground g={g} />
      <Road g={g} x={0} y={4} w={10} d={1.8} />
      {g.tile(5.8, 5.8, 3.8, 3.4, "#20291f")}
      <g key={ev} className="lp-troca">
        {paint([
          { k: 1, el: <g key="p1">{g.box(0.5, 0.5, 0, 2.2, 2.4, 3.6, C.escuro)}{g.windows(0.5, 0.5, 0, 2.2, 2.4, 3.6, lit, 3, "lp-janela")}</g> },
          { k: 4.4, el: g.house(3.2, 0.7, 1.7, 1.8, 0.95, C.bege, "h1") },
          { k: 6.6, el: <g key="p2">{g.box(5.4, 0.6, 0, 2, 2.2, 2.6, C.escuro)}{g.windows(5.4, 0.6, 0, 2, 2.2, 2.6, lit, 8, "lp-janela")}</g> },
          { k: 9, el: g.house(7.8, 0.8, 1.6, 1.8, 0.85, C.verde, "h2") },
          { k: 3.5, el: g.lamp(3.3, 3.6, "l1", out ? "lp-poste-apagado" : "lp-poste") },
          { k: 8.2, el: g.lamp(7.6, 3.6, "l2", out ? "lp-poste-apagado" : "lp-poste") },
          ...cars,
          { k: 7.3, el: g.house(0.6, 6.4, 2.2, 1.6, 0.9, C.areia, "h3") },
          { k: 9.6, el: g.tree(3.6, 6.4, 1, "a1") },
          { k: 12.4, el: g.house(1.2, 8.3, 2, 1.4, 0.8, C.verde, "h4") },
          ...stalls,
          ...stage,
          ...crowd,
          { k: 12.2, el: g.tree(9.3, 6.0, 1, "a2") },
          { k: 18, el: g.tree(9.2, 9.0, 1, "a3") },
        ])}
        {ev === "chuva" && (
          <>
            <g className="lp-agua-sobe">{g.tile(0, 3.7, 10, 2.4, "#2b5f86", 0.12, { opacity: 0.75 })}</g>
            <g className="lp-chuva">
              {Array.from({ length: 60 }, (_, i) => {
                const x = (i * 53) % 460, y = (i * 97) % 380;
                return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 12} stroke="#a8c6dd" strokeWidth="1" opacity=".35" />;
              })}
            </g>
          </>
        )}
        {ev === "show" &&
          Array.from({ length: 12 }, (_, i) => {
            const [x1, y1] = g.P(5.9, 5.9, 1.5), [x2, y2] = g.P(9.5, 5.9, 1.5);
            const t = (i + 0.5) / 12;
            return <circle key={i} cx={x1 + (x2 - x1) * t} cy={y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * 8} r="2.2" fill="#f6d58c" className="lp-twinkle" style={{ animationDelay: `${(i % 4) * 0.4}s` }} />;
          })}
        <g className="lp-pinsobe">
          <Pin x={pinX} y={pinY - 30} color={pinColor}>
            {ev === "transito" && <path d="M1 8h14v5H1Z M2.5 8l1.5-4h8l1.5 4" />}
            {ev === "feira" && <path d="M1 6l2-4h10l2 4H1Z M2 6v8h12V6" />}
            {ev === "chuva" && <path d="M8 1s5 5.5 5 9.5a5 5 0 0 1-10 0C3 6.5 8 1 8 1Z" />}
            {ev === "show" && (
              <>
                <path d="M5.5 12V3l9-1.5v9" />
                <circle cx="3.5" cy="12" r="2" />
                <circle cx="12.5" cy="10.5" r="2" />
              </>
            )}
            {ev === "apagao" && <path d="M9 1 3 9h5l-1 6 6-8H8Z" />}
          </Pin>
        </g>
      </g>
    </svg>
  );
}

// ---------- Simulador de divulgação ----------
export const SHOP_KINDS = {
  padaria: { name: "Padaria", awning: ["#e08163", "#c2552c", "#9c3f1d"], wall: C.bege },
  bar: { name: "Bar", awning: ["#7fb79a", "#5f8778", "#4a6b5e"], wall: C.areia },
  loja: { name: "Loja", awning: ["#8fb0f5", "#5e7fc4", "#46629c"], wall: C.bege },
  evento: { name: "Eventos", awning: ["#d29a44", "#b07d33", "#8a6126"], wall: C.verde },
  salao: { name: "Salão", awning: ["#b98bd6", "#9469b0", "#74508b"], wall: C.bege },
} as const;
export type ShopKind = keyof typeof SHOP_KINDS;

export function ShopScene({ kind, className, title, vb = "60 6 316 200" }: SceneProps & { kind: ShopKind }) {
  const g = iso(34, 210, 70);
  const k = SHOP_KINDS[kind];
  const sign = g.P(1.1, 2.6, 2.05);
  const [px, py] = g.P(2.6, 2.4, 3.4);
  const walkers = [
    { y: 3.0, shirt: SHIRTS[1], d: "0s" },
    { y: 3.35, shirt: SHIRTS[2], d: "-3s" },
    { y: 3.1, shirt: SHIRTS[3], d: "-6s" },
  ];
  return (
    <Frame className={className} title={title} vb={vb}>
      {g.tile(-1, 0, 8, 4.0, C.calcada)}
      {g.tile(-1, 4.0, 8, 3, C.rua)}
      {g.box(0.6, 0.4, 0, 4.2, 2.2, 2.4, k.wall)}
      {g.quad("L", 0.6, 2.6, 0.4, 1.8, 0.25, 1.5, "#3b4652")}
      {g.quad("L", 0.6, 2.6, 0.45, 1.75, 0.3, 1.45, C.janela, { opacity: 0.45 })}
      {g.quad("L", 0.6, 2.6, 2.3, 3.0, 0, 1.4, "#5a3d27")}
      {g.quad("L", 0.6, 2.6, 3.3, 4.0, 0.25, 1.5, "#3b4652")}
      {/* toldo listrado */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <polygon
          key={i}
          points={g.pts(g.P(0.6 + i * 0.6, 2.6, 1.75), g.P(1.2 + i * 0.6, 2.6, 1.75), g.P(1.2 + i * 0.6, 3.1, 1.5), g.P(0.6 + i * 0.6, 3.1, 1.5))}
          fill={i % 2 ? "#f4efe4" : k.awning[1]}
        />
      ))}
      <text key={kind} className="lp-in-svg" transform={`matrix(0.866 0.5 0 1 ${sign[0]} ${sign[1]})`} fontFamily="var(--font-display)" fontWeight="700" fontSize="20" fill={k.awning[2]}>
        {k.name.toUpperCase()}
      </text>
      {g.lamp(5.4, 3.4)}
      {walkers.map((w, i) => (
        <g key={i} className="lp-passa" style={{ animationDelay: w.d }}>
          {g.person(-1.2, w.y, w.shirt, i % 2 ? "#8d5b3c" : "#d8a57a")}
        </g>
      ))}
      <g key={`pin-${kind}`} className="lp-pinsobe">
        <Pin x={px} y={py} color="#d29a44">
          <path d="M1 6l1.5-4h11L15 6M2 6v8h12V6M6 14v-4h4v4" />
        </Pin>
      </g>
    </Frame>
  );
}
