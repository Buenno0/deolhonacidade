// Postar, ver, denunciar e limpar: as regras do MVP.
import test from "node:test";
import assert from "node:assert/strict";
import { APP, CENTER, CITY, admin, anon, env, login, publish, row } from "./helpers.mjs";

test("postar exige termos, cidade e limite; publicar só pelo servidor", async () => {
  const a = await login("f1a", { terms: false });
  let r = await a.rpc("create_post", { p_lat: CENTER[0], p_lng: CENTER[1], p_category: "transito" });
  assert.match(r.error?.message ?? "", /termos/);
  await a.rpc("accept_terms");

  r = await a.rpc("create_post", { p_lat: -23.55, p_lng: -46.63, p_category: "transito" });
  assert.match(r.error?.message ?? "", /dentro da cidade/, "São Paulo capital fica fora");

  const up = await a.storage.from("posts").upload("3522307/nao-e-meu", new Blob([new Uint8Array(8)]), { contentType: "image/webp" });
  assert.ok(up.error, "upload em caminho alheio é bloqueado");

  const p = await publish(a, { category: "alagamento", caption: "Rua alagada" });
  assert.equal(p.status, "published");

  r = await a.rpc("finalize_post", { p_id: p.id, p_approved: true });
  assert.ok(r.error, "navegador não chama finalize_post");
  const semToken = await fetch(`${APP}/api/posts/${p.id}/publish`, { method: "POST" });
  assert.equal(semToken.status, 401);
});

test("leitura pública não expõe quem postou", async () => {
  const a = await login("f1b");
  const p = await publish(a, { category: "evento" });
  const { data } = await anon().rpc("active_posts", { p_city_id: CITY });
  const f = data.features.find((x) => x.id === p.id);
  assert.ok(f, "o post aparece no mapa");
  assert.ok(!JSON.stringify(data).includes("user_id"));
  const direct = await anon().from("posts").select("*");
  assert.equal(direct.data?.length ?? 0, 0, "anônimo não lê a tabela");
});

test("3 denúncias escondem; limpeza apaga foto e miniatura", async () => {
  const [a, b, c, d] = await Promise.all(["f1c", "f1d", "f1e", "f1f"].map((n) => login(n)));
  const p = await publish(a, { category: "outro" });
  for (const u of [b, c, d]) await u.rpc("report_post", { p_id: p.id, p_reason: "teste" });
  assert.equal((await row("posts", p.id, "status")).status, "hidden");

  await admin.from("posts").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", p.id);
  const res = await fetch(`${APP}/api/cron/expire`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
  assert.equal(res.status, 200);
  const after = await row("posts", p.id, "status, photo_path");
  assert.equal(after.status, "expired");
  assert.equal(after.photo_path, null);
  const { data: left } = await admin.storage.from("posts").list("3522307", { search: p.id });
  assert.equal(left.length, 0, "foto e miniatura apagadas");
});
