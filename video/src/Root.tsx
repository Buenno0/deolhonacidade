import React from 'react';
import { AbsoluteFill, Composition, useCurrentFrame, useVideoConfig } from 'remotion';
import './fontes';
import { Final } from './cenas/Final';
import { Gancho } from './cenas/Gancho';
import { Publicar } from './cenas/Publicar';
import { calcularExplicativo, Explicativo } from './explicativo/Explicativo';
import { DURACAO } from './explicativo/roteiro';
import { calcularEstudo, EstudoCelular, type Direcao } from './estudos/EstudoCelular';
import { Hero } from './hero/Hero';
import { Foto, ILUSTRACOES, type NomeIlustracao } from './ilustracoes';
import { COR } from './tema';

const FPS = 30;
const LOOP = 14 * FPS;

// Folha das ilustrações, para conferir o estilo e o movimento lado a lado
const Ilustracoes: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const nomes = Object.keys(ILUSTRACOES) as NomeIlustracao[];
  const w = 300;
  const h = 400;
  const gap = 24;
  const total = nomes.length * w + (nomes.length - 1) * gap;
  const vw = total + 80;
  const vh = (vw * height) / width;
  return (
    <AbsoluteFill style={{ background: COR.bg }}>
      <svg width={width} height={height} viewBox={`-40 ${(-(vh - 500) / 2).toFixed(1)} ${vw} ${vh.toFixed(1)}`}>
        {nomes.map((n, i) => (
          <g key={n}>
            <Foto nome={n} t={frame / FPS} x={i * (w + gap)} y={0} largura={w} altura={h} />
            <circle cx={i * (w + gap) + w / 2} cy={h + 60} r={40} fill={COR.bg} stroke={COR.line} />
            <clipPath id={`c-${n}`}><circle cx={i * (w + gap) + w / 2} cy={h + 60} r={36} /></clipPath>
            <g clipPath={`url(#c-${n})`}>
              <Foto nome={n} t={frame / FPS} x={i * (w + gap) + w / 2 - 36} y={h + 24} largura={72} altura={72} quadrado />
            </g>
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// Uma cena sozinha, com t em segundos desde o começo dela
const CENAS = { Gancho, Publicar, Final } as const;
const Cena: React.FC<{ cena: keyof typeof CENAS }> = ({ cena }) => {
  const frame = useCurrentFrame();
  const Comp = CENAS[cena];
  return <Comp t={frame / FPS} />;
};

// Quadros de estilo para aprovação: um momento de cada cena
const ESTILO: Array<[keyof typeof CENAS, number]> = [['Gancho', 5.3], ['Publicar', 2.95], ['Final', 4.0]];
const Estilo: React.FC = () => {
  const frame = useCurrentFrame();
  const [cena, t] = ESTILO[Math.min(frame, ESTILO.length - 1)];
  const Comp = CENAS[cena];
  return <Comp t={t} />;
};

// Uma ilustração inteira, em retrato 3:4 (1536×2048): é a "foto" que o seed sobe para o app local
const FotoInteira: React.FC<{ nome: NomeIlustracao; t: number }> = ({ nome, t }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: COR.bg }}>
      <svg width={width} height={height}>
        <Foto nome={nome} t={t} x={0} y={0} largura={width} altura={height} />
      </svg>
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <>
    <Composition id="Explicativo" component={Explicativo} width={1920} height={1080} fps={FPS} durationInFrames={Math.round(DURACAO * FPS)} defaultProps={{ posicoes: null, formato: 'horizontal' as const }} calculateMetadata={calcularExplicativo} />
    <Composition id="Explicativo-Vertical" component={Explicativo} width={1080} height={1920} fps={FPS} durationInFrames={Math.round(DURACAO * FPS)} defaultProps={{ posicoes: null, formato: 'vertical' as const }} calculateMetadata={calcularExplicativo} />
    <Composition id="Hero" component={Hero} width={1920} height={1080} fps={FPS} durationInFrames={LOOP} defaultProps={{ formato: 'horizontal' as const }} />
    <Composition id="Hero-Vertical" component={Hero} width={1080} height={1920} fps={FPS} durationInFrames={LOOP} defaultProps={{ formato: 'vertical' as const }} />
    <Composition id="Ilustracoes" component={Ilustracoes} width={1920} height={1080} fps={FPS} durationInFrames={LOOP} />
    <Composition id="Foto" component={FotoInteira} width={1536} height={2048} fps={FPS} durationInFrames={1} defaultProps={{ nome: 'feira' as NomeIlustracao, t: 3 }} />
    <Composition id="Estilo" component={Estilo} width={1920} height={1080} fps={FPS} durationInFrames={ESTILO.length} />
    <Composition id="Cena-Gancho" component={Cena} width={1920} height={1080} fps={FPS} durationInFrames={8 * FPS} defaultProps={{ cena: 'Gancho' as const }} />
    <Composition id="Cena-Publicar" component={Cena} width={1920} height={1080} fps={FPS} durationInFrames={5 * FPS} defaultProps={{ cena: 'Publicar' as const }} />
    <Composition id="Cena-Final" component={Cena} width={1920} height={1080} fps={FPS} durationInFrames={6 * FPS} defaultProps={{ cena: 'Final' as const }} />
    <Composition id="Estudo-Celular" component={EstudoCelular} width={1920} height={1080} fps={FPS} durationInFrames={1} defaultProps={{ direcao: 'mao' as Direcao, formato: 'horizontal' as const, posicoes: null }} calculateMetadata={calcularEstudo} />
    <Composition id="Estudo-Celular-Vertical" component={EstudoCelular} width={1080} height={1920} fps={FPS} durationInFrames={1} defaultProps={{ direcao: 'mao' as Direcao, formato: 'vertical' as const, posicoes: null }} calculateMetadata={calcularEstudo} />
  </>
);
