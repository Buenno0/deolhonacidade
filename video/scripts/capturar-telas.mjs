// Telas reais do app para o vídeo: celular 390×844 em 3×, tema escuro, localização simulada em Itapetininga,
// logado como a conta de demonstração "voce@video.example.test" (scripts/semear-demo.mjs antes).
//   node scripts/capturar-telas.mjs [seções…]      ex.: node scripts/capturar-telas.mjs mapa story
// Usa o `next dev` que já estiver rodando (APP, padrão http://localhost:3000) com o Supabase local.
// Saída: public/gerado/telas/<seção>-*.png
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { abrirNavegador, capturar, esperar } from './lib/navegador.mjs';

const RAIZ = new URL('..', import.meta.url).pathname;
const RAIZ_APP = new URL('../..', import.meta.url).pathname;
const doApp = createRequire(RAIZ_APP + 'package.json');
const { createClient } = doApp('@supabase/supabase-js');
const { createServerClient } = doApp('@supabase/ssr');

const env = Object.fromEntries(readFileSync(RAIZ_APP + '.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const URL_SUPABASE = env.NEXT_PUBLIC_SUPABASE_URL;
if (!['127.0.0.1', 'localhost'].includes(new URL(URL_SUPABASE).hostname)) throw new Error('Só com o Supabase local.');
const APP = process.env.APP || 'http://localhost:3000';
const SAIDA = RAIZ + 'public/gerado/telas/';
const seed = JSON.parse(await readFile(RAIZ + 'public/gerado/seed.json', 'utf8'));
const admin = createClient(URL_SUPABASE, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36';
const CELULAR = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const [LAT, LNG] = seed.centro;

// Os cookies de sessão do app (@supabase/ssr), gerados por um link mágico do admin: sem senha, sem captcha
async function cookiesDaSessao(email) {
  const pote = new Map();
  const sb = createServerClient(URL_SUPABASE, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...pote].map(([name, value]) => ({ name, value })), setAll: (lista) => lista.forEach(({ name, value }) => (value ? pote.set(name, value) : pote.delete(name))) },
  });
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  const { error: e2 } = await sb.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (e2) throw e2;
  await sb.auth.getSession();
  return [...pote].map(([name, value]) => ({ name, value, url: APP }));
}

async function novaPagina(navegador, { logado = true, onde = [LAT, LNG] } = {}) {
  const contexto = await navegador.createBrowserContext();
  await contexto.overridePermissions(APP, ['geolocation', 'notifications']);
  const page = await contexto.newPage();
  await page.setUserAgent(UA);
  await page.setViewport(CELULAR);
  await page.emulateTimezone('America/Sao_Paulo');
  await page.setGeolocation({ latitude: onde[0], longitude: onde[1], accuracy: 8 });
  if (logado) await contexto.setCookie(...(await cookiesDaSessao(seed.voce.email)));
  page.on('pageerror', (e) => console.log('  [erro na página]', e.message));
  return page;
}

// Sem o selo "N" do modo de desenvolvimento do Next
const semSeloDev = (page) => page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });

// Espera o mapa desenhar os pinos e as fotos carregarem
async function esperarMapa(page) {
  await semSeloDev(page);
  await page.waitForSelector('.maplibregl-canvas', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('.pin').length > 0, { timeout: 30000 }).catch(() => console.log('  (sem .pin)'));
  await page.waitForNetworkIdle({ idleTime: 800, timeout: 30000 }).catch(() => {});
  await esperar(1500);
}

// Abre um post pelo link e segura o dedo na tela (o story pausa, como no app): sem isso ele passa sozinho em 6 s
async function abrirStory(page, id) {
  await page.goto(`${APP}/?post=${id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[role="dialog"][aria-label="Post"] .story-face img[src]', { timeout: 30000 });
  await semSeloDev(page);
  const area = await page.$('[aria-label="Próximo story"]');
  const caixa = await area.boundingBox();
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => [...document.querySelectorAll('.story-face img[src]')].every((i) => i.complete), { timeout: 20000 });
  await esperar(700);
}

// Onde estão, na tela, os elementos que o vídeo toca ou destaca (px de CSS, a partir do texto ou do seletor)
const POSICOES = {};
async function marcar(page, tela, alvos) {
  POSICOES[tela] = await page.evaluate((alvos) => {
    const r = {};
    for (const [chave, alvo] of Object.entries(alvos)) {
      const el = alvo.startsWith('css:')
        ? document.querySelector(alvo.slice(4))
        : [...document.querySelectorAll('button, a, label, img, textarea, input, span, p, h2')].filter((e) => e.offsetParent && e.innerText?.trim().startsWith(alvo)).pop();
      if (el) { const b = el.getBoundingClientRect(); r[chave] = { x: b.x, y: b.y, w: b.width, h: b.height }; }
    }
    return r;
  }, alvos);
}

const clicarTexto = (page, texto) => page.locator(`::-p-text(${texto})`).click();

// Publica uma foto pelo fluxo do app. Com `rostos`/`placas`, a resposta do servidor é a da produção (desfoque no
// Rekognition): "Protegendo rostos e placas…" e depois "No ar · N rostos e M placas protegidos". Localmente não há
// AWS; a interface e os textos são os reais do app.
async function publicar(navegador, { nome, foto, categoria, legenda, rostos = 0, placas = 0, instalar = false }) {
  const page = await novaPagina(navegador);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.method() === 'POST' && /\/api\/posts\/[^/]+\/publish$/.test(req.url())) {
      return req.respond({ status: 202, contentType: 'application/json', body: JSON.stringify({ status: 'processing' }) });
    }
    if (req.method() === 'POST' && req.url().includes('/rest/v1/rpc/my_post_result')) {
      // o Supabase está em outra origem: a resposta falsa precisa do cabeçalho de CORS, senão o app nem lê
      return req.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': new URL(APP).origin }, body: JSON.stringify({ status: 'published', faces: rostos, plates: placas }) });
    }
    req.continue();
  });
  await page.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  await esperarMapa(page);
  const [escolha] = await Promise.all([page.waitForFileChooser({ timeout: 15000 }), clicarTexto(page, 'Registrar')]);
  await escolha.accept([`${RAIZ}public/gerado/fotos/${foto}.jpg`]);
  await page.waitForFunction(() => document.body.innerText.includes('O que está acontecendo aqui?'), { timeout: 15000 });
  // dentro da folha: atrás dela também há chips de categoria (o filtro do mapa)
  await page.locator(`[role="dialog"] ::-p-text(${categoria})`).click();
  await page.type('[role="dialog"] textarea', legenda, { delay: 25 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /^Publicar/.test(b.innerText.trim()) && !b.disabled), { timeout: 30000 });
  await esperar(600);
  await page.evaluate(() => document.activeElement?.blur());
  await esperar(200);
  await marcar(page, `${nome}-folha`, { publicar: 'Publicar ·', foto: 'css:[role="dialog"] img[alt="Prévia da foto"]' });
  await capturar(page, `${SAIDA}${nome}-folha.png`);
  await page.locator('[role="dialog"] ::-p-text(Publicar ·)').click();
  await page.waitForFunction(() => document.body.innerText.includes('Protegendo rostos e placas'), { timeout: 15000 });
  await esperar(500);
  await capturar(page, `${SAIDA}${nome}-protegendo.png`);
  await page.waitForFunction(() => document.body.innerText.includes('No ar'), { timeout: 20000 });
  await esperar(500);
  await capturar(page, `${SAIDA}${nome}-no-ar.png`);
  if (instalar) {
    // No Android o convite só aparece quando o Chrome oferece a instalação (beforeinstallprompt); o headless não
    // oferece, então o evento é disparado à mão. O resto é o app de verdade.
    await page.evaluate(() => {
      const e = new Event('beforeinstallprompt');
      Object.assign(e, { prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
      window.dispatchEvent(e);
    });
    await page.waitForFunction(() => document.body.innerText.includes('tela de início'), { timeout: 15000 });
    await esperar(600);
    await capturar(page, `${SAIDA}instalar.png`);
  }
}

const SECOES = {
  async mapa(navegador) {
    const page = await novaPagina(navegador);
    await page.goto(APP + '/', { waitUntil: 'domcontentloaded' });
    await esperarMapa(page);
    await capturar(page, SAIDA + 'mapa.png');
  },
  async story(navegador) {
    const page = await novaPagina(navegador);
    await abrirStory(page, seed.posts.feira);
    await marcar(page, 'story', { rolando: 'Ainda está rolando', acabou: 'Acabou' });
    await capturar(page, SAIDA + 'story.png');
  },
  async camadas(navegador) {
    for (const [nome, id] of [['story', seed.posts.feira], ['divulgacao', seed.posts.comercio], ['privacidade-story', null]]) {
      if (!id) continue;
      const page = await novaPagina(navegador);
      await abrirStory(page, id);
      await page.addStyleTag({ content: `html, body, [role="dialog"][aria-label="Post"], .story-face { background: transparent !important; }
        .story-blur-topo, .story-blur-base { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
        body * { visibility: hidden !important; }
        [role="dialog"][aria-label="Post"], [role="dialog"][aria-label="Post"] * { visibility: visible !important; }
        [role="dialog"][aria-label="Post"] .story-face img { visibility: hidden !important; }` });
      await esperar(300);
      await capturar(page, `${SAIDA}${nome}-camada.png`, { omitBackground: true });
    }
  },
  async divulgacao(navegador) {
    const page = await novaPagina(navegador);
    await abrirStory(page, seed.posts.comercio);
    await marcar(page, 'divulgacao', { chegar: 'Como chegar' });
    await capturar(page, SAIDA + 'divulgacao.png');
  },
  async registrar(navegador) {
    await publicar(navegador, { nome: 'registrar', foto: 'feira', categoria: 'Evento', legenda: 'Feira cheia hoje', instalar: true });
  },
  async privacidade(navegador) {
    await publicar(navegador, { nome: 'privacidade', foto: 'desfoque', categoria: 'Outro', legenda: 'Movimento na calçada', rostos: 2, placas: 1 });
  },
  async alertas(navegador) {
    const page = await novaPagina(navegador);
    await page.goto(APP + '/', { waitUntil: 'domcontentloaded' });
    await esperarMapa(page);
    await page.click('[aria-label="Alertas perto de você"]');
    await page.waitForFunction(() => document.body.innerText.includes('Me avisa quando acontecer algo perto') || document.body.innerText.includes('Avisos perto de você'), { timeout: 15000 });
    await esperar(800);
    await marcar(page, 'alertas', { ligar: 'Ligar alertas', raio: '1,0 km' });
    await capturar(page, SAIDA + 'alertas.png');
  },
  async comercio(navegador) {
    const page = await novaPagina(navegador, { onde: [seed.comercio.lat, seed.comercio.lng] });
    await page.goto(APP + '/', { waitUntil: 'domcontentloaded' });
    await esperarMapa(page);
    await page.click('[aria-label="Minha conta"]');
    await page.waitForFunction(() => document.body.innerText.includes('Tem um estabelecimento?'), { timeout: 15000 });
    await esperar(500);
    if (process.env.DEPURAR) await capturar(page, SAIDA + 'depurar-conta.png');
    // o botão "Cadastrar" da seção "Tem um estabelecimento?"
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Cadastrar')?.click());
    await page.waitForFunction(() => document.body.innerText.includes('Divulgue seu estabelecimento'), { timeout: 15000 });
    const campos = await page.$$('input');
    await campos[0].type('Seu Comércio', { delay: 20 });
    await campos[1].type('Café', { delay: 20 });
    await campos[2].type('Rua do Exemplo, 100', { delay: 20 });
    await page.waitForFunction(() => document.body.innerText.includes('Faça o pedido de dentro do estabelecimento'), { timeout: 20000 });
    await esperar(600);
    await page.evaluate(() => document.activeElement?.blur());
    await esperar(200);
    await marcar(page, 'comercio', { pedir: 'Pedir verificação' });
    await capturar(page, SAIDA + 'comercio.png');
  },
  async pergunta(navegador) {
    const page = await novaPagina(navegador);
    await page.goto(APP + '/', { waitUntil: 'domcontentloaded' });
    await esperarMapa(page);
    await page.click('[aria-label="Perguntar: alguém aí?"]');
    await page.waitForSelector('textarea[placeholder^="Ex.: Como está a fila"]', { timeout: 15000 });
    await page.type('textarea[placeholder^="Ex.: Como está a fila"]', 'Como está a fila do posto?', { delay: 25 });
    await esperar(800);
    await marcar(page, 'pergunta', { perguntar: 'Perguntar aqui' });
    await capturar(page, SAIDA + 'pergunta.png');
  },
};

await mkdir(SAIDA, { recursive: true });
const anteriores = await readFile(SAIDA + 'posicoes.json', 'utf8').then(JSON.parse, () => ({}));
const pedidas = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SECOES);
const navegador = await abrirNavegador();
try {
  for (const s of pedidas) {
    console.log(s);
    await SECOES[s](navegador);
  }
} finally {
  await navegador.close();
  await writeFile(SAIDA + 'posicoes.json', JSON.stringify({ ...anteriores, ...POSICOES }, null, 2));
}
