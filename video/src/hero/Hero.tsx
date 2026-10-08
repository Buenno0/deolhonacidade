// Hero da LP: 14 s em loop, sem texto e sem áudio. A cidade em miniatura acorda com fotos pousando, uma vira
// "Em alta", alguém pergunta "Alguém aí?" e a resposta chega, chove, uma obra some quando o tempo acaba, o trânsito
// aparece "Agora", e tudo esvazia para o último quadro emendar no primeiro.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import '../fontes';
import { Bolha, OndasAviso } from '../miniatura/Bolha';
import { LUGAR } from '../miniatura/cidade';
import { cl, LOOP_S, TAU } from '../miniatura/iso';
import { Miniatura } from '../miniatura/Miniatura';
import { Pino, type SpecPino } from '../miniatura/Pino';
import { COR } from '../tema';

const SAIDA = 12.6;

export const PINOS_HERO: SpecPino[] = [
  { id: 'feira', ...LUGAR.feira, H: 66, sev: 'acc', foto: 'feira', t0: 0.6, f0: 0.95, f1: 0.8, agora: [0.6, 6.0], saida: SAIDA },
  { id: 'obra', ...LUGAR.obra, H: 84, sev: 'warn', foto: 'obra', t0: 1.8, f0: 0.34, f1: 0, fim: 9.0 },
  { id: 'show', ...LUGAR.coreto, H: 52, sev: 'acc', foto: 'show', t0: 3.0, f0: 0.97, f1: 0.85, alta: 5.2, saida: SAIDA },
  { id: 'fila', ...LUGAR.posto, H: 66, sev: 'acc', foto: 'fila', t0: 6.2, f0: 0.98, f1: 0.9, estouro: true, saida: SAIDA },
  { id: 'alagamento', ...LUGAR.alagamento, H: 60, sev: 'warn', foto: 'alagamento', t0: 7.6, f0: 0.97, f1: 0.9, saida: SAIDA },
  { id: 'transito', ...LUGAR.transito, H: 58, sev: 'warn', foto: 'transito', t0: 10.0, f0: 0.99, f1: 0.96, agora: [10.0, SAIDA], saida: SAIDA },
];

// Na vertical o quadro mostra só o miolo da cidade: os pinos ficam perto do centro e o da feira põe o selo à esquerda
export const PINOS_HERO_VERTICAL: SpecPino[] = [
  { id: 'feira', ...LUGAR.feira, H: 66, sev: 'acc', foto: 'feira', t0: 0.6, f0: 0.95, f1: 0.8, agora: [0.6, 6.0], saida: SAIDA, seloEsquerda: true },
  { id: 'transito', x: 2.5, y: 4.4, H: 70, sev: 'warn', foto: 'transito', t0: 1.8, f0: 0.34, f1: 0, fim: 9.0 },
  { id: 'show', ...LUGAR.coreto, H: 52, sev: 'acc', foto: 'show', t0: 3.0, f0: 0.97, f1: 0.85, alta: 5.2, saida: SAIDA },
  { id: 'fila', ...LUGAR.posto, H: 66, sev: 'acc', foto: 'fila', t0: 6.2, f0: 0.98, f1: 0.9, estouro: true, saida: SAIDA },
  { id: 'alagamento', ...LUGAR.alagamento, H: 60, sev: 'warn', foto: 'alagamento', t0: 7.6, f0: 0.97, f1: 0.9, saida: SAIDA },
  { id: 'obra', x: 4.6, y: 5.3, H: 58, sev: 'warn', foto: 'obra', t0: 10.0, f0: 0.99, f1: 0.96, agora: [10.0, SAIDA], saida: SAIDA },
];

export type Camera = { cx: number; cy: number; altura: number };

export const viewBox = (c: Camera, largura: number, altura: number) => {
  const w = (c.altura * largura) / altura;
  return `${(c.cx - w / 2).toFixed(2)} ${(c.cy - c.altura / 2).toFixed(2)} ${w.toFixed(2)} ${c.altura.toFixed(2)}`;
};

// A câmera deriva e respira; na vertical ela passeia de um lado a outro da cidade. Tudo com período de 14 s.
const cameraHero = (t: number, vertical: boolean): Camera => {
  const a = (TAU * t) / LOOP_S;
  return vertical
    ? { cx: 345 + 4 * Math.sin(a), cy: 200 + 4 * Math.sin(a + 1.3), altura: 470 / (1 + 0.02 * Math.sin(a + 0.7)) }
    : { cx: 340 + 6 * Math.sin(a), cy: 198 + 3 * Math.sin(a + 1.3), altura: 360 / (1 + 0.02 * Math.sin(a + 0.7)) };
};

export const DefsMiniatura: React.FC = () => (
  <defs>
    <clipPath id="clip-foto-pino"><circle cx={0} cy={0} r={15.5} /></clipPath>
  </defs>
);

export const Hero: React.FC<{ formato: 'horizontal' | 'vertical' }> = ({ formato }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = (frame / fps) % LOOP_S;
  const chuva = cl((t - 7) / 0.5) * cl((12.5 - t) / 0.5);
  const camera = cameraHero(t, formato === 'vertical');
  return (
    <AbsoluteFill style={{ background: COR.bg }}>
      <svg width={width} height={height} viewBox={viewBox(camera, width, height)}>
        <DefsMiniatura />
        <Miniatura t={t} chuva={chuva} noChao={<OndasAviso x={LUGAR.posto.x} y={LUGAR.posto.y} t={t} inicios={[4.5, 5.05]} />}>
          {(formato === 'vertical' ? PINOS_HERO_VERTICAL : PINOS_HERO).map((p) => <Pino key={p.id} p={p} t={t} />)}
          <Bolha x={LUGAR.posto.x} y={LUGAR.posto.y} H={66} t={t} de={4.2} ate={6.0} rotuloDx={formato === 'vertical' ? 24 : 0} />
        </Miniatura>
      </svg>
    </AbsoluteFill>
  );
};
