// Trilha do explicativo (sem voz): música original + efeitos, sintetizados no Chrome, mixagem e master.
//   node scripts/audio.mjs
// O tempo vem de src/explicativo/roteiro.ts (a música manda nos cortes; drop na foto que responde o "Alguém aí?").
// Master em −14 LUFS e pico abaixo de −1 dBTP (alvo −1,5, folga para o AAC).
// Saída: public/gerado/audio/{musica,efeitos}.wav e out/trilha.wav (+ relatório no terminal)
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { BPM, DURACAO, EFEITOS, T } from '../src/explicativo/roteiro.ts';
import { abrirNavegador } from './lib/navegador.mjs';

const RAIZ = new URL('..', import.meta.url).pathname;
const AUDIO = RAIZ + 'public/gerado/audio/';
const cfg = { duracao: DURACAO, bpm: BPM, luzes: T.luzes, drop: T.drop, marca: T.marca, pouso: T.marca + 1.25, eventos: EFEITOS };
console.log(`duração ${DURACAO} s · ${BPM} BPM · drop ${T.drop} s · ${EFEITOS.length} efeitos`);

await mkdir(AUDIO, { recursive: true });
const navegador = await abrirNavegador();
try {
  const page = await navegador.newPage();
  await page.goto('about:blank');
  await page.addScriptTag({ content: await readFile(RAIZ + 'scripts/audio/sintetizador.js', 'utf8') });
  const faixas = await page.evaluate((c) => window.renderizar(c), cfg);
  await writeFile(AUDIO + 'musica.wav', Buffer.from(faixas.musica, 'base64'));
  await writeFile(AUDIO + 'efeitos.wav', Buffer.from(faixas.efeitos, 'base64'));
} finally {
  await navegador.close();
}

const MIX = RAIZ + 'out/mix-sem-master.wav';
await mkdir(RAIZ + 'out', { recursive: true });
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', AUDIO + 'musica.wav', '-i', AUDIO + 'efeitos.wav', '-filter_complex',
  `[0:a]volume=1.0[m];[1:a]volume=0.9[e];[m][e]amix=inputs=2:normalize=0:duration=longest,atrim=0:${DURACAO.toFixed(3)}[mix]`,
  '-map', '[mix]', '-ar', '48000', '-c:a', 'pcm_f32le', MIX]);

const stderr = (args) => spawnSync('ffmpeg', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr;
const medido = JSON.parse(stderr(['-hide_banner', '-nostats', '-i', MIX, '-af', 'loudnorm=I=-14:TP=-2:LRA=11:print_format=json', '-f', 'null', '-']).match(/\{[\s\S]*?\}/)[0]);
const FINAL = RAIZ + 'out/trilha.wav';
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', MIX, '-af',
  `loudnorm=I=-14:TP=-2:LRA=11:measured_I=${medido.input_i}:measured_TP=${medido.input_tp}:measured_LRA=${medido.input_lra}:measured_thresh=${medido.input_thresh}:offset=${medido.target_offset}:linear=true,aresample=48000`,
  '-c:a', 'pcm_s24le', FINAL]);
const relatorio = stderr(['-hide_banner', '-nostats', '-i', FINAL, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
console.log(`master: ${relatorio.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()} · true peak ${relatorio.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()}`);
console.log('trilha: out/trilha.wav');
