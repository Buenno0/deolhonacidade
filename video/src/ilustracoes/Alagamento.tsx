// Rua alagada debaixo de chuva: casas, poste, reflexos tremendo na água, gotas e ondinhas (sem drama).
import React from 'react';
import { CENA, COR } from '../tema';
import { Faixas, Janelas, onda } from './comum';

const sorteio = (i: number, k: number) => {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

export const Alagamento: React.FC<{ t: number }> = ({ t }) => {
  // 19 quedas da tela inteira em 14 s: emenda no loop
  const velocidade = (440 * 19) / 14;
  return (
    <g>
      <Faixas cores={['#111926', '#141e2c', '#172334', '#1b2a3a']} ate={238} />
      <polygon points="-20,238 -20,160 30,128 80,160 80,238" fill="#0f1620" />
      <Janelas x={4} y={176} cols={3} rows={3} t={t} semente={5} gx={20} gy={20} w={10} h={11} />
      <polygon points="74,238 74,148 128,116 182,148 182,238" fill="#0d131c" />
      <Janelas x={90} y={160} cols={4} rows={3} t={t} semente={9} gx={22} gy={22} w={10} h={12} />
      <polygon points="176,238 176,170 222,140 268,170 268,238" fill="#0f1620" />
      <rect x={262} y={150} width={60} height={88} fill="#0b1018" />
      <rect x={244} y={104} width={5} height={136} fill="#4d5461" />
      <path d="M246 106 q-4 -10 -22 -8" fill="none" stroke="#4d5461" strokeWidth={4} />
      <rect x={214} y={96} width={18} height={7} rx={3} fill="#4d5461" />
      <polygon points="215,103 231,103 262,240 184,240" fill={CENA.luz} opacity={0.1} />
      <circle cx={223} cy={106} r={5} fill={CENA.luz} />
      <rect x={-20} y={238} width={340} height={174} fill={CENA.agua} />
      <rect x={-20} y={238} width={340} height={10} fill="#12344b" />
      {Array.from({ length: 14 }, (_, k) => {
        const y = 250 + k * 11;
        const tremor = onda(t, 14 / 10, k * 0.8) * (2 + k * 0.4);
        return (
          <g key={k}>
            <rect x={210 + tremor} y={y} width={26 - k} height={3} fill={CENA.luz} opacity={0.42 - k * 0.025} />
            <rect x={104 + tremor * 0.8} y={y + 4} width={14} height={2.5} fill="#f2c879" opacity={0.3 - k * 0.018} />
            <rect x={30 - tremor * 0.6} y={y + 2} width={12} height={2.5} fill="#f2c879" opacity={0.26 - k * 0.016} />
          </g>
        );
      })}
      {Array.from({ length: 7 }, (_, i) => {
        const u = ((t / 14) * 8 + i / 7) % 1;
        const cx = 20 + sorteio(i, 1) * 260;
        const cy = 270 + sorteio(i, 2) * 120;
        return <ellipse key={i} cx={cx} cy={cy} rx={4 + u * 24} ry={1.5 + u * 6} fill="none" stroke={COR.marcoTexto} strokeWidth={1.2} opacity={(1 - u) * 0.55} />;
      })}
      {Array.from({ length: 60 }, (_, i) => {
        const x0 = sorteio(i, 3) * 360 - 20;
        const y = ((sorteio(i, 4) * 440 + t * velocidade) % 440) - 20;
        const x = x0 - (y + 20) * 0.18;
        return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 18} stroke={COR.marcoTexto} strokeWidth={1.3} opacity={0.45 + sorteio(i, 5) * 0.3} />;
      })}
    </g>
  );
};
