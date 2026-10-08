// Feira à noite: barracas de lona listrada, fio de luzes, gente passando (sem rosto).
import React from 'react';
import { COR } from '../tema';
import { Faixas, FioDeLuzes, Janelas, Pessoa, deriva, onda } from './comum';

const Barraca: React.FC<{ x0: number; x1: number; topo: number; cores: [string, string]; frutas: string[]; chao: number }> = ({ x0, x1, topo, cores, frutas, chao }) => {
  const n = 6;
  const base = topo + 28;
  const largura = x1 - x0 + 20;
  const cols = Math.floor((x1 - x0 - 6) / 13);
  return (
    <g>
      <rect x={x0} y={base} width={x1 - x0} height={chao - base - 34} fill="#241a16" />
      <line x1={x0} y1={base} x2={x0} y2={chao} stroke="#a99a84" strokeWidth={3} />
      <line x1={x1} y1={base} x2={x1} y2={chao} stroke="#a99a84" strokeWidth={3} />
      <line x1={(x0 + x1) / 2} y1={base} x2={(x0 + x1) / 2} y2={base + 15} stroke="#4d5461" strokeWidth={1.2} />
      <circle cx={(x0 + x1) / 2} cy={base + 19} r={5} fill="#ffd98a" />
      {Array.from({ length: n }, (_, k) => {
        const ta = x0 + ((x1 - x0) * k) / n;
        const tb = x0 + ((x1 - x0) * (k + 1)) / n;
        const a = x0 - 10 + (largura * k) / n;
        const b = x0 - 10 + (largura * (k + 1)) / n;
        return <polygon key={k} points={`${ta},${topo} ${tb},${topo} ${b},${base} ${a},${base}`} fill={cores[k % 2]} />;
      })}
      {Array.from({ length: n * 2 }, (_, k) => {
        const w = largura / (n * 2);
        const cx = x0 - 10 + w * (k + 0.5);
        return <path key={k} d={`M${(cx - w / 2).toFixed(1)},${base} a${(w / 2).toFixed(1)},${(w / 2.2).toFixed(1)} 0 0 0 ${w.toFixed(1)},0 Z`} fill={cores[Math.floor(k / 2) % 2]} />;
      })}
      <rect x={x0 - 4} y={chao - 34} width={x1 - x0 + 8} height={34} fill="#5a3e2b" />
      <rect x={x0 - 4} y={chao - 34} width={x1 - x0 + 8} height={6} fill="#6b4a33" />
      {Array.from({ length: cols * 2 }, (_, i) => (
        <circle key={i} cx={x0 + 9 + (i % cols) * 13 + (i >= cols ? 6 : 0)} cy={chao - 40 - (i >= cols ? 8 : 0)} r={6} fill={frutas[(i * 7) % frutas.length]} />
      ))}
    </g>
  );
};

// Gente atravessando: k travessias por loop de 14 s (emenda no hero)
const passante = (t: number, k: number, fase: number, direita: boolean) => {
  const u = ((t / 14) * k + fase) % 1;
  return direita ? -50 + u * 400 : 350 - u * 400;
};

export const Feira: React.FC<{ t: number }> = ({ t }) => {
  const passo = (f: number) => onda(t, 0.7, f);
  return (
    <g>
      <Faixas cores={['#10152a', '#141b35', '#19223f', '#1f2a4a']} ate={240} />
      <g transform={`translate(${deriva(t, -4).toFixed(1)} 0)`}>
        <rect x={-30} y={140} width={95} height={110} fill="#0d1224" />
        <Janelas x={-18} y={152} cols={5} rows={5} t={t} semente={3} />
        <rect x={70} y={112} width={70} height={140} fill="#0b1020" />
        <Janelas x={80} y={124} cols={4} rows={7} t={t} semente={7} />
        <rect x={198} y={128} width={58} height={125} fill="#0d1224" />
        <Janelas x={206} y={140} cols={3} rows={6} t={t} semente={11} />
        <rect x={250} y={158} width={80} height={95} fill="#0b1020" />
      </g>
      <rect x={-20} y={240} width={340} height={170} fill="#2a2420" />
      <rect x={-20} y={240} width={340} height={5} fill="#3a302a" />
      <FioDeLuzes x0={-20} y0={86} x1={320} y1={80} flecha={30} n={12} t={t} />
      <g transform={`translate(${deriva(t, 3).toFixed(1)} 0)`}>
        <Barraca x0={14} x1={140} topo={128} cores={[COR.danger, COR.ink]} frutas={[COR.danger, COR.warn, COR.ok, '#b5523a']} chao={286} />
        <Barraca x0={162} x1={288} topo={136} cores={[COR.warn, COR.ink]} frutas={[COR.ok, '#9fb7a4', COR.warn, COR.danger]} chao={290} />
      </g>
      <Pessoa x={passante(t, 1, 0.1, false)} y={318} s={1.0} corpo="#b5523a" passo={passo(0)} />
      <Pessoa x={passante(t, 2, 0.55, true)} y={326} s={1.05} corpo={COR.ok} passo={passo(1.3)} />
      <Pessoa x={passante(t, 1, 0.62, true)} y={334} s={1.15} corpo="#3a5a8a" passo={passo(2.1)} />
      <g transform={`translate(${deriva(t, 9).toFixed(1)} 0)`}>
        <rect x={-14} y={346} width={96} height={70} fill="#6b4a33" />
        <rect x={-14} y={346} width={96} height={8} fill="#7d5a40" />
        <rect x={-14} y={372} width={96} height={4} fill="#5a3e2b" />
        {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={2 + i * 13} cy={340 - (i % 2) * 4} r={8} fill={[COR.danger, COR.warn, COR.ok][i % 3]} />)}
        {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={8 + i * 13} cy={330 - (i % 2) * 3} r={7} fill={[COR.warn, COR.danger, '#b5523a'][i % 3]} />)}
      </g>
    </g>
  );
};
