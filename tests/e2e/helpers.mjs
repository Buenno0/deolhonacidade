// Base dos testes de ponta a ponta. Precisam do Supabase local (supabase start)
// e do app (npm run dev) rodando; usam o Mailpit para ler o código de login.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { after } from "node:test";
import { createClient } from "@supabase/supabase-js";

const file = new URL("../../.env.local", import.meta.url);
const fromFile = (() => {
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8").trim().split("\n").filter((l) => l.includes("=")).map((l) => l.split(/=(.*)/s).slice(0, 2)),
    );
  } catch {
    return {};
  }
})();
export const env = { ...fromFile, ...process.env };

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const APP = env.E2E_APP_URL ?? "http://localhost:3000";
export const MAIL = env.E2E_MAIL_URL ?? "http://127.0.0.1:54324";
export const DB_URL = env.E2E_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
export const CITY = 3522307;
export const CENTER = [-23.5917, -48.0531];
// Token de teste do Cloudflare Turnstile (a chave secreta de teste aceita)
const CAPTCHA = "XXXX.DUMMY.TOKEN.XXXX";

export const admin = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
export const anon = () => createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function readCode(email) {
  for (let i = 0; i < 25; i++) {
    await sleep(400);
    const list = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + email)}`).then((r) => r.json());
    const msg = list.messages?.[0];
    if (msg) {
      const full = await fetch(`${MAIL}/api/v1/message/${msg.ID}`).then((r) => r.json());
      const code = full.Text?.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
  }
  throw new Error(`código não chegou para ${email}`);
}

// Cada arquivo de teste apaga, no fim, os usuários que criou (e com eles os
// posts, votos e pedidos), para não sujar o mapa local.
const created = new Set();
after(async () => {
  if (!created.size) return;
  const { data } = await admin.from("posts").select("id, city_id").in("user_id", [...created]);
  const paths = (data ?? []).flatMap((p) => [`${p.city_id}/${p.id}`, `${p.city_id}/${p.id}-mini`]);
  if (paths.length) await admin.storage.from("posts").remove(paths).catch(() => {});
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {});
});

// Usuário logado e com os termos aceitos (a menos que terms = false)
export async function login(name, { terms = true, aged = true } = {}) {
  const c = anon();
  const email = `e2e-${name}-${uniq()}@example.test`;
  const { error } = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: true, captchaToken: CAPTCHA } });
  if (error) throw error;
  const { data, error: vErr } = await c.auth.verifyOtp({ email, token: await readCode(email), type: "email" });
  if (vErr) throw vErr;
  if (terms) await c.rpc("accept_terms");
  created.add(data.user.id);
  // Denúncia e voto exigem conta com mais de 24 h: a conta de teste "nasce" antes
  if (aged) {
    execFileSync("psql", [DB_URL, "-qc", `update auth.users set created_at = now() - interval '2 days' where id = '${data.user.id}'`]);
  }
  return Object.assign(c, { uid: data.user.id, token: data.session.access_token, email });
}

const fakeImage = () => new Blob([new Uint8Array(1024)], { type: "image/webp" });

// Posta pelo mesmo caminho do app: RPC, upload das duas imagens e publicação no servidor
export async function publish(
  c,
  { lat = CENTER[0], lng = CENTER[1], category = "outro", caption = null, requestId = null, keepHistory = false } = {},
) {
  const { data, error } = await c.rpc("create_post", {
    p_lat: lat,
    p_lng: lng,
    p_category: category,
    p_caption: caption,
    p_request_id: requestId,
    p_keep_history: keepHistory,
  });
  if (error) return { error };
  const bucket = c.storage.from("posts");
  await bucket.upload(data.photo_path, fakeImage(), { contentType: "image/webp" });
  await bucket.upload(data.photo_path + "-mini", fakeImage(), { contentType: "image/webp" });
  const res = await fetch(`${APP}/api/posts/${data.id}/publish`, { method: "POST", headers: { Authorization: `Bearer ${c.token}` } });
  return { id: data.id, photo_path: data.photo_path, status: (await res.json()).status };
}

export const row = async (table, id, cols = "*") => (await admin.from(table).select(cols).eq("id", id).single()).data;
