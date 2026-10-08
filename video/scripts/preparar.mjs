// Copia para public/gerado o que o vídeo usa do app (as fontes da marca). Roda antes do studio, dos quadros e do render.
import { copyFile, mkdir } from 'node:fs/promises';

const RAIZ = new URL('..', import.meta.url).pathname;
const APP = new URL('../..', import.meta.url).pathname;

await mkdir(RAIZ + 'public/gerado/fontes', { recursive: true });
for (const arquivo of ['archivo-latin.woff2', 'jetbrains-mono-latin.woff2']) {
  await copyFile(APP + 'app/fonts/' + arquivo, RAIZ + 'public/gerado/fontes/' + arquivo);
}
