// O roteiro do explicativo (sem voz): a música manda. 100 BPM, compasso de 2,4 s; as cenas viram nos compassos e o
// "drop" cai na foto que responde o "Alguém aí?" (compasso 13). Imagem (Remotion) e som (scripts/audio.mjs) leem
// os mesmos tempos daqui.
export const BPM = 100;
export const COMPASSO = (60 / BPM) * 4; // 2,4 s
export const FPS = 30;

export const CENAS = {
  gancho: [0, 7.2],
  cidade: [7.2, 10.8],
  publicar: [10.8, 16.8],
  tempo: [16.8, 21.6],
  confirmar: [21.6, 26.4],
  alguem: [26.4, 33.6],
  alertas: [33.6, 38.4],
  privacidade: [38.4, 43.2],
  comercio: [43.2, 49.2],
  navegador: [49.2, 52.8],
  final: [52.8, 58.8],
} as const;
export type NomeCena = keyof typeof CENAS;
export const DURACAO = CENAS.final[1];

// Momentos que a imagem e o som compartilham
export const T = {
  luzes: 5.4, // a cidade acende
  toqueRegistrar: 11.35, // o polegar toca "Registrar"
  camera: [11.45, 11.95] as const, // a câmera do celular olhando a feira
  obturador: 11.8,
  folha: 11.95, // a folha de registro sobe com a foto
  toquePublicar: 13.0,
  voo: [13.25, 14.25] as const, // o pino sai do celular e pousa na feira
  puf: 20.4, // o trânsito (2 h) acaba e some
  toqueRolando: 23.6, // "Ainda está rolando"
  perguntaSobe: 26.8, // o cartão "Alguém aí?" sobe
  toquePerguntar: 27.6,
  perguntaDesce: 27.8,
  bolha: [27.9, 31.0] as const,
  ondas: [28.3, 28.85] as const,
  drop: 31.2, // a resposta com foto chega
  alertasSobe: 33.7,
  toqueAlertas: 34.6,
  alertasDesce: 34.85,
  transitoNovo: 35.2,
  aviso: 35.5, // notificação no celular
  protegendo: 38.9,
  desfoque: [39.6, 40.5] as const,
  noAr: 40.8,
  comercioSobe: 43.55,
  toquePedir: 45.3,
  divulgacao: 46.1, // a tela vira a Divulgação aprovada
  pinoComercio: 47.4,
  instalar: 50.1,
  marca: 52.8, // começo do cartão final
};

export type Efeito = { t: number; tipo: string; vol: number };

// Efeito sonoro em toda ação na tela (sintetizados em scripts/audio/sintetizador.js)
export const EFEITOS: Efeito[] = [
  { t: 0.3, tipo: 'pop', vol: 0.7 },
  { t: 1.15, tipo: 'pop', vol: 0.7 },
  { t: 2.0, tipo: 'pop', vol: 0.7 },
  { t: 3.4, tipo: 'pancada', vol: 0.6 },
  { t: 4.6, tipo: 'queda', vol: 0.9 },
  { t: 4.75, tipo: 'queda', vol: 0.6 },
  { t: 5.05, tipo: 'pop', vol: 0.9 },
  { t: T.luzes, tipo: 'brilho', vol: 0.8 },
  ...[6.1, 6.4, 6.7, 7.0].map((t) => ({ t, tipo: 'ping', vol: 0.35 })),
  { t: 7.25, tipo: 'whoosh', vol: 0.4 },
  { t: 10.85, tipo: 'whoosh', vol: 0.6 },
  { t: T.toqueRegistrar, tipo: 'toque', vol: 0.9 },
  { t: T.obturador, tipo: 'obturador', vol: 0.8 },
  { t: T.folha, tipo: 'whoosh', vol: 0.3 },
  { t: T.toquePublicar, tipo: 'toque', vol: 0.9 },
  { t: T.voo[0], tipo: 'whoosh', vol: 0.8 },
  { t: T.voo[1], tipo: 'ping', vol: 0.9 },
  { t: 16.85, tipo: 'whoosh', vol: 0.5 },
  ...[17.6, 18.2, 18.8, 19.4, 20.0].map((t) => ({ t, tipo: 'tique', vol: 0.8 })),
  { t: T.puf, tipo: 'puf', vol: 0.8 },
  { t: 21.65, tipo: 'whoosh', vol: 0.6 },
  { t: T.toqueRolando, tipo: 'toque', vol: 0.9 },
  { t: T.toqueRolando + 0.3, tipo: 'sucesso', vol: 0.6 },
  { t: 26.45, tipo: 'whoosh', vol: 0.5 },
  { t: T.perguntaSobe, tipo: 'whoosh', vol: 0.3 },
  { t: T.toquePerguntar, tipo: 'toque', vol: 0.9 },
  { t: T.bolha[0], tipo: 'pop', vol: 0.8 },
  ...T.ondas.map((t) => ({ t, tipo: 'onda', vol: 0.5 })),
  { t: T.drop, tipo: 'ping', vol: 1 },
  { t: 33.65, tipo: 'whoosh', vol: 0.5 },
  { t: T.toqueAlertas, tipo: 'toque', vol: 0.9 },
  { t: T.transitoNovo, tipo: 'ping', vol: 0.6 },
  { t: T.aviso, tipo: 'notificacao', vol: 0.8 },
  { t: 38.45, tipo: 'whoosh', vol: 0.5 },
  { t: T.protegendo, tipo: 'risco', vol: 0.7 },
  { t: T.desfoque[0], tipo: 'brilho', vol: 0.5 },
  { t: T.noAr, tipo: 'sucesso', vol: 0.7 },
  { t: 43.25, tipo: 'whoosh', vol: 0.5 },
  { t: T.comercioSobe, tipo: 'whoosh', vol: 0.3 },
  { t: T.toquePedir, tipo: 'toque', vol: 0.9 },
  { t: T.divulgacao, tipo: 'carimbo', vol: 0.6 },
  { t: T.pinoComercio, tipo: 'ping', vol: 0.8 },
  { t: 49.25, tipo: 'whoosh', vol: 0.5 },
  { t: T.instalar, tipo: 'pop', vol: 0.6 },
  { t: T.marca + 0.1, tipo: 'whoosh', vol: 0.6 },
  { t: T.marca + 0.6, tipo: 'brilho', vol: 0.6 },
  { t: T.marca + 1.25, tipo: 'impacto', vol: 0.7 },
  { t: T.marca + 1.25, tipo: 'ping', vol: 0.9 },
  { t: T.marca + 2.1, tipo: 'pop', vol: 0.4 },
];

// Tempo local de uma cena (s) e se ela está no ar (com folga para a transição)
export const local = (t: number, cena: NomeCena) => t - CENAS[cena][0];
export const noAr = (t: number, cena: NomeCena, folga = 0.5) => t >= CENAS[cena][0] - folga && t < CENAS[cena][1] + folga;
