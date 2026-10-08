// Dados de demonstração para as telas do vídeo, só no Supabase LOCAL (nunca na nuvem, nunca com --linked).
//   node scripts/semear-demo.mjs            limpa o que um seed anterior criou e semeia de novo
//   node scripts/semear-demo.mjs --limpar   só limpa
// Contas @video.example.test com apelidos inventados; as "fotos" são as ilustrações (npm run exportar antes).
// Os posts somem em 2 a 12 h: semeie logo antes de capturar. Saída: public/gerado/seed.json (ids para a captura).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const RAIZ = new URL('..', import.meta.url).pathname;
const APP = new URL('../..', import.meta.url).pathname;
const doApp = createRequire(APP + 'package.json');
const { createClient } = doApp('@supabase/supabase-js');
const sharp = doApp('sharp');

const env = Object.fromEntries(readFileSync(APP + '.env.local', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.split(/=(.*)/s).slice(0, 2)));
const URL_SUPABASE = env.NEXT_PUBLIC_SUPABASE_URL;
if (!['127.0.0.1', 'localhost'].includes(new URL(URL_SUPABASE).hostname)) {
  throw new Error(`Recusado: o seed só roda no Supabase local (está apontando para ${URL_SUPABASE}).`);
}
const DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const DOMINIO = 'video.example.test';
const admin = createClient(URL_SUPABASE, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = (q) => execFileSync('psql', [DB, '-qAtc', q]).toString().trim();

async function limpar() {
  const ids = sql(`select id from auth.users where email like '%@${DOMINIO}'`).split('\n').filter(Boolean);
  if (!ids.length) return;
  const lista = ids.map((i) => `'${i}'`).join(',');
  const caminhos = sql(`select photo_path from posts where user_id in (${lista}) and photo_path is not null`).split('\n').filter(Boolean);
  const arquivos = caminhos.flatMap((p) => [p, p + '-mini']);
  if (arquivos.length) await admin.storage.from('posts').remove(arquivos);
  for (const id of ids) await admin.auth.admin.deleteUser(id);
  console.log(`  limpo: ${ids.length} contas, ${caminhos.length} fotos`);
}

// Conta pronta para usar: criada pelo admin, termos aceitos, sessão por link mágico (sem senha e sem captcha)
async function conta(nome, apelido) {
  const email = `${nome}@${DOMINIO}`;
  const { data: criado, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const c = createClient(URL_SUPABASE, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: sessao, error: e2 } = await c.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (e2) throw e2;
  await c.rpc('accept_terms');
  if (apelido) {
    const { error: e3 } = await c.rpc('set_nickname', { p_nickname: apelido, p_show: true });
    if (e3) throw e3;
  }
  // voto e denúncia exigem conta com mais de 24 h
  sql(`update auth.users set created_at = now() - interval '3 days' where id = '${criado.user.id}'; update profiles set created_at = now() - interval '3 days' where id = '${criado.user.id}'`);
  return Object.assign(c, { uid: criado.user.id, email, sessao: sessao.session });
}

// A foto e a miniatura como o app manda (WebP de até 2048 px e 384 px)
async function fotos(nome) {
  const origem = readFileSync(`${RAIZ}public/gerado/fotos/${nome}.jpg`);
  const foto = await sharp(origem).resize({ height: 2048, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const mini = await sharp(origem).resize({ height: 384 }).webp({ quality: 80 }).toBuffer();
  return { foto, mini };
}

// Posta pelo caminho do app (RPC, upload e publicação) e ajusta idade e contadores para a cena
async function postar(c, { foto, lat, lng, categoria, legenda, minutos, pedido = null, historico = false, views = 0, confirmaram = 0, ultimaConfirmacao = null, compartilhamentos = 0 }) {
  const { data, error } = await c.rpc('create_post', { p_lat: lat, p_lng: lng, p_category: categoria, p_caption: legenda, p_request_id: pedido, p_keep_history: historico });
  if (error) throw new Error(`${categoria}: ${error.message}`);
  const { foto: bytes, mini } = await fotos(foto);
  const balde = c.storage.from('posts');
  for (const [caminho, corpo] of [[data.photo_path, bytes], [data.photo_path + '-mini', mini]]) {
    const { error: eu } = await balde.upload(caminho, corpo, { contentType: 'image/webp' });
    if (eu) throw eu;
  }
  // é o que a rota /api/posts/[id]/publish faz sem a AWS (publica direto)
  const { error: ef } = await admin.rpc('finalize_post', { p_id: data.id, p_approved: true, p_moderation: { approved: true, provider: 'none', labels: [], faces: 0, plates: 0 }, p_photo_path: null });
  if (ef) throw ef;
  sql(`update posts set created_at = now() - interval '${minutos} minutes',
    expires_at = now() - interval '${minutos} minutes' + public.category_lifetime(category),
    view_count = ${views}, confirm_count = ${confirmaram}, share_count = ${compartilhamentos},
    last_confirmed_at = ${ultimaConfirmacao === null ? 'null' : `now() - interval '${ultimaConfirmacao} minutes'`}
    where id = '${data.id}'`);
  return data.id;
}

const C = [-23.5917, -48.0531];
const em = (dlat, dlng) => ({ lat: C[0] + dlat, lng: C[1] + dlng });

await limpar();
if (process.argv.includes('--limpar')) process.exit(0);

const [ana, beto, carla, davi, eva, fabio, gabi, dona, voce] = await Promise.all([
  conta('ana', 'ana.s'), conta('beto'), conta('carla', 'carlinha'), conta('davi', 'davi.m'), conta('eva'),
  conta('fabio'), conta('gabi', 'gabi_r'), conta('dona'), conta('voce'),
]);
console.log('  contas: 9');

const pedido = await (async () => {
  const p = em(-0.0008, -0.0042);
  const { data, error } = await carla.rpc('create_request', { p_lat: p.lat, p_lng: p.lng, p_question: 'Como está a fila do posto?' });
  if (error) throw error;
  sql(`update requests set created_at = now() - interval '20 minutes', expires_at = now() - interval '20 minutes' + interval '2 hours' where id = '${data.id ?? data}'`);
  return data.id ?? data;
})();

const comercio = await (async () => {
  const p = em(0.0012, -0.0015);
  const { data, error } = await dona.rpc('request_business', { p_name: 'Seu Comércio', p_segment: 'Café', p_address: 'Rua do Exemplo, 100', p_lat: p.lat, p_lng: p.lng, p_whatsapp: null, p_instagram: null });
  if (error) throw error;
  sql(`update businesses set status = 'approved', reviewed_at = now() - interval '1 day' where id = '${data.id}'`);
  return { id: data.id, ...p };
})();

const posts = {
  feira: await postar(ana, { foto: 'feira', ...em(0.0035, -0.003), categoria: 'evento', legenda: 'Feira cheia hoje, tem pastel saindo', minutos: 6, views: 14, confirmaram: 3, ultimaConfirmacao: 5 }),
  show: await postar(davi, { foto: 'show', ...em(-0.002, 0.0015), categoria: 'evento', legenda: 'Show começando no coreto', minutos: 25, views: 64, confirmaram: 8, ultimaConfirmacao: 2, compartilhamentos: 4, historico: true }),
  transito: await postar(eva, { foto: 'transito', ...em(0.001, 0.004), categoria: 'transito', legenda: 'Trânsito parado na avenida, dá pra desviar pela lateral', minutos: 35, views: 22, confirmaram: 2, ultimaConfirmacao: 9 }),
  obra: await postar(fabio, { foto: 'obra', ...em(-0.0045, -0.001), categoria: 'obra', legenda: 'Obra na rua, meia pista fechada', minutos: 240, views: 31, confirmaram: 1, ultimaConfirmacao: 60 }),
  alagamento: await postar(gabi, { foto: 'alagamento', ...em(0.005, 0.002), categoria: 'alagamento', legenda: 'Rua alagada, dá pra passar pela calçada', minutos: 90, views: 40, confirmaram: 4, ultimaConfirmacao: 12 }),
  fila: await postar(beto, { foto: 'fila', ...em(-0.0008, -0.0042), categoria: 'outro', legenda: 'Fila andando, uns 10 minutos', minutos: 12, pedido, views: 9, confirmaram: 1, ultimaConfirmacao: 4 }),
  comercio: await postar(dona, { foto: 'comercio', lat: comercio.lat, lng: comercio.lng, categoria: 'estabelecimento', legenda: 'Café coado na hora e pão de queijo saindo', minutos: 50, views: 18 }),
};
console.log('  posts:', Object.keys(posts).length);

const saida = { centro: C, pedido, comercio, posts, voce: { email: voce.email, sessao: voce.sessao }, criadoEm: new Date().toISOString() };
writeFileSync(`${RAIZ}public/gerado/seed.json`, JSON.stringify(saida, null, 2));
console.log('pronto: public/gerado/seed.json');
