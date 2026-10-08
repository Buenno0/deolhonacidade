// Quadros-chave para conferir antes do render completo (texto estourando, acento cortado, enquadramento).
//   node scripts/quadros.mjs <composição> <quadros>      ex.: node scripts/quadros.mjs Hero 0,60,150,200,419
// Saída: out/quadros/<composição>-<quadro>.jpg e uma folha com todos (out/quadros/folha-<composição>.jpg).
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const RAIZ = new URL('..', import.meta.url).pathname;
const id = process.argv[2] || 'Hero';
const quadros = (process.argv[3] || '0').split(',').map(Number);

const pasta = RAIZ + 'out/quadros/';
await mkdir(pasta, { recursive: true });
console.log('empacotando…');
const serveUrl = await bundle({ entryPoint: RAIZ + 'src/index.ts', publicDir: RAIZ + 'public' });
const composition = await selectComposition({ serveUrl, id });
const arquivos = [];
for (const q of quadros) {
  const saida = `${pasta}${id}-${String(q).padStart(4, '0')}.jpg`;
  await renderStill({ composition, serveUrl, output: saida, frame: Math.min(q, composition.durationInFrames - 1), imageFormat: 'jpeg', jpegQuality: 90 });
  arquivos.push(saida);
  console.log(`  ${id} @${q}`);
}
if (arquivos.length > 1) {
  const vertical = composition.height > composition.width;
  const [cw, ch] = vertical ? [270, 480] : [640, 360];
  const colunas = vertical ? Math.min(6, arquivos.length) : Math.min(3, arquivos.length);
  const n = arquivos.length;
  const filtro = arquivos.map((_, i) => `[${i}]scale=${cw}:${ch}[v${i}]`).join(';') + ';' +
    arquivos.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${n}:layout=` +
    arquivos.map((_, i) => `${(i % colunas) * cw}_${Math.floor(i / colunas) * ch}`).join('|') + ':fill=white';
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...arquivos.flatMap((a) => ['-i', a]), '-filter_complex', filtro, '-frames:v', '1', `${pasta}folha-${id}.jpg`]);
  console.log(`folha: out/quadros/folha-${id}.jpg`);
}
