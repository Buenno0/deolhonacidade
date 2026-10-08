// Exporta cada ilustração como "foto" (JPEG 1536×2048, retrato 3:4 como a câmera do celular) para o seed subir
// no app local. Saída: public/gerado/fotos/<nome>.jpg
import { mkdir } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const RAIZ = new URL('..', import.meta.url).pathname;
const NOMES = (process.argv[2] || 'feira,obra,show,fila,alagamento,transito,comercio,desfoque').split(',');

await mkdir(RAIZ + 'public/gerado/fotos', { recursive: true });
const serveUrl = await bundle({ entryPoint: RAIZ + 'src/index.ts', publicDir: RAIZ + 'public' });
for (const nome of NOMES) {
  const inputProps = { nome, t: 3 };
  const composition = await selectComposition({ serveUrl, id: 'Foto', inputProps });
  await renderStill({ composition, serveUrl, inputProps, output: `${RAIZ}public/gerado/fotos/${nome}.jpg`, imageFormat: 'jpeg', jpegQuality: 92 });
  console.log('  ✓', nome);
}
