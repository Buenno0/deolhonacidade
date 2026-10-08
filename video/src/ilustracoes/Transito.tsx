// Avenida no fim da tarde: céu em faixas, sol baixo, faróis vindo e lanternas indo, em perspectiva.
import React from 'react';
import { COR } from '../tema';
import { Faixas, Janelas, pisca } from './comum';

const YH = 214;
const YB = 400;
const CX = 150;
const Z_MAX = 14;
// profundidade z (1 = perto, 14 = horizonte) → altura na tela e escala
const naTela = (z: number, faixa: number) => ({ x: CX + (faixa * 190) / z, y: YH + (YB - YH) / z, k: 1 / z });

export const Transito: React.FC<{ t: number }> = ({ t }) => {
  const indo = (fase: number, voltas: number) => 1 + ((((t / 14) * voltas + fase) % 1) * (Z_MAX - 1));
  const vindo = (fase: number, voltas: number) => Z_MAX - ((((t / 14) * voltas + fase) % 1) * (Z_MAX - 1));
  const tracos = Array.from({ length: 9 }, (_, i) => vindo(i / 9, 3));
  const carros = [
    ...[0, 0.33, 0.66].map((f) => ({ z: indo(f, 2), faixa: -0.55, luz: '#e05a4a' })),
    ...[0.15, 0.5, 0.85].map((f) => ({ z: indo(f, 1), faixa: -0.22, luz: '#e05a4a' })),
    ...[0.1, 0.45, 0.8].map((f) => ({ z: vindo(f, 2), faixa: 0.32, luz: '#fff2c4' })),
    ...[0.3, 0.75].map((f) => ({ z: vindo(f, 1), faixa: 0.62, luz: '#fff2c4' })),
  ].sort((a, b) => b.z - a.z);
  return (
    <g>
      <Faixas cores={['#2e1a2c', '#4a2430', '#6b3029', '#8f4128', '#b85a30', '#d4793d']} ate={YH} />
      <circle cx={208} cy={YH - 6} r={30} fill="#f2c879" />
      <rect x={-20} y={150} width={46} height={66} fill="#241418" />
      <rect x={22} y={126} width={34} height={90} fill="#2b171c" />
      <Janelas x={28} y={136} cols={2} rows={5} t={t} semente={2} gx={12} gy={14} w={6} h={7} />
      <rect x={56} y={166} width={40} height={50} fill="#241418" />
      <rect x={232} y={140} width={30} height={76} fill="#2b171c" />
      <Janelas x={238} y={150} cols={2} rows={4} t={t} semente={8} gx={11} gy={14} w={5} h={7} />
      <rect x={258} y={170} width={70} height={46} fill="#241418" />
      <rect x={-20} y={YH} width={340} height={200} fill="#1d2025" />
      <polygon points={`${CX - 6},${YH} ${CX + 6},${YH} 360,${YB} -60,${YB}`} fill="#2b2f36" />
      <polygon points={`${CX - 6},${YH} ${CX - 4},${YH} -40,${YB} -56,${YB}`} fill="#4d5461" />
      <polygon points={`${CX + 4},${YH} ${CX + 6},${YH} 356,${YB} 340,${YB}`} fill="#4d5461" />
      {tracos.map((z, i) => {
        const a = naTela(z, 0);
        const b = naTela(z + 0.45, 0);
        const w = 5 * a.k;
        return <polygon key={i} points={`${(a.x - w).toFixed(1)},${a.y.toFixed(1)} ${(a.x + w).toFixed(1)},${a.y.toFixed(1)} ${(b.x + w * 0.8).toFixed(1)},${b.y.toFixed(1)} ${(b.x - w * 0.8).toFixed(1)},${b.y.toFixed(1)}`} fill={COR.warn} opacity={0.75} />;
      })}
      {[2, 4, 7, 11].map((z) => [-1.15, 1.15].map((lado) => {
        const p = naTela(z, lado);
        const h = 120 * p.k;
        return (
          <g key={`${z}${lado}`}>
            <rect x={p.x - 1.5 * p.k * 2} y={p.y - h} width={Math.max(1, 3 * p.k * 2)} height={h} fill="#4d5461" />
            <circle cx={p.x} cy={p.y - h} r={Math.max(1.2, 7 * p.k)} fill="#ffd98a" opacity={pisca(t, z, 0.8, 0.2)} />
          </g>
        );
      }))}
      {carros.map((c, i) => {
        const p = naTela(c.z, c.faixa);
        const sep = 26 * p.k;
        const r = Math.max(0.9, 5.5 * p.k);
        return (
          <g key={i}>
            <rect x={p.x - sep * 1.15} y={p.y - 26 * p.k} width={sep * 2.3} height={22 * p.k} rx={5 * p.k} fill="#14161a" opacity={0.9} />
            <circle cx={p.x - sep} cy={p.y - 12 * p.k} r={r} fill={c.luz} />
            <circle cx={p.x + sep} cy={p.y - 12 * p.k} r={r} fill={c.luz} />
            <circle cx={p.x - sep} cy={p.y - 12 * p.k} r={r * 2.6} fill={c.luz} opacity={0.14} />
            <circle cx={p.x + sep} cy={p.y - 12 * p.k} r={r * 2.6} fill={c.luz} opacity={0.14} />
          </g>
        );
      })}
      <rect x={270} y={250} width={6} height={160} fill="#3a3f48" />
      <rect x={260} y={226} width={26} height={62} rx={6} fill="#14161a" />
      <circle cx={273} cy={240} r={7} fill={COR.danger} />
      <circle cx={273} cy={257} r={7} fill="#3a2d16" />
      <circle cx={273} cy={274} r={7} fill="#1e3328" />
    </g>
  );
};
