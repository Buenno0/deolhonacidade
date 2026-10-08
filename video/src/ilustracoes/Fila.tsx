// Fila no posto à noite: cobertura, bombas e carros vistos de trás, piscando a luz de freio (placa em branco).
import React from 'react';
import { CENA, COR } from '../tema';
import { escurecer } from '../miniatura/iso';
import { Faixas, onda, pisca } from './comum';

const CarroDeTras: React.FC<{ x: number; y: number; s: number; cor: string; freio: number }> = ({ x, y, s, cor, freio }) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s})`}>
    <circle cx={-45} cy={-33} r={20} fill="#e05a4a" opacity={0.18 * freio} />
    <circle cx={45} cy={-33} r={20} fill="#e05a4a" opacity={0.18 * freio} />
    <rect x={-62} y={-8} width={18} height={10} rx={3} fill="#0e0f12" />
    <rect x={44} y={-8} width={18} height={10} rx={3} fill="#0e0f12" />
    <path d="M-42 -46 L-32 -76 H32 L42 -46 Z" fill={escurecer(cor, 0.85)} />
    <path d="M-35 -49 L-27 -71 H27 L35 -49 Z" fill="#2a3140" />
    <rect x={-60} y={-48} width={120} height={42} rx={10} fill={cor} />
    <rect x={-56} y={-40} width={22} height={9} rx={3} fill="#e05a4a" opacity={0.65 + 0.35 * freio} />
    <rect x={34} y={-40} width={22} height={9} rx={3} fill="#e05a4a" opacity={0.65 + 0.35 * freio} />
    <rect x={-18} y={-28} width={36} height={11} rx={2} fill="#e9e1d0" />
  </g>
);

export const Fila: React.FC<{ t: number }> = ({ t }) => {
  const freio = (i: number) => 0.5 + 0.5 * onda(t, 3.5, i * 1.3);
  const carros = [
    { y: 250, s: 0.36, x: 152, cor: '#cfc6b8' },
    { y: 268, s: 0.5, x: 148, cor: '#6b7380' },
    { y: 296, s: 0.7, x: 153, cor: '#b5523a' },
    { y: 344, s: 1.0, x: 146, cor: '#3a5a8a' },
  ];
  return (
    <g>
      <Faixas cores={['#121821', '#161d28', '#1a222f', '#1f2835']} ate={232} />
      {[20, 60, 240, 280].map((x, i) => <circle key={x} cx={x} cy={226} r={2} fill={i % 2 ? '#fff2c4' : '#e05a4a'} opacity={pisca(t, i, 0.5, 0.4)} />)}
      <rect x={-20} y={232} width={340} height={180} fill="#262b33" />
      <polygon points="150,232 -60,412 360,412" fill="#2f353f" />
      <polygon points="150,232 146,232 60,412 72,412" fill="#3a3f48" />
      <polygon points="150,232 154,232 240,412 228,412" fill="#3a3f48" />
      <polygon points="-20,108 320,108 360,300 -60,300" fill="#333944" opacity={0.6} />
      <rect x={28} y={104} width={12} height={196} fill={COR.muted} />
      <rect x={260} y={104} width={12} height={196} fill={COR.muted} />
      {[[50, 196], [214, 196]].map(([x, y]) => (
        <g key={x}>
          <rect x={x} y={y} width={36} height={96} rx={4} fill={CENA.pedra} />
          <rect x={x + 6} y={y + 10} width={24} height={16} rx={2} fill={COR.ok} opacity={pisca(t, x, 0.7, 0.3)} />
          <rect x={x + 6} y={y + 34} width={24} height={6} rx={2} fill="#8a7d6a" />
          <path d={`M${x + 36} ${y + 50} q16 6 12 40`} fill="none" stroke="#1b1f26" strokeWidth={3} />
        </g>
      ))}
      <rect x={-20} y={56} width={340} height={40} fill={CENA.creme} />
      <rect x={-20} y={92} width={340} height={10} fill={COR.ok} />
      <rect x={-20} y={102} width={340} height={6} fill="#fff2c4" opacity={0.6} />
      {carros.map((c, i) => <CarroDeTras key={i} x={c.x} y={c.y} s={c.s} cor={c.cor} freio={freio(i)} />)}
    </g>
  );
};
