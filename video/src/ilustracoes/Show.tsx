// Show na praça: coreto iluminado, fachos de luz varrendo, plateia balançando no tempo (sem rosto).
import React from 'react';
import { CENA, COR } from '../tema';
import { Arvore, Faixas, FioDeLuzes, onda, pisca } from './comum';

// ~103 BPM: 24 batidas em 14 s, para o hero emendar
const BATIDA = 14 / 24;

export const Show: React.FC<{ t: number }> = ({ t }) => {
  const pulo = (i: number) => Math.max(0, onda(t, BATIDA, i * 0.9));
  return (
    <g>
      <Faixas cores={['#0d1126', '#11162f', '#141a36', '#18203f']} ate={262} />
      {[[30, 40], [80, 22], [240, 36], [270, 70], [200, 18], [120, 58]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} fill={COR.ink} opacity={pisca(t, i, 0.4, 0.5)} />
      ))}
      <g opacity={0.2}>
        {[-1, 1].map((s) => (
          <polygon key={s} points="150,178 112,-40 188,-40" fill={CENA.luz} transform={`rotate(${(s * 24 + onda(t, 14 / 4, s) * 14).toFixed(1)} 150 178)`} />
        ))}
      </g>
      <Arvore x={22} y={200} r={34} escura />
      <Arvore x={284} y={196} r={38} escura />
      <rect x={-20} y={262} width={340} height={150} fill="#1b2620" />
      <rect x={70} y={258} width={160} height={14} fill={CENA.creme} />
      <rect x={78} y={272} width={144} height={10} fill="#cfc6b8" />
      <rect x={88} y={206} width={124} height={52} fill={CENA.luz} opacity={0.3} />
      {[92, 124, 171, 203].map((x) => <rect key={x} x={x} y={204} width={6} height={54} fill={CENA.creme} />)}
      <rect x={88} y={238} width={124} height={4} fill={CENA.creme} />
      <polygon points="74,208 226,208 150,158" fill={CENA.telha} />
      <polygon points="150,158 226,208 150,208" fill={CENA.telhaEscura} />
      <rect x={74} y={206} width={152} height={6} fill="#86502a" />
      <circle cx={150} cy={154} r={4} fill={COR.accent} />
      <FioDeLuzes x0={150} y0={164} x1={-20} y1={150} flecha={20} n={6} t={t} />
      <FioDeLuzes x0={150} y0={164} x1={320} y1={150} flecha={20} n={6} t={t} fase={3} />
      {Array.from({ length: 9 }, (_, i) => {
        const x = 8 + i * 36;
        const y = 312 - pulo(i) * 5;
        return (
          <g key={`a${i}`}>
            <rect x={x - 15} y={y} width={30} height={60} rx={13} fill="#262b3b" />
            <circle cx={x} cy={y - 8} r={10} fill="#323849" />
          </g>
        );
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const x = 26 + i * 36;
        const y = 350 - pulo(i + 4) * 6;
        const mao = i === 2 || i === 6;
        return (
          <g key={`b${i}`}>
            {mao && <rect x={x + 8} y={y - 46} width={7} height={34} rx={3.5} fill="#1d2130" transform={`rotate(${(12 + pulo(i) * 10).toFixed(1)} ${x + 11} ${y - 12})`} />}
            <rect x={x - 17} y={y} width={34} height={60} rx={15} fill="#1a1e2b" />
            <circle cx={x} cy={y - 9} r={11} fill="#262b3a" />
          </g>
        );
      })}
    </g>
  );
};
