// O mundo do explicativo: uma cidade só, contínua. A câmera viaja entre as cenas e os pinos se acumulam (a feira
// publicada pelo celular continua no mapa depois; o trânsito de 2 h some quando o tempo acaba).
import React from 'react';
import { DefsMiniatura, viewBox, type Camera } from '../hero/Hero';
import { Bolha, OndasAviso } from '../miniatura/Bolha';
import { LUGAR } from '../miniatura/cidade';
import { cl, elipseChao, inOut, iso, outCubic } from '../miniatura/iso';
import { Miniatura } from '../miniatura/Miniatura';
import { Pino, type SpecPino } from '../miniatura/Pino';
import { COR } from '../tema';
import { T } from './roteiro';

// Quadros-chave da câmera: (t, cx, cy, altura visível). Entre eles, transição suave; parado, uma deriva leve.
const CAMERA: Array<[number, number, number, number]> = [
  [0, 340, 206, 330],
  [5.4, 340, 206, 330],
  [7.2, 340, 206, 312],
  [8.4, 200, 205, 318],
  [10.8, 200, 205, 318],
  [11.7, 233, 227, 300],
  [16.8, 233, 227, 300],
  [17.6, 200, 202, 345],
  [21.6, 200, 202, 345],
  [22.4, 446, 184, 280],
  [26.4, 446, 184, 280],
  [27.2, 264, 208, 290],
  [33.6, 264, 208, 290],
  [34.4, 367, 214, 330],
  [38.4, 367, 214, 330],
  [39.2, 300, 214, 330],
  [43.2, 300, 214, 330],
  [44.0, 340, 241, 280],
  [49.2, 340, 241, 280],
  [50.0, 300, 205, 340],
  [52.8, 300, 205, 340],
  [54.0, 340, 205, 560],
];

// Na vertical o quadro é estreito: a câmera mostra a cidade inteira nas cenas sem celular e, entre um toque e outro,
// corta para o lugar onde o pino pousa (o celular sai de cena nessas horas).
const CAMERA_V: Array<[number, number, number, number]> = [
  [0, 340, 160, 520],
  [5.4, 340, 160, 520],
  [7.2, 340, 165, 500],
  [8.4, 330, 172, 480],
  [10.8, 330, 172, 480],
  [11.6, 425, 200, 420],
  [13.3, 425, 200, 420],
  [13.9, 425, 196, 380],
  [16.8, 425, 196, 380],
  [17.6, 330, 168, 520],
  [21.6, 330, 168, 520],
  [22.4, 425, 205, 420],
  [26.4, 425, 205, 420],
  [27.4, 264, 210, 420],
  [33.6, 264, 210, 420],
  [34.4, 300, 185, 470],
  [43.2, 300, 185, 470],
  [44.0, 309, 255, 420],
  [49.2, 309, 255, 420],
  [50.0, 300, 180, 480],
  [52.8, 300, 180, 480],
  [54.0, 340, 200, 820],
];

export const cameraNo = (t: number, vertical = false): Camera => {
  const tabela = vertical ? CAMERA_V : CAMERA;
  let i = 0;
  while (i < tabela.length - 2 && t >= tabela[i + 1][0]) i++;
  const [t0, x0, y0, a0] = tabela[i];
  const [t1, x1, y1, a1] = tabela[i + 1];
  const p = inOut(cl((t - t0) / (t1 - t0)));
  return {
    cx: x0 + (x1 - x0) * p + 4 * Math.sin(t * 0.4),
    cy: y0 + (y1 - y0) * p + 2 * Math.sin(t * 0.33),
    altura: a0 + (a1 - a0) * p,
  };
};

const SAIDA = T.marca;
const TEMPO = { de: 18.4, ate: 21.3 };

export const PINOS: SpecPino[] = [
  { id: 'show', ...LUGAR.coreto, H: 52, sev: 'acc', foto: 'show', t0: 6.1, f0: 0, f1: 0, alta: 9.0, saida: SAIDA,
    anel: [[6.1, 0.95], [17.4, 0.92], [21.0, 0.7], [52.8, 0.66]], tempo: { texto: '12 h', ...TEMPO } },
  { id: 'transito', ...LUGAR.transito, H: 58, sev: 'warn', foto: 'transito', t0: 6.4, f0: 0, f1: 0, fim: T.puf,
    anel: [[6.4, 0.55], [17.4, 0.5], [T.puf, 0]], tempo: { texto: '2 h', ...TEMPO, ate: T.puf } },
  { id: 'alagamento', ...LUGAR.alagamento, H: 60, sev: 'warn', foto: 'alagamento', t0: 6.7, f0: 0, f1: 0, saida: SAIDA,
    anel: [[6.7, 0.8], [17.4, 0.78], [21.0, 0.45], [52.8, 0.42]], tempo: { texto: '6 h', ...TEMPO } },
  { id: 'obra', ...LUGAR.obra, H: 84, sev: 'warn', foto: 'obra', t0: 7.0, f0: 0, f1: 0, saida: SAIDA,
    anel: [[7.0, 0.62], [17.4, 0.6], [21.0, 0.44], [52.8, 0.42]] },
  { id: 'feira', ...LUGAR.feira, H: 66, sev: 'acc', foto: 'feira', t0: T.voo[1], f0: 0, f1: 0, agora: [T.voo[1], 22.4], saida: SAIDA,
    anel: [[T.voo[1], 1], [17.4, 0.97], [21.0, 0.62], [T.toqueRolando + 0.25, 0.62], [T.toqueRolando + 0.9, 0.95], [52.8, 0.9]],
    halos: [T.toqueRolando + 0.25], tempo: { texto: '12 h', ...TEMPO } },
  { id: 'fila', ...LUGAR.posto, H: 66, sev: 'acc', foto: 'fila', t0: T.drop, f0: 1, f1: 0.95, estouro: true, saida: SAIDA },
  { id: 'transito2', x: 2.5, y: 4.4, H: 62, sev: 'warn', foto: 'transito', t0: T.transitoNovo, f0: 1, f1: 0.96, agora: [T.transitoNovo, 38.4], saida: SAIDA },
  { id: 'comercio', ...LUGAR.comercio, H: 60, sev: 'ink', foto: 'comercio', t0: T.pinoComercio, f0: 1, f1: 0.98, divulgacao: true, saida: SAIDA },
];

// Na vertical, os pinos da direita põem o selo do lado de dentro do quadro
const SELO_A_ESQUERDA = ['feira', 'comercio', 'transito2', 'show'];

// "Você está aqui" (o ponto do app) e o raio do alerta (1 km), na cena dos alertas
const VOCE = { x: 2.5, y: 5.3 };
const Voce: React.FC<{ t: number }> = ({ t }) => {
  const v = cl((t - 33.9) / 0.4) * (1 - cl((t - 38.3) / 0.4));
  if (v <= 0) return null;
  const [x, y] = iso(VOCE.x, VOCE.y);
  const r = outCubic(cl((t - T.toqueAlertas) / 0.8));
  const { rx, ry } = elipseChao(2.1 * r);
  return (
    <g opacity={v}>
      {r > 0 && <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={COR.accent} fillOpacity={0.07} stroke={COR.accent} strokeWidth={1.4} strokeDasharray="6 4" />}
      <circle cx={x} cy={y} r={7} fill={COR.accent} opacity={0.25} />
      <circle cx={x} cy={y} r={4.5} fill={COR.accent} stroke={COR.bg} strokeWidth={1.6} />
    </g>
  );
};

export const Mundo: React.FC<{ t: number; largura: number; altura: number; vertical?: boolean }> = ({ t, largura, altura, vertical = false }) => {
  const acesa = 0.12 + 0.88 * inOut(cl((t - T.luzes) / 1.2));
  const some = cl((t - T.marca) / 1.0);
  return (
    <svg width={largura} height={altura} viewBox={viewBox(cameraNo(t, vertical), largura, altura)} style={{ position: 'absolute', inset: 0, opacity: 1 - some }}>
      <DefsMiniatura />
      <Miniatura t={t} acesa={acesa} noChao={<><OndasAviso x={LUGAR.posto.x} y={LUGAR.posto.y} t={t} inicios={[...T.ondas]} /><Voce t={t} /></>}>
        {PINOS.map((p) => <Pino key={p.id} p={vertical && SELO_A_ESQUERDA.includes(p.id) ? { ...p, seloEsquerda: true } : p} t={t} />)}
        <Bolha x={LUGAR.posto.x} y={LUGAR.posto.y} H={66} t={t} de={T.bolha[0]} ate={T.bolha[1]} />
      </Miniatura>
    </svg>
  );
};
