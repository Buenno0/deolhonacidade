// "Seu Comércio": o café de exemplo da Divulgação (nome genérico, nunca um comércio real). Fachada com toldo
// listrado, vitrine acesa, mesinha na calçada com vapor subindo.
import React from 'react';
import { ARCHIVO } from '../fontes';
import { CENA, COR } from '../tema';
import { Faixas, Pessoa, deriva, onda, pisca } from './comum';

export const SeuComercio: React.FC<{ t: number }> = ({ t }) => {
  const passa = ((t / 14) * 1 + 0.35) % 1;
  return (
    <g>
      <Faixas cores={['#24192a', '#33212f', '#462a33', '#5a3436']} ate={150} />
      <g transform={`translate(${deriva(t, -3).toFixed(1)} 0)`}>
        <rect x={-30} y={60} width={70} height={120} fill="#2a1d24" />
        <rect x={262} y={74} width={70} height={110} fill="#2a1d24" />
      </g>
      <rect x={20} y={96} width={260} height={238} fill="#b5523a" />
      <rect x={20} y={96} width={260} height={8} fill="#c66447" />
      <rect x={52} y={106} width={196} height={40} rx={4} fill={COR.accent} />
      <text x={150} y={134} textAnchor="middle" fill={COR.accentInk} fontFamily={ARCHIVO} fontWeight={700} fontSize={21} letterSpacing="0.06em">SEU COMÉRCIO</text>
      {Array.from({ length: 8 }, (_, k) => (
        <polygon key={k} points={`${20 + k * 32.5},158 ${52.5 + k * 32.5},158 ${58 + k * 33.5},196 ${16 + k * 33.5},196`} fill={k % 2 ? COR.ink : COR.danger} />
      ))}
      {Array.from({ length: 16 }, (_, k) => (
        <path key={k} d={`M${16 + k * 16.75},196 a8.4,8 0 0 0 16.75,0 Z`} fill={Math.floor(k / 2) % 2 ? COR.ink : COR.danger} />
      ))}
      <rect x={38} y={214} width={142} height={104} fill={CENA.luzJanela} opacity={pisca(t, 1, 0.85, 0.1)} />
      <rect x={38} y={214} width={142} height={104} fill="none" stroke="#6e3324" strokeWidth={6} />
      <line x1={109} y1={214} x2={109} y2={318} stroke="#6e3324" strokeWidth={4} />
      <rect x={52} y={262} width={44} height={6} fill="#8a4a2c" />
      <rect x={122} y={262} width={44} height={6} fill="#8a4a2c" />
      <circle cx={66} cy={256} r={6} fill="#5a3e2b" />
      <circle cx={140} cy={256} r={6} fill="#5a3e2b" />
      <rect x={198} y={222} width={64} height={112} fill="#3a2a1f" />
      <rect x={198} y={222} width={64} height={112} fill="none" stroke="#6e3324" strokeWidth={5} />
      <circle cx={250} cy={282} r={3.5} fill={COR.accent} />
      <rect x={-20} y={334} width={340} height={80} fill="#2a2420" />
      <rect x={-20} y={334} width={340} height={5} fill="#3a302a" />
      <g transform={`translate(${deriva(t, 6).toFixed(1)} 0)`}>
        <rect x={24} y={350} width={56} height={6} rx={3} fill="#8a7d6a" />
        <rect x={49} y={356} width={6} height={36} fill="#8a7d6a" />
        <rect x={38} y={338} width={14} height={12} rx={2} fill={CENA.creme} />
        {[0, 1, 2].map((i) => {
          const u = ((t / 14) * 7 + i / 3) % 1;
          return <path key={i} d={`M${44 + onda(t, 14 / 7, i) * 2} ${334 - u * 30} q4 -6 0 -12`} fill="none" stroke={CENA.creme} strokeWidth={1.6} opacity={(1 - u) * 0.7} />;
        })}
        <rect x={236} y={300} width={34} height={46} rx={3} fill="#1d2025" stroke="#8a7d6a" strokeWidth={3} />
        <rect x={262} y={330} width={10} height={14} rx={2} fill="#4a3324" />
        <circle cx={267} cy={322} r={11} fill={CENA.folha} />
      </g>
      <Pessoa x={-60 + passa * 420} y={384} s={1.1} corpo="#3a5a8a" passo={onda(t, 0.7)} />
    </g>
  );
};
