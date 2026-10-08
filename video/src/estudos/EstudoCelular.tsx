// Estudo do celular: quatro direções para o aparelho do explicativo, no mesmo instante (13 s, o toque em
// "Publicar", com a foto saindo como pino rumo à feira). Saem como quadros parados para escolher no Claude Design
// (scripts/estudo-celular.mjs); não entram no vídeo.
//   mao      o aparelho na mão de alguém da cidade; o polegar toca de verdade
//   maquete  o aparelho de pé ao lado da maquete, na mesma projeção isométrica e na mesma luz
//   solta    sem aparelho: a folha do app sobe da borda do quadro, grande
//   premium  aparelho bem acabado, girado em 3D, com espessura, aro e reflexo
import React from 'react';
import { AbsoluteFill, Img, staticFile, useVideoConfig, type CalculateMetadataFunction } from 'remotion';
import { Cartela, paraTela } from '../cenas/comum';
import { BarraStatus, STATUS, TELA } from '../componentes/Celular';
import { ALTURA_TELA, CelularNaMao, Corpo, medidas, naTela, PESSOAS, type P } from '../componentes/Mao';
import { cameraNo, Mundo } from '../explicativo/Mundo';
import type { Caixa, Posicoes } from '../explicativo/Telefone';
import { DefsMiniatura } from '../hero/Hero';
import { LUGAR } from '../miniatura/cidade';
import { iso, outCubic } from '../miniatura/iso';
import { CabecaPino, RAIO } from '../miniatura/Pino';
import { COR } from '../tema';

export type Direcao = 'mao' | 'maquete' | 'solta' | 'premium';
export type PropsEstudo = { direcao: Direcao; formato: 'horizontal' | 'vertical'; posicoes: Posicoes | null };

export const calcularEstudo: CalculateMetadataFunction<PropsEstudo> = async ({ props }) => {
  const posicoes = await fetch(staticFile('gerado/telas/posicoes.json')).then((r) => r.json());
  return { props: { ...props, posicoes } };
};

const T_QUADRO = 13.0;
const PONTO_TOQUE = { x: 335, y: 803 }; // onde o dedo aperta "Publicar" (à direita do texto, para não cobri-lo)

const caixas = (pos: Posicoes) => ({
  publicar: pos['registrar-folha']?.publicar ?? { x: 21, y: 779, w: 348, h: 48 },
  foto: pos['registrar-folha']?.foto ?? { x: 21, y: 442, w: 96, h: 96 },
});

// A folha de registro como está no instante: "Publicar" apertado e o lugar da foto vazio (a foto virou o pino)
const Folha: React.FC<{ publicar: Caixa; foto: Caixa; anel?: boolean }> = ({ publicar, foto, anel = false }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: TELA.largura, height: TELA.altura }}>
    <Img src={staticFile('gerado/telas/registrar-folha.png')} style={{ width: TELA.largura, height: TELA.altura, display: 'block' }} />
    <div style={{ position: 'absolute', left: foto.x, top: foto.y, width: foto.w, height: foto.h, borderRadius: 10, background: COR.surface, border: `1.5px dashed ${COR.line}`, boxSizing: 'border-box' }} />
    <div style={{ position: 'absolute', left: publicar.x, top: publicar.y, width: publicar.w, height: publicar.h, borderRadius: 12, background: 'rgba(0,0,0,.24)' }} />
    {anel && (
      <>
        <div style={{ position: 'absolute', left: PONTO_TOQUE.x - 30, top: PONTO_TOQUE.y - 30, width: 60, height: 60, borderRadius: 30, border: `2.5px solid ${COR.ink}`, opacity: 0.55, boxSizing: 'border-box' }} />
        <div style={{ position: 'absolute', left: PONTO_TOQUE.x - 46, top: PONTO_TOQUE.y - 46, width: 92, height: 92, borderRadius: 46, border: `2px solid ${COR.ink}`, opacity: 0.22, boxSizing: 'border-box' }} />
      </>
    )}
  </div>
);

const TelaInteira: React.FC<{ pos: Posicoes; anel?: boolean }> = ({ pos, anel }) => {
  const c = caixas(pos);
  return (
    <div style={{ width: TELA.largura, height: ALTURA_TELA, position: 'relative', background: COR.bg, overflow: 'hidden' }}>
      <BarraStatus />
      <div style={{ position: 'absolute', left: 0, top: STATUS }}>
        <Folha publicar={c.publicar} foto={c.foto} anel={anel} />
      </div>
    </div>
  );
};

// O pino saindo: a foto sobe em arco rumo à feira (u = fração do caminho), com o rastro tracejado do app
const PinoSaindo: React.FC<{ origem: P; raio0: number; W: number; H: number; vertical: boolean; u?: number }> = ({ origem, raio0, W, H, vertical, u = 0.3 }) => {
  const arco = 170;
  const cam = cameraNo(T_QUADRO, vertical);
  const k = H / cam.altura;
  const [fx, fy] = iso(LUGAR.feira.x, LUGAR.feira.y);
  const destino = paraTela(fx, fy - 66, cam, W, H);
  const controle: P = [(origem[0] + destino[0]) / 2 + 60, Math.min(origem[1], destino[1]) - arco];
  const ponto = (s: number): P => [0, 1].map((i) => (1 - s) * (1 - s) * origem[i] + 2 * (1 - s) * s * controle[i] + s * s * destino[i]) as P;
  const [px, py] = ponto(u);
  const e0 = raio0 / RAIO;
  const escala = e0 + (k - e0) * outCubic(u);
  const rastro = Array.from({ length: 12 }, (_, i) => ponto((u * i) / 11));
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <DefsMiniatura />
      <polyline points={rastro.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')} fill="none" stroke={COR.accent} strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" opacity={0.8} />
      <g transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) scale(${escala.toFixed(3)})`}>
        <CabecaPino foto="feira" t={T_QUADRO} fracao={1} sev="acc" />
      </g>
    </svg>
  );
};

const girar = ([x, y]: P, [cx, cy]: P, graus: number): P => {
  const a = (graus * Math.PI) / 180;
  return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
};

// ── A · na mão ──────────────────────────────────────────────────────────────────────────────────────────────────
// Mão direita, chapada como as pessoas das ilustrações (duas cores, sem contorno): dedos dobrando a borda esquerda,
// palma atrás do aparelho, polegar por cima da tela apertando o botão. Na vertical aparecem o antebraço e a manga.
const NaMao: React.FC<{ pos: Posicoes; W: number; H: number; vertical: boolean }> = ({ pos, W, H, vertical }) => {
  const m = medidas(vertical ? 960 : 860);
  const cx = vertical ? 540 : 1210;
  const topo = vertical ? 520 : 52;
  const giro = vertical ? -4 : -6;
  const esquerda = cx - m.L / 2;
  const c = caixas(pos);
  const ponta = naTela(m, PONTO_TOQUE.x, PONTO_TOQUE.y);
  const [ox, oy] = girar(naTela(m, c.foto.x + c.foto.w / 2, c.foto.y + c.foto.h / 2), [m.L / 2, m.A / 2], giro);
  return (
    <>
      <div style={{ position: 'absolute', left: esquerda, top: topo, width: m.L, height: m.A, transform: `rotate(${giro}deg)` }}>
        <CelularNaMao m={m} pessoa={PESSOAS.publica} ponta={ponta} onda={{ ponto: ponta, p: 0.4 }} id="estudo">
          <TelaInteira pos={pos} />
        </CelularNaMao>
      </div>
      <PinoSaindo origem={[esquerda + ox, topo + oy]} raio0={(c.foto.w * m.escala) / 2} W={W} H={H} vertical={vertical} u={vertical ? 0.06 : 0.75} />
    </>
  );
};

// ── B · peça da maquete ─────────────────────────────────────────────────────────────────────────────────────────
// O aparelho de pé ao lado da maquete, na projeção 2:1 da cidade: a tela fica na face que olha para a direita (a
// mesma dos prédios), a espessura sobe para a esquerda e o topo pega a luz como os telhados. A tela acende o chão.
const NaMaquete: React.FC<{ pos: Posicoes; W: number; H: number; vertical: boolean }> = ({ pos, W, H, vertical }) => {
  const altura = vertical ? 860 : 780;
  const bisel = 14;
  const escala = (altura - 2 * bisel) / ALTURA_TELA;
  const largura = TELA.largura * escala + 2 * bisel;
  const raio = largura * 0.155;
  const [x0, y0] = vertical ? [372, 650] : [960, 272];
  const [a, b] = [0.894, -0.447]; // um px ao longo da face: 0,894 para a direita, 0,447 para cima
  const m = (dx: number, dy: number) => `matrix(${a}, ${b}, 0, 1, ${(x0 + dx).toFixed(2)}, ${(y0 + dy).toFixed(2)})`;
  const espessura = 40;
  const c = caixas(pos);
  const face = (u: number, v: number): P => [x0 + a * u, y0 + b * u + v];
  const [ox, oy] = face(bisel + (c.foto.x + c.foto.w / 2) * escala, bisel + (STATUS + c.foto.y + c.foto.h / 2) * escala);
  const [bx, by] = face(largura / 2, altura);
  return (
    <>
      <div style={{ position: 'absolute', left: bx + 90 - 300, top: by + 45 - 150, width: 600, height: 300, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(226,214,186,.26), rgba(226,214,186,.08) 60%, rgba(226,214,186,0))' }} />
      {Array.from({ length: espessura }, (_, i) => espessura - i).map((k) => (
        <div key={k} style={{ position: 'absolute', left: 0, top: 0, width: largura, height: altura, borderRadius: raio, transformOrigin: '0 0', transform: m(-a * k, b * k), background: 'linear-gradient(180deg, #6b5a43 0, #6b5a43 28px, #2c261f 30px, #221d18 100%)' }} />
      ))}
      <div style={{ position: 'absolute', left: 0, top: 0, width: largura, height: altura, transformOrigin: '0 0', transform: m(0, 0) }}>
        <Corpo largura={largura} altura={altura} bisel={bisel}>
          <TelaInteira pos={pos} anel />
        </Corpo>
      </div>
      <PinoSaindo origem={[ox, oy]} raio0={(c.foto.w * escala) / 2} W={W} H={H} vertical={vertical} u={vertical ? 0.06 : 0.75} />
    </>
  );
};

// ── C · sem aparelho ────────────────────────────────────────────────────────────────────────────────────────────
// A folha do app sobe da borda de baixo do quadro, como sobe da borda da tela no celular, 1,5× maior que hoje.
// Na vertical vira um cartão no meio (embaixo ficam os botões do Reels).
const Solta: React.FC<{ pos: Posicoes; W: number; H: number; vertical: boolean }> = ({ pos, W, H, vertical }) => {
  const TOPO = 362; // logo abaixo da borda de cima da folha na captura (a borda é redesenhada)
  const e = vertical ? 1.8 : 1.5;
  const w = TELA.largura * e;
  const h = (TELA.altura - TOPO) * e;
  const esquerda = vertical ? W / 2 - w / 2 : 1180 - w / 2;
  const topo = vertical ? 590 : H - h;
  const raio = 16 * e;
  const c = caixas(pos);
  const origem: P = [esquerda + (c.foto.x + c.foto.w / 2) * e, topo + (c.foto.y + c.foto.h / 2 - TOPO) * e];
  return (
    <>
      <div style={{ position: 'absolute', left: esquerda, top: topo, width: w, height: h, borderRadius: vertical ? raio : `${raio}px ${raio}px 0 0`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: -TOPO * e, transform: `scale(${e})`, transformOrigin: '0 0' }}>
          <Folha publicar={c.publicar} foto={c.foto} anel />
        </div>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', borderTop: '2px solid #5b554c', borderLeft: '2px solid #5b554c', borderRight: '2px solid #5b554c', borderBottom: vertical ? '2px solid #5b554c' : 'none' }} />
      </div>
      <PinoSaindo origem={origem} raio0={(c.foto.w * e) / 2} W={W} H={H} vertical={vertical} u={vertical ? 0.06 : 0.75} />
    </>
  );
};

// ── D · aparelho de verdade ─────────────────────────────────────────────────────────────────────────────────────
// Girado em 3D, virado para o texto. A espessura é feita de camadas finas (o aro polido pega o ouro da feira).
const projetar = (p: P, largura: number, altura: number, ry: number, rx: number, rz: number, perspectiva: number): P => {
  const r = (g: number) => (g * Math.PI) / 180;
  let x = p[0] - largura / 2;
  let y = p[1] - altura / 2;
  let z = 0;
  [x, y] = [x * Math.cos(r(rz)) - y * Math.sin(r(rz)), x * Math.sin(r(rz)) + y * Math.cos(r(rz))];
  [y, z] = [y * Math.cos(r(rx)) - z * Math.sin(r(rx)), y * Math.sin(r(rx)) + z * Math.cos(r(rx))];
  [x, z] = [x * Math.cos(r(ry)) + z * Math.sin(r(ry)), -x * Math.sin(r(ry)) + z * Math.cos(r(ry))];
  const w = 1 - z / perspectiva;
  return [largura / 2 + x / w, altura / 2 + y / w];
};

const misturar = (c1: string, c2: string, k: number) => {
  const n1 = parseInt(c1.slice(1), 16);
  const n2 = parseInt(c2.slice(1), 16);
  const canal = (s: number) => Math.round(((n1 >> s) & 255) * (1 - k) + ((n2 >> s) & 255) * k);
  return `rgb(${canal(16)},${canal(8)},${canal(0)})`;
};

const Premium: React.FC<{ pos: Posicoes; W: number; H: number; vertical: boolean }> = ({ pos, W, H, vertical }) => {
  const altura = vertical ? 900 : 880;
  const bisel = 14;
  const escala = (altura - 2 * bisel) / ALTURA_TELA;
  const largura = TELA.largura * escala + 2 * bisel;
  const raio = largura * 0.155;
  const [cx, cy] = vertical ? [540, 1010] : [1190, 545];
  const [ry, rx, rz, perspectiva] = vertical ? [-18, 7, -1.5, 1800] : [-24, 7, -2.5, 1700];
  const espessura = 22;
  const esquerda = cx - largura / 2;
  const topo = cy - altura / 2;
  const c = caixas(pos);
  const [ox, oy] = projetar([bisel + (c.foto.x + c.foto.w / 2) * escala, bisel + (STATUS + c.foto.y + c.foto.h / 2) * escala], largura, altura, ry, rx, rz, perspectiva);
  return (
    <>
      <div style={{ position: 'absolute', left: esquerda, top: topo, width: largura, height: altura, transformStyle: 'preserve-3d', transform: `perspective(${perspectiva}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg)` }}>
        {Array.from({ length: espessura }, (_, i) => espessura - i).map((k) => {
          const fr = (espessura - k) / (espessura - 1);
          const brilho = Math.exp(-(((fr - 0.5) / 0.24) ** 2));
          return <div key={k} style={{ position: 'absolute', inset: 0, borderRadius: raio, background: misturar('#120f0c', '#a8854f', brilho * 0.9), transform: `translateZ(${-k}px)` }} />;
        })}
        <div style={{ position: 'absolute', left: largura - 3, top: altura * 0.28, width: 9, height: altura * 0.11, borderRadius: 4, background: '#7a5f3a', transform: `translateZ(${-espessura / 2}px)` }} />
        <div style={{ position: 'absolute', inset: 0, transform: 'translateZ(0.5px)' }}>
          <Corpo largura={largura} altura={altura} bisel={bisel}>
            <TelaInteira pos={pos} anel />
          </Corpo>
        </div>
      </div>
      <PinoSaindo origem={[esquerda + ox, topo + oy]} raio0={(c.foto.w * escala) / 2} W={W} H={H} vertical={vertical} u={vertical ? 0.06 : 0.75} />
    </>
  );
};

export const EstudoCelular: React.FC<PropsEstudo> = ({ direcao, formato, posicoes }) => {
  const { width: W, height: H } = useVideoConfig();
  const vertical = formato === 'vertical';
  const pos = posicoes ?? {};
  const escalaTexto = vertical ? 0.8 : 1;
  const degrade = vertical
    ? `linear-gradient(180deg, ${COR.bg} 0%, rgba(12,10,8,.9) 22%, rgba(12,10,8,.35) 34%, rgba(12,10,8,0) 42%)`
    : `linear-gradient(90deg, ${COR.bg} 0%, rgba(12,10,8,.9) 33%, rgba(12,10,8,.35) 50%, rgba(12,10,8,0) 62%)`;
  const coluna: React.CSSProperties = vertical
    ? { position: 'absolute', left: 72, top: 250, width: 900, display: 'flex', flexDirection: 'column' }
    : { position: 'absolute', left: 140, top: 0, bottom: 0, width: 780, display: 'flex', flexDirection: 'column', justifyContent: 'center' };
  const Aparelho = { mao: NaMao, maquete: NaMaquete, solta: Solta, premium: Premium }[direcao];
  return (
    <AbsoluteFill style={{ background: COR.bg, overflow: 'hidden' }}>
      <Mundo t={T_QUADRO} largura={W} altura={H} vertical={vertical} />
      <AbsoluteFill style={{ background: degrade }} />
      <div style={coluna}>
        <Cartela texto="Tire uma foto." t={T_QUADRO} de={11.0} tamanho={Math.round(104 * escalaTexto)} />
      </div>
      <Aparelho pos={pos} W={W} H={H} vertical={vertical} />
    </AbsoluteFill>
  );
};
