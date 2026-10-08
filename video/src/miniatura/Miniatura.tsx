// A cidade em miniatura, desenhada a partir do tempo t (s). As peças são ordenadas pela profundidade a cada quadro
// (os carros passam na frente e atrás dos prédios). O que vai no chão (ondas, raios) entra em `noChao`; pinos,
// bolhas e selos entram como filhos, por cima de tudo.
import React from 'react';
import { CENA, COR } from '../tema';
import { criarCidade, FILA_POSTO, LUGAR, type Forma } from './cidade';
import { escurecer, iso, LOOP_S, pts, TAU } from './iso';

const CIDADE = criarCidade();

const desenhar = (f: Forma, key: string | number) => React.createElement(f.el, { key, ...f.a });

function carro(id: string, x0: number, y0: number, x1: number, y1: number, dir: string, cor: string, opacity = 1) {
  const C = [cor, escurecer(cor, 0.8), escurecer(cor, 0.64)];
  const z0 = 1;
  const zt = 5;
  const emX = dir[0] === 'x';
  const [a0, a1, b0, b1] = emX ? [x0 + 0.09, x1 - 0.09, y0 + 0.03, y1 - 0.03] : [x0 + 0.03, x1 - 0.03, y0 + 0.09, y1 - 0.09];
  const frente = dir.endsWith('+');
  const luz = frente ? '#fff2c4' : '#e05a4a';
  const l1 = emX ? iso(x1, y0 + 0.05, 3) : iso(x0 + 0.05, y1, 3);
  const l2 = emX ? iso(x1, y1 - 0.05, 3) : iso(x1 - 0.05, y1, 3);
  return (
    <g key={id} opacity={opacity}>
      <polygon points={pts([iso(x0, y1, zt), iso(x1, y1, zt), iso(x1, y1, z0), iso(x0, y1, z0)])} fill={C[1]} />
      <polygon points={pts([iso(x1, y0, zt), iso(x1, y1, zt), iso(x1, y1, z0), iso(x1, y0, z0)])} fill={C[2]} />
      <polygon points={pts([iso(x0, y0, zt), iso(x1, y0, zt), iso(x1, y1, zt), iso(x0, y1, zt)])} fill={C[0]} />
      <polygon points={pts([iso(a0, b1, zt + 3), iso(a1, b1, zt + 3), iso(a1, b1, zt), iso(a0, b1, zt)])} fill="#232830" />
      <polygon points={pts([iso(a1, b0, zt + 3), iso(a1, b1, zt + 3), iso(a1, b1, zt), iso(a1, b0, zt)])} fill="#1b1f26" />
      <polygon points={pts([iso(a0, b0, zt + 3), iso(a1, b0, zt + 3), iso(a1, b1, zt + 3), iso(a0, b1, zt + 3)])} fill="#3a4250" />
      <circle cx={l1[0].toFixed(1)} cy={l1[1].toFixed(1)} r={1.3} fill={luz} />
      <circle cx={l2[0].toFixed(1)} cy={l2[1].toFixed(1)} r={1.3} fill={luz} />
    </g>
  );
}

const cl01 = (v: number) => Math.max(0, Math.min(1, v));

export type PropsMiniatura = {
  t: number;
  chuva?: number; // 0 a 1
  acesa?: number; // luz das janelas e dos fios (0 a 1)
  noChao?: React.ReactNode;
  children?: React.ReactNode;
};

export const Miniatura: React.FC<PropsMiniatura> = ({ t, chuva = 0, acesa = 1, noChao, children }) => {
  const itens: Array<{ chave: number; id: string; no: React.ReactNode }> = [];
  for (const p of CIDADE.pecas) {
    itens.push({
      chave: p.chave,
      id: 'p' + p.id,
      no: (
        <g key={'p' + p.id}>
          {p.formas.map(desenhar)}
          {p.janelas.map((j, i) => (
            <polygon key={'j' + i} points={j.pontos} fill={j.cor} opacity={j.acesa ? (0.5 + 0.4 * (0.5 + 0.5 * Math.sin((TAU * t) / j.periodo + j.fase))) * acesa : 0.08} />
          ))}
        </g>
      ),
    });
  }
  FILA_POSTO.forEach((c, i) => {
    itens.push({ chave: (c.x * 2 + 0.36 + c.y * 2 + 0.2) / 2, id: 'f' + i, no: carro('f' + i, c.x, c.y, c.x + 0.36, c.y + 0.2, 'x+', c.cor) });
  });
  CIDADE.faixas.forEach((f, i) => {
    const u = (((t / LOOP_S) * f.voltas + f.fase) % 1 + 1) % 1;
    const s = f.dir.endsWith('+') ? -0.6 + u * 9.2 : 8.6 - u * 9.2 - 0.36;
    const m = s + 0.18;
    const op = cl01((m + 0.3) / 0.5) * cl01((8.1 - m) / 0.5);
    if (op <= 0) return;
    const [x0, y0, x1, y1] = f.dir[0] === 'x' ? [s, f.c - 0.1, s + 0.36, f.c + 0.1] : [f.c - 0.1, s, f.c + 0.1, s + 0.36];
    itens.push({ chave: (x0 + x1 + y0 + y1) / 2, id: 'c' + i, no: carro('c' + i, x0, y0, x1, y1, f.dir, f.cor, op) });
  });
  itens.sort((a, b) => a.chave - b.chave || (a.id < b.id ? -1 : 1));

  // guindaste: a lança gira devagar e emenda no loop
  const giro = -1.27 + 0.3 * Math.sin((TAU * t) / LOOP_S);
  const [c, s] = [Math.cos(giro), Math.sin(giro)];
  const [mx, my, mz] = [7.35, 0.7, 100];
  const topo = iso(mx, my, mz);
  const ponta = iso(mx + 1.9 * c, my + 1.9 * s, mz);
  const contra = iso(mx - 0.55 * c, my - 0.55 * s, mz);
  const gancho = iso(mx + 1.45 * c, my + 1.45 * s, mz);
  const carga = iso(mx + 1.45 * c, my + 1.45 * s, 62);

  const az = iso(LUGAR.catedral.x, LUGAR.catedral.y, 86);
  const brilhoAz = ((t % 7) - 5.6) / 0.8;
  const poca = iso(LUGAR.poca.x, LUGAR.poca.y);

  return (
    <g>
      <defs>
        <clipPath id="clip-azulejo"><rect x={-13} y={-13} width={26} height={26} rx={6} /></clipPath>
      </defs>
      <g>
        {CIDADE.chao.map(desenhar)}
        <ellipse cx={poca[0]} cy={poca[1]} rx={22} ry={8} fill={CENA.agua} opacity={0.9 * chuva} />
        {chuva > 0 && [0, 1, 2].map((i) => {
          const q = (t * 1.4 + i / 3) % 1;
          return <ellipse key={i} cx={poca[0]} cy={poca[1]} rx={q * 18} ry={q * 6} fill="none" stroke={CENA.aguaClara} strokeWidth={0.8} opacity={chuva * (1 - q) * 0.8} />;
        })}
        {noChao}
      </g>
      <g>{itens.map((i) => i.no)}</g>
      <g>
        <g transform={`translate(${az[0].toFixed(1)} ${az[1].toFixed(1)})`}>
          <line x1={0} y1={16} x2={0} y2={48} stroke={COR.accent} strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
          <polygon points="-4,12.5 4,12.5 0,18" fill={COR.marcoInk} />
          <rect x={-13} y={-13} width={26} height={26} rx={6} fill={COR.marco} stroke={COR.marcoInk} strokeWidth={2} />
          <rect x={-10.5} y={-10.5} width={21} height={21} rx={4} fill="none" stroke={COR.accent} strokeWidth={1} />
          <path d="M0 -8 V-3.5 M-2.2 -5.8 H2.2 M-6 7 V0.5 L0 -3 L6 0.5 V7 Z M-1.6 7 V3.5 H1.6 V7" fill="none" stroke={COR.marcoInk} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          {brilhoAz > 0 && brilhoAz < 1 && (
            <g clipPath="url(#clip-azulejo)">
              <polygon points="-20,-14 -13,-14 -21,14 -28,14" fill="rgba(255,232,180,.7)" transform={`translate(${(56 * brilhoAz).toFixed(1)} 0)`} />
            </g>
          )}
        </g>
        <line x1={topo[0]} y1={topo[1]} x2={ponta[0]} y2={ponta[1]} stroke={COR.warn} strokeWidth={2.2} strokeLinecap="round" />
        <line x1={topo[0]} y1={topo[1]} x2={contra[0]} y2={contra[1]} stroke="#c08f3a" strokeWidth={2.2} strokeLinecap="round" />
        <rect x={contra[0] - 4} y={contra[1] - 1} width={8} height={6} fill="#6b7380" />
        <line x1={gancho[0]} y1={gancho[1]} x2={carga[0]} y2={carga[1]} stroke="#cfc6b8" strokeWidth={0.8} />
        <rect x={carga[0] - 4.5} y={carga[1]} width={9} height={6} fill={COR.muted} />
        <circle cx={topo[0]} cy={topo[1] - 3} r={2.2} fill={COR.danger} opacity={t % 2 < 1 ? 1 : 0.25} />
        {CIDADE.fios.map(desenhar)}
        {CIDADE.luzes.map((l, i) => (
          <circle key={i} cx={l.x.toFixed(1)} cy={l.y.toFixed(1)} r={1.6} fill={CENA.luz} opacity={(0.55 + 0.45 * (0.5 + 0.5 * Math.sin((TAU * t * 3) / LOOP_S + l.fase))) * acesa} />
        ))}
        {chuva > 0 && (
          <>
            {CIDADE.gotas.map((d, i) => {
              const z = 70 - ((t * 90 + d.o) % 70);
              const a = iso(d.x, d.y, z);
              const b = iso(d.x, d.y, z + 7);
              return <line key={i} x1={a[0].toFixed(1)} y1={a[1].toFixed(1)} x2={b[0].toFixed(1)} y2={b[1].toFixed(1)} stroke={CENA.aguaClara} strokeWidth={1} opacity={0.75 * chuva} />;
            })}
          </>
        )}
      </g>
      {children}
    </g>
  );
};
