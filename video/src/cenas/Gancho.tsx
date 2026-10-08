// Gancho "Viu ou ouviu?": bolhas cinza de "ouvi dizer" sobre a cidade apagada; "OUVIU?" aparece, o "OU" cai,
// sobra "VIU." em ouro e a cidade acende. Bolhas genéricas, sem a cara de nenhum app de mensagem.
import { measureText } from '@remotion/layout-utils';
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { ARCHIVO } from '../fontes';
import { DefsMiniatura, viewBox, type Camera } from '../hero/Hero';
import { Foto } from '../ilustracoes';
import { LUGAR } from '../miniatura/cidade';
import { cl, inOut, outBack, outCubic } from '../miniatura/iso';
import { Miniatura } from '../miniatura/Miniatura';
import { Pino } from '../miniatura/Pino';
import { COR } from '../tema';
import { useFontesProntas } from './comum';

const BALAO = '#2a2622';
const TEXTO_BALAO = '#d9d0c1';

const Balao: React.FC<{ x: number; y: number; t: number; de: number; giro: number; apaga: number; children: React.ReactNode }> = ({ x, y, t, de, giro, apaga, children }) => {
  const a = cl((t - de) / 0.35);
  if (a <= 0) return null;
  const e = outBack(a);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transformOrigin: '0% 100%',
      transform: `rotate(${giro}deg) scale(${(0.82 + 0.18 * e).toFixed(4)})`, opacity: cl(a * 2.5) * (1 - 0.8 * apaga),
      background: BALAO, color: TEXTO_BALAO, borderRadius: '30px 30px 30px 8px', padding: '22px 30px',
      fontFamily: ARCHIVO, fontWeight: 500, fontSize: 40, lineHeight: 1.2, maxWidth: 700,
    }}>
      {children}
    </div>
  );
};

// comCidade = false: o explicativo desenha a cidade (contínua) por baixo; aqui só bolhas, palavra e escurecimento
export const Gancho: React.FC<{ t: number; comCidade?: boolean; vertical?: boolean }> = ({ t, comCidade = true, vertical = false }) => {
  const { width: W, height: H } = useVideoConfig();
  const prontas = useFontesProntas();
  const acende = inOut(cl((t - 5.4) / 1.2));
  const camera: Camera = { cx: 340 + 4 * Math.sin(t * 0.45), cy: 206, altura: 330 - 18 * acende };
  const apaga = cl((t - 3.4) / 0.4);

  // a palavra: "OU" + "VIU" + "?" → o "OU" cai e sobra "VIU."
  const tamanho = vertical ? 230 : 300;
  const medir = (texto: string) => (prontas ? measureText({ text: texto, fontFamily: ARCHIVO, fontWeight: '700', fontSize: tamanho, letterSpacing: '-0.015em' }).width : texto.length * tamanho * 0.62);
  const wOU = medir('OU');
  const wVIU = medir('VIU');
  const wQ = medir('?');
  const wP = medir('.');
  const surge = cl((t - 3.4) / 0.4);
  const cai = cl((t - 4.6) / 0.7);
  const anda = outCubic(cl((t - 4.7) / 0.6));
  const ouro = cl((t - 4.8) / 0.3);
  const caiQ = cl((t - 4.75) / 0.7);
  const ponto = cl((t - 5.05) / 0.4);
  const xAntes = W / 2 - (wOU + wVIU + wQ) / 2;
  const xDepois = W / 2 - (wVIU + wP) / 2;
  const xVIU = xAntes + wOU + (xDepois - (xAntes + wOU)) * anda;
  const cor = ouro > 0.5 ? COR.accent : COR.muted;
  const sobe = cl((t - 6.6) / 0.6);
  const base = H / 2 + tamanho * 0.36 - outCubic(sobe) * 210;
  const letra: React.CSSProperties = { position: 'absolute', top: base - tamanho, fontFamily: ARCHIVO, fontWeight: 700, fontSize: tamanho, lineHeight: 1, letterSpacing: '-0.015em' };

  const pinos = [
    { id: 'g1', ...LUGAR.feira, H: 66, sev: 'acc' as const, foto: 'feira' as const, t0: 5.8, f0: 0.95, f1: 0.9 },
    { id: 'g2', ...LUGAR.coreto, H: 52, sev: 'acc' as const, foto: 'show' as const, t0: 6.15, f0: 0.97, f1: 0.92 },
    { id: 'g3', ...LUGAR.posto, H: 66, sev: 'acc' as const, foto: 'fila' as const, t0: 6.45, f0: 0.98, f1: 0.95 },
    { id: 'g4', ...LUGAR.transito, H: 58, sev: 'warn' as const, foto: 'transito' as const, t0: 6.75, f0: 0.99, f1: 0.96 },
  ];

  return (
    <AbsoluteFill style={{ background: comCidade ? COR.bg : 'transparent' }}>
      {comCidade && (
        <svg width={W} height={H} viewBox={viewBox(camera, W, H)}>
          <DefsMiniatura />
          <Miniatura t={t} acesa={0.12 + 0.88 * acende}>
            {pinos.map((p) => <Pino key={p.id} p={p} t={t} />)}
          </Miniatura>
        </svg>
      )}
      <AbsoluteFill style={{ background: COR.bg, opacity: 0.66 - 0.5 * acende }} />
      <Balao x={vertical ? 70 : 150} y={vertical ? 330 : 170} t={t} de={0.3} giro={-2} apaga={apaga}>ouvi dizer que alagou a avenida…</Balao>
      <Balao x={vertical ? 300 : 1010} y={vertical ? 580 : 300} t={t} de={1.15} giro={1.5} apaga={apaga}>alguém sabe se tem show hoje?</Balao>
      <Balao x={vertical ? 90 : 300} y={vertical ? 820 : 560} t={t} de={2.0} giro={-1} apaga={apaga}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <svg width={180} height={135} style={{ borderRadius: 14, filter: 'grayscale(0.85) sepia(0.25) contrast(0.9)' }}>
            <Foto nome="alagamento" t={0.4} x={0} y={0} largura={180} altura={135} />
          </svg>
          <span>essa foto<br />é de hoje?</span>
        </div>
      </Balao>
      {surge > 0 && (
        <AbsoluteFill style={{ opacity: surge }}>
          {cai < 1 && (
            <span style={{
              ...letra, left: xAntes, color: COR.muted, transformOrigin: '50% 80%',
              transform: `translate(${(-40 * cai * cai).toFixed(1)}px, ${(560 * cai * cai).toFixed(1)}px) rotate(${(28 * cai * cai).toFixed(2)}deg)`, opacity: 1 - cai * cai,
            }}>OU</span>
          )}
          <span style={{ ...letra, left: xVIU, color: cor, transform: `scale(${(0.94 + 0.06 * outBack(surge)).toFixed(4)})`, transformOrigin: '50% 80%' }}>VIU</span>
          {caiQ < 1 && (
            <span style={{
              ...letra, left: xAntes + wOU + wVIU, color: COR.muted, transformOrigin: '50% 80%',
              transform: `translate(${(50 * caiQ * caiQ).toFixed(1)}px, ${(560 * caiQ * caiQ).toFixed(1)}px) rotate(${(-24 * caiQ * caiQ).toFixed(2)}deg)`, opacity: 1 - caiQ * caiQ,
            }}>?</span>
          )}
          {ponto > 0 && (
            <span style={{ ...letra, left: xVIU + wVIU, color: COR.accent, transformOrigin: '30% 85%', transform: `scale(${outBack(ponto).toFixed(4)})` }}>.</span>
          )}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
