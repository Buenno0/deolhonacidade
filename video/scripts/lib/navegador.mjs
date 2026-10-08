// Chrome local via puppeteer-core (o mesmo roteiro do vídeo do Rota Solidária).
import puppeteer from 'puppeteer-core';

export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function abrirNavegador() {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      // o MapLibre precisa de WebGL: no headless ele só desenha com o SwiftShader
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      '--font-render-hinting=none',
      '--lang=pt-BR',
    ],
  });
}

// Captura só a viewport: o padrão do Puppeteer refaz o layout e reinicia as animações CSS
export async function capturar(page, caminho, opcoes = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: caminho, captureBeyondViewport: false, ...opcoes });
  console.log('  ✓', caminho.split('/').slice(-2).join('/'));
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
