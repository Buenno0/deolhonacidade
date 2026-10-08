// Tipografia da marca, os mesmos arquivos do app (app/fonts, copiados por scripts/preparar.mjs):
// Archivo nos títulos (o design system vai até 700) e JetBrains Mono nos rótulos e números.
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const ARCHIVO = 'Archivo Viu';
export const MONO = 'JetBrains Mono Viu';

loadFont({ family: ARCHIVO, url: staticFile('gerado/fontes/archivo-latin.woff2'), weight: '400 700' });
loadFont({ family: MONO, url: staticFile('gerado/fontes/jetbrains-mono-latin.woff2'), weight: '400 500' });
