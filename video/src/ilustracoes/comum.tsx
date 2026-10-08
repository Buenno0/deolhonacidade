// Peças das ilustrações (as "fotos" do vídeo). Cada ilustração é uma cena plana de 300×400 (retrato 3:4, como a
// foto do celular), em camadas que andam em velocidades diferentes. Todo movimento tem período que divide 14 s,
// para o hero emendar no loop.
import React from 'react';

export const W = 300;
export const H = 400;
const TAU = Math.PI * 2;

export const onda = (t: number, periodo: number, fase = 0) => Math.sin((TAU * t) / periodo + fase);
// Pisca lento de luz (nunca mais de 3 vezes por segundo): períodos de 14/3, 7 e 14/5 s
const PERIODOS = [14 / 3, 7, 14 / 5];
export const pisca = (t: number, i: number, base = 0.6, amp = 0.4) => base + amp * (0.5 + 0.5 * onda(t, PERIODOS[i % 3], i * 1.7));
// Deslocamento de parallax: camadas mais perto andam mais
export const deriva = (t: number, amp: number, fase = 0) => amp * onda(t, 14, fase);

export const Faixas: React.FC<{ cores: string[]; de?: number; ate: number }> = ({ cores, de = 0, ate }) => {
  const h = (ate - de) / cores.length;
  return <>{cores.map((c, i) => <rect key={i} x={-20} y={de + i * h} width={W + 40} height={h + 0.6} fill={c} />)}</>;
};

// Pessoa sem rosto: só corpo e cabeça
export const Pessoa: React.FC<{ x: number; y: number; s?: number; corpo: string; cabeca?: string; passo?: number }> = ({ x, y, s = 1, corpo, cabeca = '#cfc6b8', passo = 0 }) => (
  <g transform={`translate(${x.toFixed(1)} ${(y - Math.abs(passo) * 2.5).toFixed(1)}) scale(${s})`}>
    <rect x={-9} y={-34} width={18} height={34} rx={9} fill={corpo} />
    <rect x={-7} y={-6} width={5} height={14} rx={2.5} fill={corpo} transform={`rotate(${(passo * 14).toFixed(1)} -4.5 -6)`} />
    <rect x={2} y={-6} width={5} height={14} rx={2.5} fill={corpo} transform={`rotate(${(-passo * 14).toFixed(1)} 4.5 -6)`} />
    <circle cx={0} cy={-42} r={7.5} fill={cabeca} />
  </g>
);

// Fio de luzes em catenária; as lâmpadas pulsam devagar, cada uma na sua fase
export const FioDeLuzes: React.FC<{ x0: number; y0: number; x1: number; y1: number; flecha: number; n: number; t: number; fase?: number; r?: number }> = ({
  x0, y0, x1, y1, flecha, n, t, fase = 0, r = 3,
}) => {
  const ponto = (s: number) => [x0 + (x1 - x0) * s, y0 + (y1 - y0) * s + flecha * Math.sin(Math.PI * s)];
  const caminho = Array.from({ length: 25 }, (_, i) => ponto(i / 24).map((v) => v.toFixed(1)).join(',')).join(' ');
  return (
    <g>
      <polyline points={caminho} fill="none" stroke="#4d5461" strokeWidth={1.2} />
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = ponto((i + 0.5) / n);
        return <circle key={i} cx={x} cy={y + r * 0.6} r={r} fill="#ffd98a" opacity={pisca(t, i + Math.round(fase))} />;
      })}
    </g>
  );
};

// Fileira de janelas acesas (algumas apagadas) num retângulo
export const Janelas: React.FC<{ x: number; y: number; cols: number; rows: number; w?: number; h?: number; gx?: number; gy?: number; t: number; semente: number; cor?: string }> = ({
  x, y, cols, rows, w = 7, h = 9, gx = 13, gy = 16, t, semente, cor = '#f2c879',
}) => (
  <>
    {Array.from({ length: cols * rows }, (_, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const acesa = (Math.sin(semente * 12.9898 + i * 78.233) * 43758.5453) % 1;
      if (Math.abs(acesa) < 0.35) return null;
      return <rect key={i} x={x + c * gx} y={y + r * gy} width={w} height={h} fill={cor} opacity={pisca(t, i + semente, 0.55, 0.35)} />;
    })}
  </>
);

// Árvore redonda (copa em duas camadas)
export const Arvore: React.FC<{ x: number; y: number; r: number; escura?: boolean }> = ({ x, y, r, escura }) => (
  <g>
    <rect x={x - r * 0.12} y={y} width={r * 0.24} height={r * 1.1} fill="#3a2a1f" />
    <circle cx={x} cy={y} r={r} fill={escura ? '#14261d' : '#2f5a43'} />
    <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.55} fill={escura ? '#1b3326' : '#3b6b51'} />
  </g>
);
