// "Tire uma foto. Ela aparece onde foi tirada.": o celular publica, o pino sai da tela, voa em arco e pousa na
// cidade, no ponto certo. O pino em voo é desenhado em pixels do quadro; ao pousar, o pino da miniatura assume.
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { Celular, larguraCelular, TELA } from '../componentes/Celular';
import { DefsMiniatura, viewBox, type Camera } from '../hero/Hero';
import { LUGAR } from '../miniatura/cidade';
import { cl, inOut, iso, outCubic } from '../miniatura/iso';
import { Miniatura } from '../miniatura/Miniatura';
import { CabecaPino, Pino, RAIO } from '../miniatura/Pino';
import { COR } from '../tema';
import { RegistrarProvisoria } from '../telas/Provisorias';
import { Cartela, paraTela } from './comum';

const ALTURA_CELULAR = 860;
const TOQUE = 2.2; // o dedo aperta "Publicar"
const VOO = [2.45, 3.45]; // o pino sai da tela e pousa

export const Publicar: React.FC<{ t: number }> = ({ t }) => {
  const { width: W, height: H } = useVideoConfig();
  const camera: Camera = { cx: 233 + 3 * Math.sin(t * 0.5), cy: 227, altura: 300 };
  const k = H / camera.altura;

  // onde a miniatura da foto está na tela do celular (px de CSS da captura → px do quadro)
  const xCel = 1180 - larguraCelular(ALTURA_CELULAR) / 2;
  const yCel = (H - ALTURA_CELULAR) / 2;
  const bisel = ALTURA_CELULAR * 0.018;
  const escala = (ALTURA_CELULAR - bisel * 2) / (TELA.altura + 47);
  const origem: [number, number] = [xCel + bisel + 68 * escala, yCel + bisel + (47 + 465) * escala];

  const feira = iso(LUGAR.feira.x, LUGAR.feira.y);
  const [ax, ay] = paraTela(feira[0], feira[1], camera, W, H);
  const destino: [number, number] = [ax, ay - 66 * k];
  const controle: [number, number] = [(origem[0] + destino[0]) / 2 + 60, Math.min(origem[1], destino[1]) - 300];
  const u = inOut(cl((t - VOO[0]) / (VOO[1] - VOO[0])));
  const ponto = (s: number): [number, number] => [
    (1 - s) * (1 - s) * origem[0] + 2 * (1 - s) * s * controle[0] + s * s * destino[0],
    (1 - s) * (1 - s) * origem[1] + 2 * (1 - s) * s * controle[1] + s * s * destino[1],
  ];
  const [px, py] = ponto(u);
  const emVoo = t >= VOO[0] && t < VOO[1];
  const escalaPino = (44 / RAIO) + (k - 44 / RAIO) * outCubic(u);
  const rastro = Array.from({ length: 14 }, (_, i) => ponto((u * i) / 13));

  const pinoNaCidade = { id: 'pub', ...LUGAR.feira, H: 66, sev: 'acc' as const, foto: 'feira' as const, t0: VOO[1], f0: 1, f1: 0.97 };
  const apertado = t >= TOQUE && t < TOQUE + 0.18 ? 1 : 0;
  const onda = cl((t - TOQUE) / 0.5);

  return (
    <AbsoluteFill style={{ background: COR.bg }}>
      <svg width={W} height={H} viewBox={viewBox(camera, W, H)}>
        <DefsMiniatura />
        <Miniatura t={t + 20}>
          <Pino p={pinoNaCidade} t={t} />
        </Miniatura>
      </svg>
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${COR.bg} 0%, rgba(12,10,8,.9) 34%, rgba(12,10,8,.35) 52%, rgba(12,10,8,0) 64%)` }} />
      <div style={{ position: 'absolute', left: 140, top: 330, width: 760 }}>
        <Cartela texto="Tire uma foto." t={t} de={0.2} tamanho={108} />
        <Cartela texto={"Ela aparece onde\nfoi tirada."} t={t} de={VOO[1] - 0.3} tamanho={64} peso={600} style={{ marginTop: 26 }} />
      </div>
      <div style={{ position: 'absolute', left: xCel, top: yCel }}>
        <Celular altura={ALTURA_CELULAR}>
          <RegistrarProvisoria foto="feira" t={t} legenda="Feira cheia hoje" apertado={apertado} />
        </Celular>
      </div>
      {onda > 0 && onda < 1 && (
        <div style={{
          position: 'absolute', left: xCel + bisel + 195 * escala - 60, top: yCel + bisel + (47 + 795) * escala - 60, width: 120, height: 120, borderRadius: 60,
          border: `3px solid ${COR.accent}`, transform: `scale(${onda.toFixed(3)})`, opacity: 1 - onda,
        }} />
      )}
      {emVoo && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <DefsMiniatura />
          <polyline points={rastro.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')} fill="none" stroke={COR.accent} strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" opacity={0.8} />
          <g transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${escalaPino.toFixed(3)})`}>
            <CabecaPino foto="feira" t={t} fracao={1} sev="acc" />
          </g>
        </svg>
      )}
    </AbsoluteFill>
  );
};
