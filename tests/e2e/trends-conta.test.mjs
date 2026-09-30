// Trends (visualizações e compartilhamentos), a conta e o captcha.
import test from "node:test";
import assert from "node:assert/strict";
import { APP, CITY, SUPABASE_URL, ANON, admin, anon, login, publish, row } from "./helpers.mjs";
import { createClient } from "@supabase/supabase-js";

test("uma visualização por pessoa; compartilhar conta à parte; sem login não conta", async () => {
  const a = await login("tc-a");
  const p = await publish(a, { category: "evento" });
  await anon().rpc("record_interaction", { p_id: p.id, p_kind: "view" });
  const viewer = await login("tc-v");
  await viewer.rpc("record_interaction", { p_id: p.id, p_kind: "view" });
  await viewer.rpc("record_interaction", { p_id: p.id, p_kind: "view" });
  await viewer.rpc("record_interaction", { p_id: p.id, p_kind: "share" });
  const b = await login("tc-b");
  await b.rpc("record_interaction", { p_id: p.id, p_kind: "view" });
  const { view_count, share_count } = await row("posts", p.id, "view_count, share_count");
  assert.equal(view_count, 2, "a mesma conta conta uma vez; outra conta soma; visitante não");
  assert.equal(share_count, 1);
  const r = await viewer.rpc("record_interaction", { p_id: p.id, p_kind: "curtida" });
  assert.ok(r.error, "tipo inválido recusado");
  const { data } = await anon().rpc("active_posts", { p_city_id: CITY });
  const f = data.features.find((x) => x.id === p.id);
  assert.equal(f.properties.view_count, 2);
});

test("meus posts e apagar post próprio", async () => {
  const [a, b] = await Promise.all(["tc-c", "tc-d"].map((n) => login(n)));
  const p = await publish(a, { category: "outro", caption: "meu" });
  const { data: mine } = await a.rpc("my_posts");
  assert.ok(mine.some((x) => x.id === p.id));
  const { data: theirs } = await b.rpc("my_posts");
  assert.ok(!theirs.some((x) => x.id === p.id), "cada um só vê os seus");
  let r = await b.rpc("delete_my_post", { p_id: p.id });
  assert.ok(r.error, "não apaga post alheio");
  r = await a.rpc("delete_my_post", { p_id: p.id });
  assert.ifError(r.error);
  const { data } = await anon().rpc("active_posts", { p_city_id: CITY });
  assert.ok(!data.features.some((x) => x.id === p.id), "sai do mapa na hora");
});

test("excluir a conta tira tudo do ar e remove o login", async () => {
  const a = await login("tc-e");
  const p = await publish(a, { category: "outro" });
  const semConfirmar = await fetch(`${APP}/api/account/delete`, { method: "POST", headers: { Authorization: `Bearer ${a.token}` } });
  assert.equal(semConfirmar.status, 400);
  const res = await fetch(`${APP}/api/account/delete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${a.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: "EXCLUIR" }),
  });
  assert.equal(res.status, 200);
  const { data: user } = await admin.auth.admin.getUserById(a.uid);
  assert.equal(user.user, null, "login removido");
  assert.equal(await row("posts", p.id, "id"), null, "posts removidos junto com a conta");
  const { data: files } = await admin.storage.from("posts").list("3522307", { search: p.id });
  assert.equal(files.length, 0, "fotos apagadas");
  const { count } = await admin.from("access_logs").select("*", { count: "exact", head: true }).eq("action", "delete_account");
  assert.ok(count > 0, "registro de acesso da exclusão fica (Marco Civil)");
});

test("login sem captcha é recusado", async () => {
  const c = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithOtp({ email: `sem-captcha-${Date.now()}@example.test` });
  assert.ok(error, "sem token do captcha, o Supabase recusa");
});
