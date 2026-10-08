// Quadros do estudo do celular (src/estudos/EstudoCelular.tsx): o quadro de hoje e as quatro direções, em 16:9 e
// 9:16, no mesmo instante do explicativo (13 s).
//   node scripts/estudo-celular.mjs            → todos
//   node scripts/estudo-celular.mjs mao hoje   → só os que começam com esses nomes
// Saída em out/estudo-celular/*.jpg
import { mkdir } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const RAIZ = new URL('..', import.meta.url).pathname;
const OUT = RAIZ + 'out/estudo-celular/';
const QUADRO = 390; // 13,0 s: o toque em "Publicar"

const pedidos = [
  { nome: 'hoje-16x9', id: 'Explicativo', frame: QUADRO, props: {} },
  { nome: 'hoje-9x16', id: 'Explicativo-Vertical', frame: QUADRO, props: {} },
  ...['mao', 'maquete', 'solta', 'premium'].flatMap((direcao) => [
    { nome: `${direcao}-16x9`, id: 'Estudo-Celular', frame: 0, props: { direcao } },
    { nome: `${direcao}-9x16`, id: 'Estudo-Celular-Vertical', frame: 0, props: { direcao } },
  ]),
];
const filtro = process.argv.slice(2);

await mkdir(OUT, { recursive: true });
const serveUrl = await bundle({ entryPoint: RAIZ + 'src/index.ts', publicDir: RAIZ + 'public' });
for (const p of pedidos.filter((x) => !filtro.length || filtro.some((f) => x.nome.startsWith(f)))) {
  const composition = await selectComposition({ serveUrl, id: p.id, inputProps: p.props, timeoutInMilliseconds: 180000 });
  await renderStill({ composition, serveUrl, frame: p.frame, inputProps: p.props, output: `${OUT}${p.nome}.jpg`, imageFormat: 'jpeg', jpegQuality: 92, timeoutInMilliseconds: 180000 });
  console.log(`${p.nome}.jpg`);
}
