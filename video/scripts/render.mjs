// Render final e versões para a web.
//   node scripts/render.mjs hero [composição]      → hero 16:9 e 9:16 (sem áudio, loop de 14 s)
//   node scripts/render.mjs explicativo            → explicativo 16:9 com a trilha (npm run audio antes)
// Saída em out/: o master (H.264 CRF 16, AAC 256k) e, em out/web/, MP4 (H.264, faststart) + WebM (VP9/Opus) +
// pôster WebP/JPEG, prontos para public/video do app. No fim, confere faixas, tamanho, loudness e (no hero) a emenda.
import { execFileSync, spawnSync } from 'node:child_process';
import { access, mkdir, rm, stat } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const RAIZ = new URL('..', import.meta.url).pathname;
const OUT = RAIZ + 'out/';
const WEB = OUT + 'web/';
const alvo = process.argv[2] || 'hero';
const so = process.argv[3]; // só uma composição: node scripts/render.mjs hero Hero-Vertical

const PECAS = {
  hero: [
    { id: 'Hero', nome: 'viu-hero-16x9', crf: 30, crfVp9: 40, limiteMB: 3, loop: true, posterS: 0 },
    { id: 'Hero-Vertical', nome: 'viu-hero-9x16', crf: 30, crfVp9: 40, limiteMB: 3, loop: true, posterS: 0 },
  ],
  explicativo: [
    // o celular balança na mão o tempo todo (a interface é reamostrada a cada quadro): CRF mais alto e "animation",
    // que segura bem as áreas chapadas
    { id: 'Explicativo', nome: 'viu-explicativo-16x9', crf: 26, tune: 'animation', crfVp9: 37, limiteMB: 12, trilha: OUT + 'trilha.wav', posterS: 5.6, capa: [1280, 720] },
    { id: 'Explicativo-Vertical', nome: 'viu-explicativo-9x16', crf: 25, tune: 'animation', crfVp9: 37, limiteMB: 14, trilha: OUT + 'trilha.wav', posterS: 5.6, capa: [1080, 1920] },
  ],
};

const ffmpeg = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args]);
const mb = async (f) => (await stat(f)).size / 1024 / 1024;

await mkdir(WEB, { recursive: true });
console.log('empacotando…');
const serveUrl = await bundle({ entryPoint: RAIZ + 'src/index.ts', publicDir: RAIZ + 'public' });

for (const p of PECAS[alvo].filter((x) => !so || x.id === so)) {
  // tolerância maior: com a máquina carregada, o primeiro quadro (fontes, telas) pode passar de 30 s
  const composition = await selectComposition({ serveUrl, id: p.id, timeoutInMilliseconds: 180000 });
  const semAudio = `${OUT}${p.nome}-sem-audio.mp4`;
  const master = `${OUT}${p.nome}-master.mp4`;
  let ultimo = -1;
  const existe = await access(p.trilha ? semAudio : master).then(() => true, () => false);
  if (!(process.env.REUSAR_VIDEO && existe)) {
    await renderMedia({
      composition, serveUrl, codec: 'h264', crf: 16, muted: true, imageFormat: 'jpeg', jpegQuality: 95, outputLocation: p.trilha ? semAudio : master,
      timeoutInMilliseconds: 180000, concurrency: Number(process.env.CONCORRENCIA || 3),
      onProgress: ({ progress }) => { const q = Math.floor(progress * 10); if (q !== ultimo) { ultimo = q; console.log(`  ${p.id} ${q * 10}%`); } },
    });
  }
  if (p.trilha) {
    ffmpeg(['-i', semAudio, '-i', p.trilha, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', '-shortest', master]);
  }
  const mp4 = `${WEB}${p.nome}.mp4`;
  const webm = `${WEB}${p.nome}.webm`;
  const poster = `${WEB}${p.nome}`;
  const audioMp4 = p.trilha ? ['-c:a', 'aac', '-b:a', '160k'] : ['-an'];
  const audioWebm = p.trilha ? ['-c:a', 'libopus', '-b:a', '128k'] : ['-an'];
  ffmpeg(['-i', master, ...audioMp4, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(p.crf), ...(p.tune ? ['-tune', p.tune] : []), '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  ffmpeg(['-i', master, ...audioWebm, '-c:v', 'libvpx-vp9', '-crf', String(p.crfVp9), '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', webm]);
  // pôster: no hero, o primeiro quadro (o vídeo começa dele); no explicativo, um quadro que chama o play.
  // WebP pelo cwebp (o ffmpeg daqui não tem libwebp) e JPEG de reserva.
  ffmpeg(['-ss', String(p.posterS), '-i', master, '-frames:v', '1', `${poster}.png`]);
  execFileSync('cwebp', ['-quiet', '-q', '82', `${poster}.png`, '-o', `${poster}.webp`]);
  ffmpeg(['-i', `${poster}.png`, '-q:v', '3', `${poster}.jpg`]);
  if (p.capa) ffmpeg(['-i', `${poster}.png`, '-vf', `scale=${p.capa[0]}:${p.capa[1]}`, '-q:v', '2', `${OUT}capa-${p.nome}.jpg`]);
  await rm(`${poster}.png`);

  // conferência
  const streams = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', mp4]).toString().trim().split('\n').join(',');
  let extra = '';
  if (p.loop) {
    const n = composition.durationInFrames;
    const ssim = spawnSync('ffmpeg', ['-hide_banner', '-i', master, '-i', master, '-filter_complex',
      `[0:v]select='eq(n\\,${n - 1})'[a];[1:v]select='eq(n\\,0)'[b];[a][b]ssim`, '-frames:v', '1', '-f', 'null', '-'], { encoding: 'utf8' }).stderr.match(/All:([\d.]+)/)?.[1];
    extra = ` · emenda SSIM ${ssim}`;
  }
  if (p.trilha) {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', mp4, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    extra = ` · ${r.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()} · pico ${r.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.replace(/\s+/g, ' ')}`;
    // folha de contato: 30 quadros espalhados pelo vídeo
    const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', master]).toString());
    const vertical = composition.height > composition.width;
    ffmpeg(['-i', master, '-vf', `fps=30/${dur.toFixed(3)},${vertical ? 'scale=216:384,tile=10x3' : 'scale=384:216,tile=6x5'}:padding=4:color=white`, '-frames:v', '1', `${OUT}folha-de-contato-${p.nome}.jpg`]);
  }
  console.log(`${p.nome}: mp4 ${(await mb(mp4)).toFixed(2)} MB · webm ${(await mb(webm)).toFixed(2)} MB · faixas: ${streams}${extra}`);
  if ((await mb(mp4)) > p.limiteMB) console.log(`  ⚠ passou de ${p.limiteMB} MB`);
}
