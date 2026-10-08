// O pino do app na miniatura (app/globals.css): foto redonda, anel do tempo na cor da severidade, ponteiro.
// Pousa com a curva do pin-pousa e o halo dourado; "Agora" pulsa em coral; "Em alta" cresce e ganha o brilho
// girando; quando o tempo acaba, some com um "puf". Tudo em coordenadas do mundo, a partir do tempo t (s).
import React from 'react';
import { MONO } from '../fontes';
import { Foto, type NomeIlustracao } from '../ilustracoes';
import { COR, SEVERIDADE, type Severidade } from '../tema';
import { cl, iso, outBack, outCubic, TAU } from './iso';

export type SpecPino = {
  id: string;
  x: number;
  y: number;
  z?: number;
  H: number; // altura da cabeça do pino acima do ponto
  sev: Severidade;
  foto: NomeIlustracao;
  t0: number; // pousa
  f0: number; // fração do tempo restante no pouso
  f1: number; // fração restante no fim (fim ou saída)
  fim?: number; // o tempo acaba: some
  estouro?: boolean; // chega com estouro de pontos (a resposta do "Alguém aí?")
  agora?: [number, number]; // janela do selo "Agora"
  alta?: number; // vira "Em alta"
  divulgacao?: boolean; // selo "Divulgação" (comércio verificado)
  saida?: number; // saída geral (o hero esvazia para emendar o loop)
  seloEsquerda?: boolean; // selo do lado esquerdo (pino perto da borda direita do quadro)
  anel?: Array<[number, number]>; // quadros-chave (t, fração restante) no lugar da descida linear
  halos?: number[]; // halos dourados extras (ex.: quando alguém confirma)
  tempo?: { texto: string; de: number; ate: number }; // rótulo do tempo de vida ("2 h"), à esquerda da cabeça
};

// Interpola quadros-chave (t, valor), parado nas pontas
export const chaves = (k: Array<[number, number]>, t: number) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) return k[i - 1][1] + ((k[i][1] - k[i - 1][1]) * (t - k[i - 1][0])) / (k[i][0] - k[i - 1][0]);
  }
  return k[k.length - 1][1];
};

export const RAIO = 20.5;
const CIRC = 2 * Math.PI * 18;

// A cabeça do pino (foto redonda, trilha e anel do tempo), centrada na origem. Usada também no pino em voo.
export const CabecaPino: React.FC<{ foto: NomeIlustracao; t: number; fracao: number; sev: Severidade; brilho?: number }> = ({ foto, t, fracao, sev, brilho = 0 }) => {
  const s = SEVERIDADE[sev];
  return (
    <>
      <polygon points="-6,16 6,16 0,24" fill={COR.bg} />
      <circle r={RAIO} fill={COR.bg} />
      <g clipPath="url(#clip-foto-pino)">
        <Foto nome={foto} t={t} x={-15.5} y={-15.5} largura={31} altura={31} quadrado />
      </g>
      <circle r={18} fill="none" stroke={s.trilha} strokeWidth={3.2} />
      <circle r={18} fill="none" stroke={s.cor} strokeWidth={3.2} transform="rotate(-90)" strokeDasharray={`${(fracao * CIRC).toFixed(2)} ${CIRC.toFixed(2)}`} />
      {brilho > 0 && (
        <circle r={18} fill="none" stroke="#ffecbe" strokeWidth={3.2} strokeDasharray={`16 ${(CIRC - 16).toFixed(1)}`} opacity={brilho} transform={`rotate(${((t * 150) % 360).toFixed(1)})`} />
      )}
    </>
  );
};

const Selo: React.FC<{ x: number; y: number; largura: number; fundo: string; borda?: string; children: React.ReactNode; opacidade: number }> = ({
  x, y, largura, fundo, borda, children, opacidade,
}) => (
  <g transform={`translate(${x} ${y})`} opacity={opacidade}>
    <rect x={0} y={-10} width={largura} height={20} rx={10} fill={fundo} stroke={borda ?? 'none'} strokeWidth={1} />
    {children}
  </g>
);

export const Pino: React.FC<{ p: SpecPino; t: number }> = ({ p, t }) => {
  if (t < p.t0) return null;
  const [ax, ay] = iso(p.x, p.y, p.z ?? 0);
  const a = cl((t - p.t0) / 0.52);
  const e = outBack(a);
  let escala = 0.6 + 0.4 * e;
  const dy = -28 * (1 - e);
  let op = cl(a * 2.2);
  if (p.alta !== undefined && t >= p.alta) escala *= 1 + 0.14 * outCubic(cl((t - p.alta) / 0.4));
  let pontos: { p: number; d0: number; d1: number; giro: number } | null = null;
  if (p.fim !== undefined && t >= p.fim) {
    const s = cl((t - p.fim) / 0.45);
    escala *= 1 - 0.4 * s;
    op *= 1 - s;
    pontos = { p: s, d0: 8, d1: 22, giro: 0 };
  } else if (p.estouro) {
    pontos = { p: cl((t - p.t0) / 0.8), d0: 10, d1: 30, giro: 0.3 };
  }
  if (p.saida !== undefined) {
    const s = cl((t - p.saida) / 0.8);
    op *= 1 - s;
    escala *= 1 - 0.08 * s;
  }
  if (op <= 0.001 && !(pontos && pontos.p < 1)) return null;
  const fimAnel = p.fim ?? p.saida ?? p.t0 + 12;
  const fracao = p.anel ? chaves(p.anel, t) : p.f0 + (p.f1 - p.f0) * cl((t - p.t0) / (fimAnel - p.t0));
  const h = cl((t - p.t0) / 0.9);
  const extra = (p.halos ?? []).map((ht) => cl((t - ht) / 0.9)).find((v) => v > 0 && v < 1) ?? 0;
  const tempoV = p.tempo && t >= p.tempo.de && t < p.tempo.ate ? cl((t - p.tempo.de) / 0.25) * cl((p.tempo.ate - t) / 0.25) : 0;
  const agoraV = p.agora && t >= p.agora[0] && t < p.agora[1] ? cl((t - p.agora[0]) / 0.25) * cl((p.agora[1] - t) / 0.25) : 0;
  const altaV = p.alta !== undefined && t >= p.alta ? cl((t - p.alta) / 0.3) : 0;
  const ping = (t / 1.6) % 1;
  const respira = (t / 2.4) % 1;
  const q = (t / 1.8) % 1;
  const seta = q < 0.25 ? -4 + 16 * q : q < 0.7 ? 0 : ((q - 0.7) / 0.3) * 4;
  const setaOp = q < 0.25 ? q / 0.25 : q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3;
  return (
    <g transform={`translate(${ax.toFixed(1)} ${ay.toFixed(1)})`}>
      <g opacity={op}>
        <ellipse cx={0} cy={0} rx={5} ry={2.5} fill={COR.accent} />
        <line x1={0} y1={0} x2={0} y2={-(p.H - 24)} stroke={COR.accent} strokeWidth={1.2} strokeDasharray="2 3" opacity={0.75} />
        <g transform={`translate(0 ${(-p.H + dy).toFixed(2)}) scale(${escala.toFixed(4)})`}>
          <circle r={20 + 10 * respira} fill="none" stroke={COR.danger} strokeWidth={2} opacity={agoraV * 0.6 * (1 - respira)} />
          <circle r={20 + 18 * h} fill="none" stroke={COR.accent} strokeWidth={3} opacity={h < 1 ? 0.9 * (1 - h) : 0} />
          {extra > 0 && <circle r={20 + 22 * extra} fill="none" stroke={COR.accent} strokeWidth={3} opacity={0.9 * (1 - extra)} />}
          <CabecaPino foto={p.foto} t={t} fracao={fracao} sev={p.sev} brilho={altaV} />
        </g>
        {agoraV > 0 && (
          <Selo x={p.seloEsquerda ? -27 - 64 : 27} y={-p.H} largura={64} fundo="rgba(12,10,8,.88)" borda="rgba(224,129,99,.6)" opacidade={agoraV}>
            <circle cx={12} cy={0} r={3.5 * (1 + 1.8 * ping)} fill={COR.danger} opacity={1 - ping} />
            <circle cx={12} cy={0} r={3.5} fill={COR.danger} />
            <text x={22} y={4} fill={COR.ink} fontFamily={MONO} fontSize={11} fontWeight={500}>Agora</text>
          </Selo>
        )}
        {altaV > 0 && (
          <Selo x={p.seloEsquerda ? -29 - 76 : 29} y={-p.H} largura={76} fundo={COR.accent} opacidade={altaV}>
            <g transform={`translate(${(12 + seta).toFixed(1)} ${(-seta).toFixed(1)})`} opacity={setaOp}>
              <path d="M-3 3 L3 -3 M-0.5 -3 H3 V0.5" stroke={COR.accentInk} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <text x={22} y={4} fill={COR.accentInk} fontFamily={MONO} fontSize={11} fontWeight={500}>Em alta</text>
          </Selo>
        )}
        {tempoV > 0 && p.tempo && (
          <Selo x={-27 - 52} y={-p.H} largura={52} fundo={COR.surface} borda={COR.line} opacidade={tempoV}>
            <text x={26} y={4} textAnchor="middle" fill={COR.ink} fontFamily={MONO} fontSize={11} fontWeight={500}>{p.tempo.texto}</text>
          </Selo>
        )}
        {p.divulgacao && (
          <Selo x={p.seloEsquerda ? -27 - 92 : 27} y={-p.H} largura={92} fundo={COR.surface} borda={COR.line} opacidade={cl((t - p.t0) / 0.3)}>
            <text x={11} y={4} fill={COR.ink} fontFamily={MONO} fontSize={11} fontWeight={500}>Divulgação</text>
          </Selo>
        )}
      </g>
      {pontos && pontos.p > 0 && pontos.p < 1 && Array.from({ length: 8 }, (_, i) => {
        const an = (i * TAU) / 8 + pontos!.giro;
        const d = pontos!.d0 + pontos!.d1 * outCubic(pontos!.p);
        return <circle key={i} cx={Math.cos(an) * d} cy={-p.H + Math.sin(an) * d} r={2} fill={COR.accent} opacity={1 - pontos!.p} />;
      })}
    </g>
  );
};
