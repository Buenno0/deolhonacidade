import type { ReactNode } from "react";

// Peças de desenho isométrico (SVG puro) para as ilustrações da LP: no lugar
// das fotos que ainda não temos. Eixo x desce para a direita, y desce para a
// esquerda, z sobe. Desenhe de trás para a frente (x + y crescente).

export const C = {
  chao: "#1a1815",
  quadra: "#24211d",
  calcada: "#36332d",
  rua: "#2c2c31",
  faixa: "#b8873d",
  escuro: ["#3b3b43", "#2c2c33", "#222229"],
  bege: ["#e7ddc7", "#cfc3a8", "#b4a78b"],
  verde: ["#9cc0b0", "#7aa596", "#5f8778"],
  areia: ["#e9c98f", "#d29a44", "#b07d33"],
  telhado: ["#c26a2e", "#8e4a1f"],
  janela: "#e9b65c",
  janelaApagada: "#3a3a44",
  copa: ["#3d7259", "#2c5a45"],
  tronco: "#4a3a2a",
};

export type Iso = ReturnType<typeof iso>;

export function iso(S: number, ox: number, oy: number) {
  const P = (x: number, y: number, z = 0): [number, number] => [ox + (x - y) * 0.866 * S, oy + (x + y) * 0.5 * S - z * S];
  const pts = (...p: [number, number][]) => p.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

  // Plano no chão (rua, calçada, quadra)
  const tile = (x: number, y: number, w: number, d: number, fill: string, z = 0, extra?: object) => (
    <polygon points={pts(P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z))} fill={fill} {...extra} />
  );

  // Caixa: topo, face esquerda (frente, plano y + d) e face direita (plano x + w)
  const box = (x: number, y: number, z: number, w: number, d: number, h: number, c: string[], key?: string) => (
    <g key={key}>
      <polygon points={pts(P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h))} fill={c[1]} />
      <polygon points={pts(P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h))} fill={c[2]} />
      <polygon points={pts(P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h))} fill={c[0]} />
    </g>
  );

  // Retângulo numa face: "L" = plano y (u corre em x), "R" = plano x (u corre em y)
  const quad = (face: "L" | "R", x: number, y: number, u0: number, u1: number, z0: number, z1: number, fill: string, extra?: object) => {
    const p =
      face === "L"
        ? [P(x + u0, y, z0), P(x + u1, y, z0), P(x + u1, y, z1), P(x + u0, y, z1)]
        : [P(x, y + u0, z0), P(x, y + u1, z0), P(x, y + u1, z1), P(x, y + u0, z1)];
    return <polygon points={pts(...(p as [number, number][]))} fill={fill} {...extra} />;
  };

  // Fileiras de janelas nas duas faces de uma caixa. litClass: as acesas vão
  // juntas num grupo só com essa classe, para acender e apagar o grupo inteiro
  // de uma vez (uma opacidade por prédio, não uma por janela)
  const windows = (x: number, y: number, z: number, w: number, d: number, h: number, lit = 0.6, seed = 1, litClass?: string) => {
    const off: ReactNode[] = [];
    const on: ReactNode[] = [];
    let s = seed;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let zz = z + 0.35; zz < z + h - 0.3; zz += 0.55) {
      for (let u = 0.2; u < w - 0.25; u += 0.45) {
        const isOn = rnd() < lit;
        (isOn ? on : off).push(<g key={`l${zz}${u}`}>{quad("L", x, y + d, u, u + 0.22, zz, zz + 0.28, isOn ? C.janela : C.janelaApagada)}</g>);
      }
      for (let u = 0.2; u < d - 0.25; u += 0.45) {
        const isOn = rnd() < lit * 0.7;
        (isOn ? on : off).push(<g key={`r${zz}${u}`}>{quad("R", x + w, y, u, u + 0.22, zz, zz + 0.28, isOn ? C.janela : C.janelaApagada)}</g>);
      }
    }
    if (!litClass) return [...off, ...on];
    return [
      ...off,
      <g key="acesas" className={litClass}>
        {on}
      </g>,
    ];
  };

  // Casa: paredes, janela, porta e telhado de duas águas (cumeeira em x)
  const house = (x: number, y: number, w: number, d: number, h: number, wall: string[], key?: string) => {
    const r = 0.55;
    const t = h;
    return (
      <g key={key}>
        <polygon points={pts(P(x, y, t), P(x + w, y, t), P(x + w, y + d / 2, t + r), P(x, y + d / 2, t + r))} fill={C.telhado[1]} />
        {box(x, y, 0, w, d, h, wall)}
        {quad("L", x, y + d, w * 0.18, w * 0.38, 0.25, 0.55, C.janela)}
        {quad("L", x, y + d, w * 0.6, w * 0.75, 0, 0.5, "#5a3d27")}
        <polygon points={pts(P(x + w, y, t), P(x + w, y + d, t), P(x + w, y + d / 2, t + r))} fill={wall[2]} />
        <polygon points={pts(P(x, y + d / 2, t + r), P(x + w, y + d / 2, t + r), P(x + w, y + d + 0.08, t - 0.05), P(x, y + d + 0.08, t - 0.05))} fill={C.telhado[0]} />
      </g>
    );
  };

  const tree = (x: number, y: number, s = 1, key?: string) => {
    const [bx, by] = P(x, y, 0);
    const [cx, cy] = P(x, y, 0.75 * s);
    return (
      <g key={key}>
        <ellipse cx={bx} cy={by} rx={0.3 * S * s} ry={0.15 * S * s} fill="#000" opacity=".3" />
        <rect x={bx - 0.05 * S} y={cy} width={0.1 * S} height={by - cy} fill={C.tronco} />
        <circle cx={cx} cy={cy} r={0.38 * S * s} fill={C.copa[1]} />
        <circle cx={cx - 0.08 * S} cy={cy - 0.1 * S} r={0.24 * S * s} fill={C.copa[0]} />
      </g>
    );
  };

  // Carro: ao longo de x (frente em x + w) ou de y (frente em y + d); k = escala
  const car = (x: number, y: number, color: string[], along: "x" | "y" = "x", key?: string, k = 1) => {
    const [w, d] = along === "x" ? [1.5 * k, 0.75 * k] : [0.75 * k, 1.5 * k];
    const [cw, cd, cx, cy] = along === "x" ? [0.75 * k, 0.66 * k, x + 0.3 * k, y + 0.045 * k] : [0.66 * k, 0.75 * k, x + 0.045 * k, y + 0.3 * k];
    const light = (px: number, py: number) => {
      const [a, b] = P(px, py, 0.33 * k);
      return <circle cx={a} cy={b} r={0.07 * S * k} fill="#fff3c9" />;
    };
    const [sx, sy] = P(x + w / 2, y + d / 2, 0);
    return (
      <g key={key}>
        <ellipse cx={sx} cy={sy} rx={0.95 * S * k} ry={0.42 * S * k} fill="#000" opacity=".35" />
        {box(x, y, 0.12 * k, w, d, 0.36 * k, color)}
        {/* rodas na lateral visível (a face da frente da caixa), inclinadas como ela */}
        {(along === "x" ? [0.32, 1.18] : [0.32, 1.18]).map((u) => {
          const [wx, wy] = along === "x" ? P(x + u * k, y + d, 0.16 * k) : P(x + w, y + u * k, 0.16 * k);
          const rot = along === "x" ? 30 : -30;
          return (
            <g key={u} transform={`translate(${wx.toFixed(1)} ${wy.toFixed(1)}) rotate(${rot}) scale(1 0.92)`}>
              <ellipse rx={0.19 * S * k} ry={0.2 * S * k} fill="#17171b" />
              <ellipse rx={0.09 * S * k} ry={0.095 * S * k} fill="#8a8f99" />
            </g>
          );
        })}
        {box(cx, cy, 0.48 * k, cw, cd, 0.3 * k, ["#3b4652", "#7d93a6", "#5e7488"])}
        {along === "x" ? (
          <>
            {light(x + w, y + 0.14 * k)}
            {light(x + w, y + d - 0.14 * k)}
          </>
        ) : (
          <>
            {light(x + 0.14 * k, y + d)}
            {light(x + w - 0.14 * k, y + d)}
          </>
        )}
      </g>
    );
  };

  // Pessoa: corpo, cabeça e (se grande o bastante) rosto
  // k: escala (1 = pessoa no tamanho da cidade)
  const head = (x: number, y: number, k = 1) => {
    const [hx, hy] = P(x + 0.12 * k, y + 0.12 * k, 0.92 * k);
    return { hx, hy, hr: 0.16 * S * k };
  };
  const person = (x: number, y: number, shirt: string, skin = "#d8a57a", key?: string, face = false, k = 1) => {
    const { hx, hy, hr } = head(x, y, k);
    return (
      <g key={key}>
        {box(x, y, 0, 0.24 * k, 0.24 * k, 0.38 * k, ["#2a3340", "#232b36", "#1c232c"])}
        {box(x - 0.02 * k, y - 0.02 * k, 0.38 * k, 0.28 * k, 0.28 * k, 0.36 * k, [shirt, shirt, shirt])}
        <polygon
          points={pts(P(x + 0.26 * k, y - 0.02 * k, 0.38 * k), P(x + 0.26 * k, y + 0.26 * k, 0.38 * k), P(x + 0.26 * k, y + 0.26 * k, 0.74 * k), P(x + 0.26 * k, y - 0.02 * k, 0.74 * k))}
          fill="#000"
          opacity=".22"
        />
        <circle cx={hx} cy={hy} r={hr} fill={skin} />
        <path d={`M${hx - hr} ${hy - hr * 0.1} a${hr} ${hr} 0 0 1 ${hr * 2} 0 q-${hr} -${hr * 0.5} -${hr * 2} 0Z`} fill="#2a1f18" />
        {face && (
          <>
            <circle cx={hx - hr * 0.35} cy={hy + hr * 0.15} r={hr * 0.11} fill="#1b1410" />
            <circle cx={hx + hr * 0.35} cy={hy + hr * 0.15} r={hr * 0.11} fill="#1b1410" />
            <path d={`M${hx - hr * 0.3} ${hy + hr * 0.5} q${hr * 0.3} ${hr * 0.22} ${hr * 0.6} 0`} stroke="#1b1410" strokeWidth={hr * 0.1} fill="none" strokeLinecap="round" />
          </>
        )}
      </g>
    );
  };

  // glow: classe na luz do poste (para acender e apagar por CSS)
  const lamp = (x: number, y: number, key?: string, glow?: string) => {
    const [bx, by] = P(x, y, 0);
    const [tx, ty] = P(x, y, 1.6);
    return (
      <g key={key}>
        <line x1={bx} y1={by} x2={tx} y2={ty} stroke="#55534d" strokeWidth={0.07 * S} />
        <circle cx={tx} cy={ty} r={0.5 * S} fill="#f0c46a" opacity=".12" className={glow ?? "lp-halo"} />
        <circle cx={tx} cy={ty} r={0.11 * S} fill="#f6d58c" />
      </g>
    );
  };

  const cone = (x: number, y: number, key?: string) => {
    const [bx, by] = P(x, y, 0);
    const [tx, ty] = P(x, y, 0.42);
    const r = 0.13 * S;
    return (
      <g key={key}>
        <polygon points={`${bx - r},${by} ${bx + r},${by} ${tx},${ty}`} fill="#e27a3f" />
        <rect x={bx - r * 0.62} y={by - (by - ty) * 0.52} width={r * 1.24} height={(by - ty) * 0.14} fill="#f4efe4" />
      </g>
    );
  };

  return { S, P, pts, tile, box, quad, windows, house, tree, car, person, head, lamp, cone };
}

// Quadra base: chão escuro com a borda tracejada da cidade
export function Ground({ g, n = 10 }: { g: Iso; n?: number }) {
  return (
    <>
      {g.tile(0, 0, n, n, C.chao)}
      <polygon points={g.pts(g.P(0, 0), g.P(n, 0), g.P(n, n), g.P(0, n))} fill="none" stroke={C.faixa} strokeWidth={1.4} strokeDasharray="6 6" opacity=".8" />
    </>
  );
}

// Rua com faixa central tracejada
export function Road({ g, x, y, w, d }: { g: Iso; x: number; y: number; w: number; d: number }) {
  const alongX = w >= d;
  const a = alongX ? g.P(x, y + d / 2, 0.01) : g.P(x + w / 2, y, 0.01);
  const b = alongX ? g.P(x + w, y + d / 2, 0.01) : g.P(x + w / 2, y + d, 0.01);
  return (
    <>
      {g.tile(x, y, w, d, C.rua, 0.005)}
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#6d6a62" strokeWidth={1.2} strokeDasharray="5 6" />
    </>
  );
}
