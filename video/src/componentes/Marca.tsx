// A marca do app (components/ui/Mark.tsx): o contorno real do município de Itapetininga com o pino cravado no
// centro urbano. Corpo no acento, pino recortado em accent-ink. `preenchimento` (0 a 1) deixa só o contorno
// tracejado no começo, como a borda da cidade no mapa, e enche de ouro no fim.
import React from 'react';
import { COR } from '../tema';

export const CITY_PATH =
  'M78.9 45.3L75.6 45.3L75.5 38.2L72.6 37L70.6 32L71.2 29.6L76.5 31.5L89.1 30L93.6 25.7L88.2 25.7L84.8 19.7L80.4 19.5L75.1 22.3L75.8 15.6L73 13.8L65.8 17.3L59.5 17.7L57.8 15.6L54.3 15.4L48.6 21.6L41.2 24.8L40.2 27.6L37.5 26.9L37.2 28.3L31 31.5L27.2 38.7L22.7 39.5L21.3 42.9L17.2 43.5L15.5 40.4L14.7 41.6L13.9 40.3L10 40.9L12.4 54L6 62.7L7.9 64.4L7.6 66.8L6.2 66.4L7.4 69L9.3 69.7L8.2 73.4L11.7 75.9L12.2 78L10.9 78.6L17.2 82.9L16.2 85.1L18.1 85.2L19.1 82.1L22.6 80.6L26 84.7L30.5 86.2L32.2 84.3L43.5 82.9L48.1 80.3L57.1 69.8L60.4 69.8L61.6 71.2L66.2 67.3L74.8 67.7L74 69.1L77 75.3L82 73.1L85.4 73.7L89.1 63.7L86.8 63.7L82.6 59.7L83.1 54.2L77.8 47.5Z';
export const PIN_PATH = 'M58 43C55 37 49 33 49 27A9 9 0 0 1 67 27C67 33 61 37 58 43Z';

export const Marca: React.FC<{ largura: number; preenchimento?: number; pino?: number; tracejado?: number }> = ({
  largura, preenchimento = 1, pino = 1, tracejado = 0,
}) => (
  <svg viewBox="2 8 96 84" width={largura} height={(largura * 84) / 96} overflow="visible">
    {tracejado > 0 && (
      <path d={CITY_PATH} fill="none" stroke="#e0a84e" strokeWidth={0.9} strokeDasharray="2.2 1.5" strokeLinejoin="round" opacity={tracejado} />
    )}
    <path d={CITY_PATH} fill={COR.accent} stroke={COR.accent} strokeWidth={2} strokeLinejoin="round" opacity={preenchimento} />
    <g opacity={pino} transform={`translate(58 43) scale(${0.6 + 0.4 * pino}) translate(-58 -43)`}>
      <path d={PIN_PATH} fill={COR.accentInk} />
      <circle cx={58} cy={27} r={3.6} fill={COR.accent} />
    </g>
  </svg>
);
