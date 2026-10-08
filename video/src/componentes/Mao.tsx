// O celular na mão de alguém da cidade. A mão direita é chapada como as pessoas das ilustrações (duas cores, sem
// contorno): a palma fica atrás do aparelho, os dedos dobram a borda esquerda e o polegar toca a tela de verdade.
// Cada cena tem uma pessoa (pele e manga). Sem sombra: o aparelho se separa da cena pelo aro, que pega a luz.
import React from 'react';
import { COR } from '../tema';
import { STATUS, TELA } from './Celular';

export type P = [number, number];
export type Pessoa = { pele: string; sombra: string; unha: string; vinco: string; manga: string; punho: string; listra?: string };

export const PESSOAS = {
  // publica a feira e volta no fim
  publica: { pele: '#b9784a', sombra: '#985d35', unha: '#e2b590', vinco: '#7e4a28', manga: '#2b4a63', punho: '#213a4f' },
  // confirma a feira
  confirma: { pele: '#e3b48a', sombra: '#c4916a', unha: '#f2d2b6', vinco: '#a8734f', manga: '#3b6b51', punho: '#2f5a43' },
  // pergunta "Alguém aí?" e liga os avisos
  pergunta: { pele: '#6e4128', sombra: '#54301c', unha: '#a87557', vinco: '#3f2213', manga: '#9d5a26', punho: '#7d4520' },
  // posta a foto com gente e carro
  protege: { pele: '#cf9566', sombra: '#ad7449', unha: '#ebc29e', vinco: '#8c5934', manga: '#4b5363', punho: '#3a4250' },
  // tem um comércio: manga listrada de quem trabalha no balcão
  comercio: { pele: '#a8693f', sombra: '#87522f', unha: '#d9a983', vinco: '#6b3d20', manga: '#e9e1d0', punho: '#d29a44', listra: '#9d5a26' },
} satisfies Record<string, Pessoa>;

export const ALTURA_TELA = TELA.altura + STATUS; // a captura com a barra de status em cima

// Medidas do aparelho a partir da altura: L e A são largura e altura do corpo; u é a escala da mão
export const medidas = (altura: number) => {
  const bisel = Math.round(altura * 0.0175);
  const escala = (altura - 2 * bisel) / ALTURA_TELA;
  const L = TELA.largura * escala + 2 * bisel;
  return { L, A: altura, bisel, escala, u: L / 393 };
};
export type Medidas = ReturnType<typeof medidas>;

// Ponto da captura (px de CSS) → ponto no corpo do aparelho
export const naTela = (m: Medidas, x: number, y: number): P => [m.bisel + x * m.escala, m.bisel + (STATUS + y) * m.escala];
// Onde o polegar descansa: na borda direita, quase todo fora da tela
export const pontaEmRepouso = (m: Medidas): P => [1.06 * m.L, 0.78 * m.A];

// Corpo: aro de metal que pega a luz da cidade (frio à esquerda, ouro à direita), borda preta, tela, ilha e um
// reflexo leve no vidro
export const Corpo: React.FC<{ largura: number; altura: number; bisel: number; children: React.ReactNode }> = ({ largura, altura, bisel, children }) => {
  const raio = largura * 0.155;
  const escala = (altura - 2 * bisel) / ALTURA_TELA;
  const lt = largura - 2 * bisel;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: largura, height: altura, borderRadius: raio, background: 'linear-gradient(90deg, #6a6155 0%, #24201b 7%, #151310 50%, #2b2219 90%, #b88a4c 100%)' }}>
      <div style={{ position: 'absolute', inset: 2.5, borderRadius: raio - 2.5, background: '#070605' }} />
      <div style={{ position: 'absolute', inset: bisel, borderRadius: raio - bisel, overflow: 'hidden', background: COR.bg }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: TELA.largura, height: ALTURA_TELA, transform: `scale(${escala})`, transformOrigin: '0 0' }}>{children}</div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,0) 33%, rgba(255,255,255,.06) 33.3%, rgba(255,255,255,.02) 49%, rgba(255,255,255,0) 49.3%)' }} />
        <div style={{ position: 'absolute', top: (altura - 2 * bisel) * 0.012, left: lt * 0.35, width: lt * 0.3, height: lt * 0.085, borderRadius: 99, background: '#000' }} />
      </div>
    </div>
  );
};

export const Botoes: React.FC<{ largura: number; altura: number }> = ({ largura, altura }) => (
  <>
    {[[0.19, 0.045], [0.25, 0.075], [0.34, 0.075]].map(([y, h]) => (
      <div key={y} style={{ position: 'absolute', left: -3.5, top: altura * y, width: 6, height: altura * h, borderRadius: 3, background: '#4a4239' }} />
    ))}
    <div style={{ position: 'absolute', left: largura - 2.5, top: altura * 0.28, width: 6, height: altura * 0.11, borderRadius: 3, background: '#8a6a3e' }} />
  </>
);

// O aparelho com a mão. `ponta` é a ponta do polegar no corpo do aparelho; `aperto` (0 a 1) afunda a ponta no
// toque; `onda` desenha o anel dourado que abre no ponto tocado. `manga` é onde a manga começa abaixo do aparelho
// (em u): perto do pulso no 16:9, para ela aparecer na borda do quadro.
export const CelularNaMao: React.FC<{
  m: Medidas; pessoa: Pessoa; ponta: P; aperto?: number; onda?: { ponto: P; p: number }; manga?: number; id: string; children: React.ReactNode;
}> = ({ m, pessoa, ponta, aperto = 0, onda, manga = 300, id, children }) => {
  const { L, A, bisel, u } = m;
  const base: P = [1.1 * L, 1.07 * A];
  const angulo = (Math.atan2(base[1] - ponta[1], base[0] - ponta[0]) * 180) / Math.PI;
  const comp = Math.hypot(base[0] - ponta[0], base[1] - ponta[1]);
  const r = 0.105 * L; // raio da ponta do polegar
  const rb = 0.13 * L; // meia largura na base
  const polegar = `M 0 ${-r} L ${comp + 30 * u} ${-rb} L ${comp + 30 * u} ${rb} L 0 ${r} A ${r} ${r} 0 0 1 0 ${-r} Z`;
  const fundo = A + 900 * u; // o antebraço continua até sair do quadro
  const palma = [
    `M ${-0.075 * L} ${0.8 * A}`,
    `C ${-0.11 * L} ${0.93 * A} ${-0.03 * L} ${1.03 * A} ${0.12 * L} ${1.08 * A}`,
    `L ${0.45 * L} ${fundo} L ${1.3 * L} ${fundo} L ${1.06 * L} ${1.28 * A}`,
    `C ${1.0 * L} ${1.2 * A} ${1.2 * L} ${1.1 * A} ${1.18 * L} ${0.95 * A}`,
    `C ${1.19 * L} ${0.86 * A} ${1.1 * L} ${0.79 * A} ${0.99 * L} ${0.8 * A}`,
    `L ${0.4 * L} ${0.75 * A} Z`,
  ].join(' ');
  const sombraPalma = `M ${-0.075 * L} ${0.8 * A} C ${-0.11 * L} ${0.93 * A} ${-0.03 * L} ${1.03 * A} ${0.12 * L} ${1.08 * A} L ${0.45 * L} ${fundo} L ${0.57 * L} ${fundo} L ${0.22 * L} ${1.09 * A} L ${0.05 * L} ${0.8 * A} Z`;
  const naBorda = (a: P, b: P, y: number) => a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  const bordaE: [P, P] = [[0.12 * L, 1.08 * A], [0.45 * L, fundo]];
  const bordaD: [P, P] = [[1.06 * L, 1.28 * A], [1.3 * L, fundo]];
  const faixa = (y0: number, y1: number) => {
    const f = 14 * u;
    return `M ${naBorda(...bordaE, y0) - f} ${y0} L ${naBorda(...bordaD, y0) + f} ${y0} L ${naBorda(...bordaD, y1) + f} ${y1} L ${naBorda(...bordaE, y1) - f} ${y1} Z`;
  };
  const y0Manga = A + manga * u;
  const listras = pessoa.listra ? Array.from({ length: 12 }, (_, i) => y0Manga + (56 + i * 44) * u) : [];
  const dedos = [0, 1, 2].map((i) => ({ cy: A * 0.6 + i * 76 * u, h: (i === 2 ? 64 : 72) * u, sai: (i === 0 ? 30 : i === 1 ? 28 : 24) * u }));
  const svg: React.CSSProperties = { position: 'absolute', left: 0, top: 0, overflow: 'visible' };
  // no toque, a ponta afunda um pouco (o polegar encurta e achata)
  const k = 1 - 0.07 * aperto;
  return (
    <>
      <svg width={L} height={A} style={svg}>
        <path d={palma} fill={pessoa.pele} />
        <path d={sombraPalma} fill={pessoa.sombra} />
        <path d={faixa(y0Manga, fundo)} fill={pessoa.manga} />
        {listras.map((y) => <path key={y} d={faixa(y, y + 14 * u)} fill={pessoa.listra} />)}
        <path d={faixa(y0Manga, y0Manga + 38 * u)} fill={pessoa.punho} />
      </svg>
      <Corpo largura={L} altura={A} bisel={bisel}>{children}</Corpo>
      <Botoes largura={L} altura={A} />
      <svg width={L} height={A} style={svg}>
        <defs>
          {dedos.map((d, i) => (
            <clipPath key={i} id={`${id}-dedo-${i}`}><rect x={-26 * u} y={d.cy - d.h / 2} width={26 * u + d.sai} height={d.h} rx={d.h / 2} /></clipPath>
          ))}
          <clipPath id={`${id}-polegar`}><path d={polegar} /></clipPath>
          <linearGradient id={`${id}-sombra-polegar`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={comp} y2={0}>
            <stop offset={0} stopColor={pessoa.sombra} />
            <stop offset={0.55} stopColor={pessoa.sombra} />
            <stop offset={1} stopColor={pessoa.sombra} stopOpacity={0} />
          </linearGradient>
        </defs>
        {dedos.map((d, i) => (
          <g key={i}>
            <rect x={-26 * u} y={d.cy - d.h / 2} width={26 * u + d.sai} height={d.h} rx={d.h / 2} fill={pessoa.pele} />
            <rect x={-26 * u} y={d.cy - d.h / 2} width={15 * u} height={d.h} fill={pessoa.sombra} clipPath={`url(#${id}-dedo-${i})`} />
          </g>
        ))}
        {onda && onda.p > 0 && onda.p < 1 && (
          <>
            <circle cx={onda.ponto[0]} cy={onda.ponto[1]} r={(34 + 46 * onda.p) * u} fill="none" stroke={COR.accent} strokeWidth={3} opacity={0.7 * (1 - onda.p)} />
            <circle cx={onda.ponto[0]} cy={onda.ponto[1]} r={(50 + 62 * onda.p) * u} fill="none" stroke={COR.accent} strokeWidth={2} opacity={0.3 * (1 - onda.p)} />
          </>
        )}
        <g transform={`translate(${ponta[0].toFixed(1)} ${ponta[1].toFixed(1)}) rotate(${angulo.toFixed(2)}) scale(${k.toFixed(3)} 1)`}>
          <path d={polegar} fill={pessoa.pele} />
          <rect x={-r} y={rb * 0.3} width={comp + 60 * u} height={rb} fill={`url(#${id}-sombra-polegar)`} clipPath={`url(#${id}-polegar)`} />
          <ellipse cx={r * 0.2} cy={-r * 0.1} rx={r * 0.62} ry={r * 0.52} fill={pessoa.unha} />
          <path d={`M ${r * 2.1} ${-r * 0.75} q ${r * 0.28} ${r * 0.75} 0 ${r * 1.5}`} stroke={pessoa.vinco} strokeWidth={2.5 * u} fill="none" opacity={0.4} />
        </g>
      </svg>
    </>
  );
};
