// O explicativo da LP (~59 s, sem voz): texto na tela, telas reais do app, a cidade em miniatura contínua e a
// trilha (música e efeitos, misturada depois por scripts/render.mjs).
import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from 'remotion';
import { Cartela, paraTela } from '../cenas/comum';
import { Final } from '../cenas/Final';
import { Gancho } from '../cenas/Gancho';
import { DefsMiniatura } from '../hero/Hero';
import { AREAS_DESFOQUE, Desfoque } from '../ilustracoes/Desfoque';
import { LUGAR } from '../miniatura/cidade';
import { cl, inOut, iso, outBack, outCubic } from '../miniatura/iso';
import { CabecaPino, RAIO } from '../miniatura/Pino';
import { COR } from '../tema';
import { cameraNo, Mundo } from './Mundo';
import { CENAS, DURACAO, FPS, T, type NomeCena } from './roteiro';
import { geometria, Telefone, type Posicoes } from './Telefone';

export type PropsExplicativo = { posicoes: Posicoes | null; formato?: 'horizontal' | 'vertical' };

export const calcularExplicativo: CalculateMetadataFunction<PropsExplicativo> = async ({ props }) => {
  const posicoes = await fetch(staticFile('gerado/telas/posicoes.json')).then((r) => r.json());
  return { durationInFrames: Math.round(DURACAO * FPS), props: { ...props, posicoes } };
};

type Texto = { cena: NomeCena; de: number; texto: string; tamanho: number; peso?: 600 | 700; cor?: string; mt?: number };
const TEXTOS: Texto[] = [
  { cena: 'cidade', de: 7.45, texto: 'O que está\nrolando agora em\nItapetininga.', tamanho: 84 },
  { cena: 'publicar', de: 11.0, texto: 'Tire uma foto.', tamanho: 104 },
  { cena: 'publicar', de: 13.9, texto: 'Ela aparece onde\nfoi tirada.', tamanho: 62, peso: 600, mt: 28 },
  { cena: 'tempo', de: 17.0, texto: 'Só vale foto\nde agora.', tamanho: 100 },
  { cena: 'tempo', de: 18.6, texto: 'E some em até 12 h.', tamanho: 62, peso: 600, mt: 28 },
  { cena: 'confirmar', de: 21.9, texto: 'Quem está perto\nconfirma.', tamanho: 100 },
  { cena: 'alguem', de: 26.6, texto: 'Quer saber de\num lugar?', tamanho: 96 },
  { cena: 'alguem', de: 28.2, texto: 'Alguém aí?', tamanho: 112, cor: COR.accent, mt: 18 },
  { cena: 'alguem', de: 30.0, texto: 'Quem está perto pode\nresponder com foto.', tamanho: 56, peso: 600, mt: 26 },
  { cena: 'alertas', de: 33.9, texto: 'Avisos do que\nacontece perto\nde você.', tamanho: 92 },
  { cena: 'privacidade', de: 38.7, texto: 'Sem o seu\nnome.', tamanho: 100 },
  { cena: 'privacidade', de: 40.3, texto: 'Rostos e placas\ndesfocados.', tamanho: 62, peso: 600, mt: 28 },
  { cena: 'comercio', de: 43.5, texto: 'Tem um\ncomércio?', tamanho: 104 },
  { cena: 'comercio', de: 45.6, texto: 'Peça a verificação\ne divulgue no mapa.', tamanho: 60, peso: 600, mt: 28 },
  { cena: 'navegador', de: 49.4, texto: 'Funciona no\nnavegador.', tamanho: 104 },
  { cena: 'navegador', de: 50.6, texto: 'Sem baixar nada.', tamanho: 62, peso: 600, mt: 28 },
];

// O pino da feira sai da miniatura da foto, no celular, e voa em arco até o lugar na cidade
const PinoEmVoo: React.FC<{ t: number; largura: number; altura: number; posicoes: Posicoes; vertical: boolean }> = ({ t, largura, altura, posicoes, vertical }) => {
  if (t < T.voo[0] || t >= T.voo[1]) return null;
  const foto = posicoes['registrar-folha']?.foto ?? { x: 21, y: 442, w: 96, h: 96 };
  // a origem é onde a foto estava quando o dedo publicou (na vertical o celular já está saindo de cena)
  const g = geometria(T.voo[0], altura, vertical);
  const origem = g.tela(foto.x + foto.w / 2, foto.y + foto.h / 2);
  const cam = cameraNo(t, vertical);
  const k = altura / cam.altura;
  const [fx, fy] = iso(LUGAR.feira.x, LUGAR.feira.y);
  const [dx, dy] = paraTela(fx, fy - 66, cam, largura, altura);
  const controle = [(origem[0] + dx) / 2 + 60, Math.min(origem[1], dy) - 300];
  const u = inOut(cl((t - T.voo[0]) / (T.voo[1] - T.voo[0])));
  const ponto = (s: number) => [0, 1].map((i) => (1 - s) * (1 - s) * origem[i] + 2 * (1 - s) * s * controle[i] + s * s * [dx, dy][i]);
  const [px, py] = ponto(u);
  const escalaInicio = (foto.w * g.escala) / 2 / RAIO;
  const escala = escalaInicio + (k - escalaInicio) * outCubic(u);
  const rastro = Array.from({ length: 14 }, (_, i) => ponto((u * i) / 13));
  return (
    <svg width={largura} height={altura} style={{ position: 'absolute', inset: 0 }}>
      <DefsMiniatura />
      <polyline points={rastro.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')} fill="none" stroke={COR.accent} strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" opacity={0.8} />
      <g transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${escala.toFixed(3)})`}>
        <CabecaPino foto="feira" t={t} fracao={1} sev="acc" />
      </g>
    </svg>
  );
};

// A foto com gente e carro: a luz varre ("Protegendo rostos e placas…") e as elipses desfocam rostos e placa
const CartaoPrivacidade: React.FC<{ t: number; vertical: boolean }> = ({ t, vertical }) => {
  const entra = outBack(cl((t - 38.6) / 0.5));
  const sai = cl((t - 42.9) / 0.4);
  if (entra <= 0 || sai >= 1) return null;
  const b = inOut(cl((t - T.desfoque[0]) / (T.desfoque[1] - T.desfoque[0])));
  const varre = cl((t - T.protegendo) / 0.7);
  return (
    <div style={{
      position: 'absolute', left: vertical ? 240 : 900, top: vertical ? 640 : 250, width: vertical ? 600 : 420, height: vertical ? 800 : 560, borderRadius: 22, overflow: 'hidden', border: `2px solid ${COR.line}`,
      transform: `translateY(${((1 - entra) * 50 + sai * 30).toFixed(1)}px) rotate(-2deg) scale(${(0.92 + 0.08 * entra).toFixed(4)})`, opacity: cl(entra * 1.5) * (1 - sai),
    }}>
      <svg width={vertical ? 600 : 420} height={vertical ? 800 : 560} viewBox="0 0 300 400">
        <defs>
          <filter id="borra-forte" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="borda-suave" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
          <mask id="areas-desfoque">
            <g filter="url(#borda-suave)">
              {AREAS_DESFOQUE.map((a, i) => <ellipse key={i} cx={a.cx} cy={a.cy} rx={a.rx * 1.15 * b} ry={a.ry * 1.15 * b} fill="#fff" />)}
            </g>
          </mask>
          <linearGradient id="varredura" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff2c4" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff2c4" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff2c4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <Desfoque t={t} />
        {b > 0 && <g mask="url(#areas-desfoque)"><g filter="url(#borra-forte)"><Desfoque t={t} /></g></g>}
        {varre > 0 && varre < 1 && <rect x={0} y={-120 + varre * 520} width={300} height={110} fill="url(#varredura)" />}
      </svg>
    </div>
  );
};

export const Explicativo: React.FC<PropsExplicativo> = ({ posicoes, formato = 'horizontal' }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const t = frame / FPS;
  const vertical = formato === 'vertical';
  // na vertical o texto fica em cima, menor, e o véu escuro desce do topo
  const escalaTexto = vertical ? 0.8 : 1;
  const degrade = vertical
    ? `linear-gradient(180deg, ${COR.bg} 0%, rgba(12,10,8,.9) 22%, rgba(12,10,8,.35) 34%, rgba(12,10,8,0) 42%)`
    : `linear-gradient(90deg, ${COR.bg} 0%, rgba(12,10,8,.9) 33%, rgba(12,10,8,.35) 50%, rgba(12,10,8,0) 62%)`;
  const colunaTexto: React.CSSProperties = vertical
    ? { position: 'absolute', left: 72, top: 250, width: 900, display: 'flex', flexDirection: 'column' }
    : { position: 'absolute', left: 140, top: 0, bottom: 0, width: 780, display: 'flex', flexDirection: 'column', justifyContent: 'center' };
  const pos = posicoes ?? {};
  const veu = cl((t - 7.0) / 0.6) * (1 - cl((t - T.marca + 0.2) / 0.4));
  const escurecePrivacidade = cl((t - 38.5) / 0.5) * (1 - cl((t - 43.0) / 0.5));
  const ganchoSome = 1 - cl((t - 7.2) / 0.35);
  const final = cl((t - T.marca) / 0.6);
  const porCena = Object.keys(CENAS).map((c) => [c as NomeCena, TEXTOS.filter((x) => x.cena === c)] as const).filter(([, l]) => l.length);

  return (
    <AbsoluteFill style={{ background: COR.bg, overflow: 'hidden' }}>
      <Mundo t={t} largura={W} altura={H} vertical={vertical} />
      {escurecePrivacidade > 0 && <AbsoluteFill style={{ background: COR.bg, opacity: 0.55 * escurecePrivacidade }} />}
      {veu > 0 && (
        <AbsoluteFill style={{ opacity: veu, background: degrade }} />
      )}
      {ganchoSome > 0 && t < 8 && <AbsoluteFill style={{ opacity: ganchoSome }}><Gancho t={t} comCidade={false} vertical={vertical} /></AbsoluteFill>}
      {porCena.map(([cena, lista]) => {
        const [de, ate] = CENAS[cena];
        if (t < de - 0.2 || t > ate + 0.2) return null;
        return (
          <div key={cena} style={colunaTexto}>
            {lista.map((x) => (
              <Cartela key={x.texto} texto={x.texto} t={t} de={x.de} tamanho={Math.round(x.tamanho * escalaTexto)} peso={x.peso ?? 700} cor={x.cor} saida={ate - 0.35} style={{ marginTop: (x.mt ?? 0) * escalaTexto }} />
            ))}
          </div>
        );
      })}
      <CartaoPrivacidade t={t} vertical={vertical} />
      <Telefone t={t} alturaQuadro={H} posicoes={pos} vertical={vertical} />
      <PinoEmVoo t={t} largura={W} altura={H} posicoes={pos} vertical={vertical} />
      {final > 0 && <AbsoluteFill style={{ opacity: final }}><Final t={t - T.marca} vertical={vertical} /></AbsoluteFill>}
    </AbsoluteFill>
  );
};
