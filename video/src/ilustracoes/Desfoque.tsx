// Cena da privacidade: duas pessoas na calçada e um carro com a placa à mostra. As áreas de rosto e de placa ficam
// exportadas (AREAS_DESFOQUE) para a cena desenhar as elipses suaves do app por cima. Placa sem letras.
import React from 'react';
import { CENA, COR } from '../tema';
import { Faixas, Janelas, Pessoa, deriva, onda } from './comum';

// Elipses em coordenadas da ilustração (300×400): rostos (folga maior em cima) e placa (justa), como lib/server/blur.ts
export const AREAS_DESFOQUE = [
  { cx: 96, cy: 196, rx: 15, ry: 18 },
  { cx: 148, cy: 204, rx: 14, ry: 17 },
  { cx: 214, cy: 318, rx: 26, ry: 10 },
];

export const Desfoque: React.FC<{ t: number; borrado?: number }> = ({ t, borrado = 0 }) => (
  <g>
    <Faixas cores={['#1a2334', '#202b3f', '#27344a', '#2f3e55']} ate={232} />
    <g transform={`translate(${deriva(t, -3).toFixed(1)} 0)`}>
      <rect x={-20} y={96} width={110} height={140} fill="#161d2b" />
      <Janelas x={-8} y={108} cols={5} rows={6} t={t} semente={4} gx={18} gy={20} w={8} h={10} />
      <rect x={196} y={70} width={124} height={166} fill="#131a27" />
      <Janelas x={208} y={82} cols={5} rows={7} t={t} semente={12} gx={20} gy={21} w={9} h={10} />
    </g>
    <rect x={-20} y={232} width={340} height={30} fill="#3a3f48" />
    <rect x={-20} y={262} width={340} height={150} fill="#2b2f36" />
    <rect x={-20} y={258} width={340} height={5} fill="#4d5461" />
    <Pessoa x={96} y={256} s={1.55} corpo="#b5523a" passo={onda(t, 2.8) * 0.15} />
    <Pessoa x={148} y={258} s={1.45} corpo="#3a5a8a" passo={onda(t, 2.8, 1) * 0.15} />
    <g transform={`translate(${(onda(t, 14) * 2).toFixed(1)} 0)`}>
      <rect x={150} y={276} width={136} height={50} rx={12} fill={CENA.creme} />
      <path d="M170 278 L186 248 H252 L270 278 Z" fill="#cfc6b8" />
      <path d="M180 278 L192 254 H246 L260 278 Z" fill="#2a3140" />
      <circle cx={178} cy={328} r={13} fill="#14161a" />
      <circle cx={258} cy={328} r={13} fill="#14161a" />
      <rect x={154} y={290} width={14} height={9} rx={3} fill="#fff2c4" />
      <rect x={188} y={308} width={52} height={20} rx={3} fill="#f4f4f4" />
      <rect x={188} y={308} width={52} height={6} rx={2} fill="#2f5fd0" />
    </g>
    {borrado > 0 && AREAS_DESFOQUE.map((a, i) => (
      <ellipse key={i} cx={a.cx} cy={a.cy} rx={a.rx * (0.6 + 0.4 * borrado)} ry={a.ry * (0.6 + 0.4 * borrado)} fill={i < 2 ? '#8f7f6c' : '#c9c9c9'} opacity={0.92 * borrado} />
    ))}
    <rect x={-20} y={362} width={340} height={50} fill={COR.bg} opacity={0.15} />
  </g>
);
