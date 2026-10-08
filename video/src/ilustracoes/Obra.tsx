// Obra ao entardecer: guindaste girando a lança, carga balançando, esqueleto do prédio, cavalete e cones.
import React from 'react';
import { COR } from '../tema';
import { Faixas, deriva, onda, pisca } from './comum';

export const Obra: React.FC<{ t: number }> = ({ t }) => {
  const giro = onda(t, 14) * 0.55;
  const comp = Math.cos(giro);
  const topoX = 78;
  const topoY = 64;
  const ganchoX = topoX + 165 * comp;
  const balanco = onda(t, 14 / 5) * 6;
  const piscaAviso = (t % 2) < 1 ? 1 : 0.25;
  return (
    <g>
      <Faixas cores={['#1c2230', '#232a39', '#2b3343', '#343d4f', '#3f4859']} ate={262} />
      <g transform={`translate(${deriva(t, -3).toFixed(1)} 0)`}>
        {[150, 186, 222].map((y, i) => <rect key={y} x={150} y={y + 6} width={134} height={30} fill="#3a3f48" opacity={i === 0 ? 0 : 0.9} />)}
        {[150, 186, 222, 258].map((y) => <rect key={y} x={146} y={y} width={142} height={6} fill="#5a616d" />)}
        {[150, 194, 238, 282].map((x) => <rect key={x} x={x - 2} y={150} width={5} height={112} fill="#8a919c" />)}
        <rect x={160} y={196} width={20} height={20} fill="#f2c879" opacity={pisca(t, 2, 0.5, 0.3)} />
      </g>
      <g>
        <rect x={topoX - 8} y={topoY} width={4} height={200} fill={COR.warn} />
        <rect x={topoX + 4} y={topoY} width={4} height={200} fill="#c08f3a" />
        {Array.from({ length: 13 }, (_, i) => (
          <line key={i} x1={topoX - 6} y1={topoY + 8 + i * 15} x2={topoX + 6} y2={topoY + 23 + i * 15} stroke={COR.warn} strokeWidth={1.6} />
        ))}
        <rect x={topoX - 14} y={topoY - 12} width={22} height={14} fill={COR.warn} />
        <rect x={topoX - 10} y={topoY - 9} width={9} height={7} fill="#2a3140" />
        <line x1={topoX} y1={topoY} x2={ganchoX + 30 * comp} y2={topoY} stroke={COR.warn} strokeWidth={6} />
        <line x1={topoX} y1={topoY - 3} x2={topoX - 58 * comp} y2={topoY - 3} stroke="#c08f3a" strokeWidth={6} />
        <rect x={topoX - 58 * comp - 12} y={topoY - 6} width={16} height={18} fill="#6b7380" />
        <line x1={ganchoX} y1={topoY} x2={ganchoX + balanco} y2={150} stroke="#cfc6b8" strokeWidth={1.4} />
        <g transform={`translate(${(ganchoX + balanco).toFixed(1)} 150) rotate(${(balanco * 0.8).toFixed(1)})`}>
          <rect x={-26} y={0} width={52} height={9} fill={COR.muted} />
          <rect x={-26} y={0} width={52} height={3} fill="#cfc6b8" />
        </g>
        <circle cx={topoX - 3} cy={topoY - 16} r={3.5} fill={COR.danger} opacity={piscaAviso} />
      </g>
      <rect x={-20} y={262} width={340} height={150} fill="#2a2d33" />
      <rect x={-20} y={262} width={340} height={5} fill="#3a3f48" />
      {Array.from({ length: 9 }, (_, i) => {
        const u = ((t / 14) * (i % 2 ? 2 : 1) + i * 0.17) % 1;
        return <circle key={i} cx={20 + i * 33 + u * 30} cy={290 - u * 70} r={2.2} fill="#a99a84" opacity={(1 - u) * 0.5} />;
      })}
      <g transform={`translate(${deriva(t, 8).toFixed(1)} 0)`}>
        <rect x={52} y={322} width={6} height={60} fill="#cfc6b8" />
        <rect x={214} y={322} width={6} height={60} fill="#cfc6b8" />
        {Array.from({ length: 8 }, (_, k) => <rect key={k} x={36 + k * 25} y={300} width={25} height={24} fill={k % 2 ? COR.accentInk : COR.warn} />)}
        <rect x={36} y={300} width={200} height={3} fill="#f4efe4" opacity={0.25} />
        <circle cx={44} cy={292} r={8} fill={COR.warn} opacity={0.35 + 0.65 * piscaAviso} />
        <rect x={40} y={292} width={8} height={8} fill="#6b7380" />
        <polygon points="250,382 286,382 268,318" fill={COR.danger} />
        <polygon points="257,358 279,358 275,346 261,346" fill={COR.ink} />
        <polygon points="-2,388 30,388 14,330" fill={COR.danger} />
        <polygon points="4,366 24,366 20,354 8,354" fill={COR.ink} />
      </g>
    </g>
  );
};
