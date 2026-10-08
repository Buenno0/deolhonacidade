// "Alguém aí?": a bolha tracejada do app (raio 14 14 14 4, borda tracejada no acento) e o aviso que se espalha
// pelo chão até quem está perto (as ondas vão no chão, por baixo dos prédios).
import React from 'react';
import { MONO } from '../fontes';
import { COR } from '../tema';
import { cl, elipseChao, iso, outBack, outCubic } from './iso';

export const Bolha: React.FC<{ x: number; y: number; H: number; t: number; de: number; ate: number; rotuloDx?: number }> = ({ x, y, H, t, de, ate, rotuloDx = 0 }) => {
  if (t < de || t >= ate + 0.35) return null;
  const [ax, ay] = iso(x, y);
  const a = cl((t - de) / 0.4);
  const e = outBack(a);
  const s = cl((t - ate) / 0.3);
  const escala = (0.6 + 0.4 * e) * (1 - 0.5 * s);
  const op = cl(a * 2.2) * (1 - s);
  return (
    <g transform={`translate(${ax.toFixed(1)} ${ay.toFixed(1)})`} opacity={op}>
      <line x1={0} y1={0} x2={0} y2={-(H - 22)} stroke={COR.accent} strokeWidth={1.2} strokeDasharray="2 3" opacity={0.75} />
      <g transform={`translate(0 ${(-H - 22 * (1 - e)).toFixed(2)}) scale(${escala.toFixed(4)})`}>
        <path d="M-9 -19 H9 A14 14 0 0 1 23 -5 V5 A14 14 0 0 1 9 19 H-19 A4 4 0 0 1 -23 15 V-5 A14 14 0 0 1 -9 -19 Z" fill="rgba(12,10,8,.92)" stroke={COR.accent} strokeWidth={2} strokeDasharray="4 3" />
        <text x={0} y={7} textAnchor="middle" fill={COR.accent} fontFamily={MONO} fontSize={20} fontWeight={500}>?</text>
        <g transform={`translate(${rotuloDx} -34)`}>
          <rect x={-42} y={-10} width={84} height={20} rx={10} fill="rgba(12,10,8,.88)" stroke={COR.line} strokeWidth={1} />
          <text x={0} y={4} textAnchor="middle" fill={COR.ink} fontFamily={MONO} fontSize={11} fontWeight={500}>Alguém aí?</text>
        </g>
      </g>
    </g>
  );
};

// Ondas no chão: o pedido chegando a quem está a até 1 km (raio em unidades de quadra)
export const OndasAviso: React.FC<{ x: number; y: number; t: number; inicios: number[]; raio?: number; duracao?: number }> = ({ x, y, t, inicios, raio = 1.9, duracao = 1.3 }) => {
  const [cx, cy] = iso(x, y);
  return (
    <>
      {inicios.map((ini) => {
        const p = cl((t - ini) / duracao);
        if (p <= 0 || p >= 1) return null;
        const { rx, ry } = elipseChao(raio * outCubic(p));
        return <ellipse key={ini} cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={COR.accent} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.85 * (1 - p)} />;
      })}
    </>
  );
};
