// O celular do explicativo na mão de alguém da cidade (componentes/Mao.tsx), com as telas reais do app
// (scripts/capturar-telas.mjs) vivas: as folhas e os cartões sobem sobre o mapa como no app (recortados das
// capturas), o polegar toca onde o botão está de verdade e, nos stories, a ilustração animada fica por baixo da
// interface. Cada cena tem uma pessoa: o aparelho troca de mão nas viradas de cena.
import React from 'react';
import { Img, staticFile } from 'remotion';
import { BarraStatus, STATUS, TELA } from '../componentes/Celular';
import { CelularNaMao, medidas, naTela, PESSOAS, pontaEmRepouso, type Medidas, type P, type Pessoa } from '../componentes/Mao';
import { Marca } from '../componentes/Marca';
import { Foto } from '../ilustracoes';
import { cl, inOut, outBack, outCubic } from '../miniatura/iso';
import { COR } from '../tema';
import { T } from './roteiro';

export type Caixa = { x: number; y: number; w: number; h: number };
export type Posicoes = Record<string, Record<string, Caixa>>;

// ── Quem segura o celular, quando e onde ────────────────────────────────────────────────────────────────────────
// x: centro no quadro ao longo do tempo (s absolutos). atraso: a entrada espera a mão anterior sair (mesmo lugar).
type Aparicao = { de: number; ate: number; pessoa: Pessoa; x: Array<[number, number]>; atraso?: number };
const APARICOES: Aparicao[] = [
  { de: 10.8, ate: 16.8, pessoa: PESSOAS.publica, x: [[0, 1180]] },
  { de: 21.6, ate: 26.4, pessoa: PESSOAS.confirma, x: [[0, 1180]] },
  { de: 26.4, ate: 38.4, pessoa: PESSOAS.pergunta, x: [[0, 1400], [33.4, 1400], [33.9, 1180]] },
  { de: 38.4, ate: 43.2, pessoa: PESSOAS.protege, x: [[0, 1560]] },
  { de: 43.2, ate: 49.2, pessoa: PESSOAS.comercio, x: [[0, 1180]] },
  { de: 49.2, ate: 52.8, pessoa: PESSOAS.publica, x: [[0, 1180]], atraso: 0.15 },
];
// Na vertical o celular sai nas horas em que o pino pousa (a câmera corta para a cidade)
const APARICOES_V: Aparicao[] = [
  { de: 10.8, ate: 13.45, pessoa: PESSOAS.publica, x: [[0, 540]] },
  { de: 21.6, ate: 26.4, pessoa: PESSOAS.confirma, x: [[0, 540]] },
  { de: 26.4, ate: 28.1, pessoa: PESSOAS.pergunta, x: [[0, 540]], atraso: 0.15 },
  { de: 33.6, ate: 38.4, pessoa: PESSOAS.pergunta, x: [[0, 540]] },
  { de: 43.2, ate: 46.95, pessoa: PESSOAS.comercio, x: [[0, 540]] },
  { de: 49.2, ate: 52.8, pessoa: PESSOAS.publica, x: [[0, 540]] },
];
// Tamanho e altura do aparelho. No 16:9 ele fica um pouco mais alto para a manga aparecer na borda de baixo; na
// vertical, entre o texto (em cima) e a zona dos botões do Reels (abaixo de ~1490 px).
const ALTURA = 840;
const TOPO = 40;
const ALTURA_V = 960;
const TOPO_V = 520;
const ENTRA = 0.6;
const SAI = 0.5;

const xNo = (pontos: Array<[number, number]>, t: number) => {
  let x = pontos[0][1];
  for (let i = 1; i < pontos.length; i++) {
    const [t0, x0] = pontos[i - 1];
    const [t1, x1] = pontos[i];
    if (t >= t0 && t < t1) x = x0 + (x1 - x0) * inOut(cl((t - t0) / (t1 - t0)));
    else if (t >= t1) x = x1;
  }
  return x;
};

// Pose do aparelho: sobe de baixo girando e assenta (com um balanço leve de quem segura); na saída cai girando
const pose = (a: Aparicao, t: number, vertical: boolean) => {
  const t0 = a.de + (a.atraso ?? 0);
  if (t < t0 - 0.02 || t > a.ate + SAI) return null;
  const entra = outBack(cl((t - t0) / ENTRA));
  const sai = cl((t - a.ate) / SAI);
  const vida = (2 * Math.PI * (t - t0)) / 4.8;
  const giro = (vertical ? -4 : -6) - 9 * (1 - entra) + 14 * sai * sai + 0.5 * Math.sin(vida);
  const dy = 1050 * (1 - entra) + 1200 * sai * sai + 3 * Math.sin(vida + 1.3);
  return { x: xNo(a.x, t), giro, dy };
};

// ── O polegar ───────────────────────────────────────────────────────────────────────────────────────────────────
// Cada toque: o polegar sai do repouso (na borda), vai até o ponto, aperta (o botão afunda) e volta. O ponto fica à
// direita do texto do botão, para não cobri-lo.
type Toque = { t: number; ponto: P; caixa: (p: Posicoes) => Caixa | undefined; confirma?: boolean };
const TOQUES: Toque[] = [
  { t: T.toqueRegistrar, ponto: [335, 804], caixa: () => ({ x: 86, y: 780, w: 288, h: 48 }) },
  { t: T.toquePublicar, ponto: [335, 803], caixa: (p) => p['registrar-folha']?.publicar },
  { t: T.toqueRolando, ponto: [200, 735], caixa: (p) => p.story?.rolando, confirma: true },
  { t: T.toquePerguntar, ponto: [330, 792], caixa: (p) => p.pergunta?.perguntar },
  { t: T.toqueAlertas, ponto: [330, 799], caixa: (p) => p.alertas?.ligar },
  { t: T.toquePedir, ponto: [330, 735], caixa: (p) => p.comercio?.pedir },
];
const apertoNo = (q: Toque, t: number) => cl((t - (q.t - 0.03)) / 0.05) * (1 - cl((t - (q.t + 0.1)) / 0.06));

const polegar = (m: Medidas, a: Aparicao, t: number) => {
  const repouso = pontaEmRepouso(m);
  const q = TOQUES.find((x) => x.t >= a.de && x.t < a.ate && t > x.t - 0.4 && t < x.t + 0.6);
  if (!q) return { ponta: repouso, aperto: 0 };
  const alvo = naTela(m, q.ponto[0], q.ponto[1]);
  const f = inOut(cl((t - (q.t - 0.38)) / 0.32)) * (1 - inOut(cl((t - (q.t + 0.16)) / 0.4)));
  const ponta: P = [repouso[0] + (alvo[0] - repouso[0]) * f, repouso[1] + (alvo[1] - repouso[1]) * f];
  return { ponta, aperto: apertoNo(q, t), onda: { ponto: alvo, p: cl((t - q.t) / 0.5) } };
};

// ── As telas (em px de CSS da captura, 390×844, abaixo da barra de status) ─────────────────────────────────────
const Captura: React.FC<{ nome: string; style?: React.CSSProperties }> = ({ nome, style }) => (
  <Img src={staticFile(`gerado/telas/${nome}.png`)} style={{ position: 'absolute', left: 0, top: 0, width: TELA.largura, height: TELA.altura, ...style }} />
);

const sobeDesce = (t: number, sobe: number, desce?: number) =>
  outCubic(cl((t - sobe) / 0.42)) * (desce === undefined ? 1 : 1 - inOut(cl((t - desce) / 0.32)));

// Folha do app subindo sobre o mapa: o mapa escurece (o véu do app, preto a 55%) e a folha, recortada da captura
// a partir da borda de cima, sobe da borda de baixo. `desce` faz o caminho de volta.
const Folha: React.FC<{ t: number; captura: string; topo: number; sobe: number; desce?: number; children?: React.ReactNode }> = ({ t, captura, topo, sobe, desce, children }) => {
  const s = sobeDesce(t, sobe, desce);
  if (s <= 0) return null;
  const h = TELA.altura - topo;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: 0.55 * s }} />
      <div style={{ position: 'absolute', left: 0, top: topo + (1 - s) * (h + 12), width: TELA.largura, height: h, borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: -topo, width: TELA.largura, height: TELA.altura }}>
          <Captura nome={captura} />
          {children}
        </div>
      </div>
    </>
  );
};

// Cartão flutuante (o "Alguém aí?" e o aviso de instalar): sobe da borda de baixo até o lugar dele
const Cartao: React.FC<{ t: number; captura: string; caixa: Caixa; sobe: number; desce?: number }> = ({ t, captura, caixa, sobe, desce }) => {
  const s = sobeDesce(t, sobe, desce);
  if (s <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: caixa.x, top: caixa.y + (1 - s) * (TELA.altura - caixa.y + 12), width: caixa.w, height: caixa.h, borderRadius: 16, overflow: 'hidden' }}>
      <Captura nome={captura} style={{ left: -caixa.x, top: -caixa.y }} />
    </div>
  );
};

// A câmera olhando a feira (a foto que vai ser publicada), em tela cheia, focando
const Camera: React.FC<{ t: number }> = ({ t }) => {
  const z = 1.1 - 0.1 * outCubic(cl((t - T.camera[0]) / 0.35));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: TELA.largura, height: TELA.altura + STATUS, overflow: 'hidden', background: '#000' }}>
      <svg width={TELA.largura} height={TELA.altura + STATUS} style={{ position: 'absolute', inset: 0, transform: `scale(${z.toFixed(4)})`, transformOrigin: '50% 55%' }}>
        <Foto nome="feira" t={t} x={0} y={0} largura={TELA.largura} altura={TELA.altura + STATUS} />
      </svg>
    </div>
  );
};

const FOTO_REGISTRO: Caixa = { x: 21, y: 442, w: 96, h: 96 };

// Registrar: o mapa escurece, a folha sobe com a foto; depois do "Publicar" a foto sai como pino (fica o lugar
// vazio), a folha desce e o mapa já mostra o "No ar"
const Registrar: React.FC<{ t: number; pos: Posicoes }> = ({ t, pos }) => {
  const f = pos['registrar-folha']?.foto ?? FOTO_REGISTRO;
  const noAr = cl((t - (T.voo[0] + 0.05)) / 0.3);
  return (
    <>
      <Captura nome="mapa" />
      {noAr > 0 && <Captura nome="registrar-no-ar" style={{ opacity: noAr }} />}
      <Folha t={t} captura="registrar-folha" topo={361} sobe={T.folha} desce={T.voo[0]}>
        {t >= T.voo[0] && (
          <div style={{ position: 'absolute', left: f.x, top: f.y, width: f.w, height: f.h, borderRadius: 10, background: COR.surface, border: `1.5px dashed ${COR.line}`, boxSizing: 'border-box' }} />
        )}
      </Folha>
    </>
  );
};

const CARTAO_PERGUNTA: Caixa = { x: 16, y: 601, w: 358, h: 234 };
// "Alguém aí?": o modo de pergunta esconde os filtros e a barra de baixo (a captura entra por cima do mapa, com um
// buraco onde o cartão vai ficar) e o cartão sobe; depois do toque, tudo volta e o pedido fica no mapa
const Pergunta: React.FC<{ t: number }> = ({ t }) => {
  const s = sobeDesce(t, T.perguntaSobe, T.perguntaDesce);
  const c = CARTAO_PERGUNTA;
  return (
    <>
      <Captura nome="mapa" />
      {s > 0 && <Captura nome="pergunta" style={{ opacity: s, clipPath: `path(evenodd, 'M0 0 H390 V844 H0 Z M${c.x} ${c.y} H${c.x + c.w} V${c.y + c.h} H${c.x} Z')` }} />}
      <Cartao t={t} captura="pergunta" caixa={c} sobe={T.perguntaSobe} desce={T.perguntaDesce} />
    </>
  );
};

const Alertas: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Captura nome="mapa" />
    <Folha t={t} captura="alertas" topo={288} sobe={T.alertasSobe} desce={T.alertasDesce} />
  </>
);

const Comercio: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Captura nome="mapa" />
    <Folha t={t} captura="comercio" topo={216} sobe={T.comercioSobe} />
  </>
);

const CARTAO_INSTALAR: Caixa = { x: 16, y: 682, w: 358, h: 146 };
// O aviso de instalar sobe sobre a barra de baixo (que vem da captura do mapa no mesmo lugar)
const Instalar: React.FC<{ t: number }> = ({ t }) => {
  const c = CARTAO_INSTALAR;
  return (
    <>
      <Captura nome="instalar" />
      <div style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, overflow: 'hidden' }}>
        <Captura nome="registrar-no-ar" style={{ left: -c.x, top: -c.y }} />
      </div>
      <Cartao t={t} captura="instalar" caixa={c} sobe={T.instalar} />
    </>
  );
};

const Story: React.FC<{ t: number; foto: 'feira' | 'comercio'; camada: string }> = ({ t, foto, camada }) => (
  <>
    <svg width={TELA.largura} height={TELA.altura} style={{ position: 'absolute', inset: 0 }}>
      <Foto nome={foto} t={t} x={0} y={0} largura={TELA.largura} altura={TELA.altura} />
    </svg>
    <Captura nome={camada} />
  </>
);

type Tela = { de: number; entrada?: 'fade' | 'empurrar' | 'corte'; cheia?: boolean; C: React.FC<{ t: number; pos: Posicoes }> };
const TELAS: Tela[] = [
  { de: 10.8, C: () => <Captura nome="mapa" /> },
  { de: T.camera[0], entrada: 'corte', cheia: true, C: Camera },
  { de: T.camera[1], entrada: 'corte', C: Registrar },
  { de: 21.6, C: ({ t }) => <Story t={t} foto="feira" camada="story-camada" /> },
  { de: 26.4, C: Pergunta },
  { de: 33.6, entrada: 'corte', C: Alertas },
  { de: 38.4, C: () => <Captura nome="privacidade-protegendo" /> },
  { de: T.noAr - 0.05, entrada: 'fade', C: () => <Captura nome="privacidade-no-ar" /> },
  { de: 43.2, C: Comercio },
  { de: T.divulgacao, entrada: 'empurrar', C: ({ t }) => <Story t={t} foto="comercio" camada="divulgacao-camada" /> },
  { de: 49.2, C: Instalar },
];

const Notificacao: React.FC<{ t: number }> = ({ t }) => {
  const a = cl((t - T.aviso) / 0.45);
  const sai = cl((t - (T.aviso + 2.6)) / 0.4);
  if (a <= 0 || sai >= 1) return null;
  const y = -120 + 132 * outBack(a) - 140 * sai * sai;
  return (
    <div style={{ position: 'absolute', left: 10, right: 10, top: y, borderRadius: 18, background: '#211c15', border: `1px solid ${COR.line}`, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', color: COR.ink }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: COR.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Marca largura={30} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COR.muted }}><span>Viu na Cidade</span><span>agora</span></div>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>Trânsito perto de você</div>
      </div>
    </div>
  );
};

// O que a tela do aparelho mostra. Depois que a mão sai, a tela fica na última imagem dela.
const ConteudoTela: React.FC<{ t: number; a: Aparicao; pos: Posicoes }> = ({ t, a, pos }) => {
  const lista = TELAS.filter((s) => s.de >= a.de - 0.05 && s.de < a.ate);
  const tt = Math.min(t, a.ate - 0.001);
  const visiveis = lista.filter((s, i) => tt >= s.de || i === 0);
  const atual = visiveis.length - 1;
  const cheia = visiveis[atual]?.cheia;
  const flash = t >= T.obturador && a.de <= T.obturador && a.ate > T.obturador ? 1 - cl((t - T.obturador) / 0.22) : 0;
  return (
    <div style={{ width: TELA.largura, height: TELA.altura + STATUS, position: 'relative', background: COR.bg, overflow: 'hidden' }}>
      <BarraStatus />
      <div style={{ position: 'absolute', left: 0, top: STATUS, width: TELA.largura, height: TELA.altura, overflow: 'hidden' }}>
        {visiveis.map((s, i) => {
          if (i < atual - 1 || s.cheia) return null;
          if (i === atual - 1 && (visiveis[atual].entrada ?? 'corte') === 'corte') return null;
          const proxima = visiveis[i + 1];
          const estilo: React.CSSProperties = { position: 'absolute', inset: 0 };
          const p = cl((tt - s.de) / 0.35);
          if (i > 0 && s.entrada === 'fade') estilo.opacity = p;
          if (i > 0 && s.entrada === 'empurrar') estilo.transform = `translateX(${((1 - outCubic(p)) * TELA.largura).toFixed(1)}px)`;
          if (proxima && proxima.entrada === 'empurrar') {
            const q = outCubic(cl((tt - proxima.de) / 0.35));
            estilo.transform = `translateX(${(-q * TELA.largura * 0.3).toFixed(1)}px)`;
            estilo.filter = `brightness(${(1 - 0.3 * q).toFixed(3)})`;
          }
          return (
            <div key={s.de} style={estilo}>
              <s.C t={t} pos={pos} />
            </div>
          );
        })}
        {TOQUES.filter((q) => q.t >= a.de && q.t < a.ate).map((q) => {
          const caixa = q.caixa(pos);
          if (!caixa) return null;
          const aperto = apertoNo(q, t);
          const ok = q.confirma ? cl((t - q.t) / 0.1) * (1 - cl((t - (q.t + 0.25)) / 0.8)) : 0;
          if (aperto <= 0 && ok <= 0) return null;
          return (
            <React.Fragment key={q.t}>
              {aperto > 0 && <div style={{ position: 'absolute', left: caixa.x, top: caixa.y, width: caixa.w, height: caixa.h, borderRadius: 12, background: '#000', opacity: 0.24 * aperto }} />}
              {ok > 0 && <div style={{ position: 'absolute', left: caixa.x, top: caixa.y, width: caixa.w, height: caixa.h, borderRadius: 22, background: COR.accent, opacity: 0.22 * ok }} />}
            </React.Fragment>
          );
        })}
        {a.de <= T.aviso && a.ate > T.aviso && <Notificacao t={t} />}
      </div>
      {cheia && <Camera t={t} />}
      {flash > 0 && <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: flash }} />}
    </div>
  );
};

const lista = (vertical: boolean) => (vertical ? APARICOES_V : APARICOES);
const medidasDo = (vertical: boolean) => medidas(vertical ? ALTURA_V : ALTURA);

const girar = ([x, y]: P, [cx, cy]: P, graus: number): P => {
  const a = (graus * Math.PI) / 180;
  return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
};

// Onde o aparelho está no quadro em t: canto de cima do corpo (antes do giro), giro e conversão de um ponto da
// captura (px de CSS) para o quadro. O pino da feira sai daqui.
export function geometria(t: number, _alturaQuadro: number, vertical = false) {
  const m = medidasDo(vertical);
  const aparicoes = lista(vertical);
  const a = [...aparicoes].reverse().find((x) => pose(x, t, vertical)) ?? aparicoes[0];
  const p = pose(a, t, vertical) ?? { x: a.x[0][1], giro: 0, dy: 2000 };
  const esquerda = p.x - m.L / 2;
  const topo = (vertical ? TOPO_V : TOPO) + p.dy + 3 * polegar(m, a, t).aperto;
  const centro: P = [m.L / 2, m.A / 2];
  return {
    esquerda, topo, giro: p.giro, largura: m.L, altura: m.A, escala: m.escala,
    tela: (cx: number, cy: number): P => {
      const [x, y] = girar(naTela(m, cx, cy), centro, p.giro);
      return [esquerda + x, topo + y];
    },
  };
}

export const Telefone: React.FC<{ t: number; alturaQuadro: number; posicoes: Posicoes; vertical?: boolean }> = ({ t, posicoes, vertical = false }) => {
  const m = medidasDo(vertical);
  return (
    <>
      {lista(vertical).map((a, i) => {
        const p = pose(a, t, vertical);
        if (!p) return null;
        const dedo = polegar(m, a, t);
        const topo = (vertical ? TOPO_V : TOPO) + p.dy + 3 * dedo.aperto;
        return (
          <div key={i} style={{ position: 'absolute', left: p.x - m.L / 2, top: topo, width: m.L, height: m.A, transform: `rotate(${p.giro.toFixed(3)}deg)` }}>
            <CelularNaMao m={m} pessoa={a.pessoa} ponta={dedo.ponta} aperto={dedo.aperto} onda={dedo.onda} manga={vertical ? 280 : 150} id={`mao-${i}`}>
              <ConteudoTela t={t} a={a} pos={posicoes} />
            </CelularNaMao>
          </div>
        );
      })}
    </>
  );
};
