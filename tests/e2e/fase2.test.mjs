// Duração por categoria, "ainda está rolando?", "alguém aí?", alertas,
// compartilhamento, calor e moderação.
import test from "node:test";
import assert from "node:assert/strict";
import { APP, CENTER, CITY, admin, anon, login, publish, row, sleep, uniq } from "./helpers.mjs";

const at = (dLat = 0, dLng = 0) => ({ p_lat: CENTER[0] + dLat, p_lng: CENTER[1] + dLng });

test("trânsito dura 2h", async () => {
  const a = await login("f2a");
  const p = await publish(a, { category: "transito" });
  const { created_at, expires_at } = await row("posts", p.id, "created_at, expires_at");
  assert.ok(Math.abs((new Date(expires_at) - new Date(created_at)) / 36e5 - 2) < 0.01);
});

test("ainda está rolando: regras do voto", async () => {
  const [a, b, c, d] = await Promise.all(["f2b", "f2c", "f2d", "f2e"].map((n) => login(n)));
  const p = await publish(a, { category: "evento" });
  let r = await a.rpc("vote_post", { p_id: p.id, p_still: true, ...at() });
  assert.match(r.error?.message ?? "", /próprio/);
  r = await b.rpc("vote_post", { p_id: p.id, p_still: true, p_lat: -23.7, p_lng: -48.2 });
  assert.match(r.error?.message ?? "", /mais perto/);
  r = await b.rpc("vote_post", { p_id: p.id, p_still: true, ...at(0.002) });
  assert.equal(r.data?.confirm_count, 1);
  r = await b.rpc("vote_post", { p_id: p.id, p_still: false, ...at() });
  assert.equal(r.error?.code, "23505", "um voto por pessoa");

  const e = await publish(a, { category: "evento" });
  for (const u of [b, c, d]) await u.rpc("vote_post", { p_id: e.id, p_still: false, ...at() });
  assert.ok(new Date((await row("posts", e.id, "expires_at")).expires_at) <= new Date(), "3 negações encerram");
});

test("alguém aí: pedido, resposta perto e aviso só do autor", async () => {
  const [b, c] = await Promise.all(["f2f", "f2g"].map((n) => login(n)));
  const { data: reqId, error } = await b.rpc("create_request", { ...at(), p_question: "A ponte alagou?" });
  assert.ifError(error);
  let r = await b.rpc("create_request", { p_lat: -23.55, p_lng: -46.63, p_question: "Fora?" });
  assert.match(r.error?.message ?? "", /dentro da cidade/);
  const far = await publish(c, { lat: -23.7, lng: -48.2, category: "alagamento", requestId: reqId });
  assert.match(far.error?.message ?? "", /1 km/);
  const ans = await publish(c, { lat: CENTER[0] + 0.001, category: "alagamento", requestId: reqId });
  assert.equal(ans.status, "published");
  const { data } = await anon().rpc("active_requests", { p_city_id: CITY });
  assert.equal(data.features.find((f) => f.id === reqId)?.properties.answer_count, 1);
  const other = await fetch(`${APP}/api/requests/${reqId}/notify`, { method: "POST", headers: { Authorization: `Bearer ${c.token}` } });
  assert.equal(other.status, 404);
});

test("alertas: quem recebe e uma vez só", async () => {
  const [a, d] = await Promise.all(["f2h", "f2i"].map((n) => login(n)));
  let r = await d.rpc("save_push_subscription", {
    p_endpoint: `https://push.example.test/${uniq()}`,
    p_p256dh: "x",
    p_auth: "y",
    ...at(),
    p_radius_m: 1000,
    p_categories: ["alagamento"],
    p_requests: true,
  });
  assert.ifError(r.error);
  r = await d.rpc("save_push_subscription", { p_endpoint: "http://x", p_p256dh: "x", p_auth: "y", ...at(), p_radius_m: 1000 });
  assert.ok(r.error, "endpoint sem https recusado");

  const al = await publish(a, { lng: CENTER[1] + 0.003, category: "alagamento" });
  await sleep(1500);
  assert.ok((await row("posts", al.id, "notified_at")).notified_at, "publicar dispara o aviso");
  const { data: again } = await admin.rpc("push_targets_for_post", { p_id: al.id });
  assert.equal(again.length, 0, "cada post avisa uma vez");
  const ob = await publish(a, { category: "obra" });
  const { data: none } = await admin.rpc("push_targets_for_post", { p_id: ob.id });
  assert.ok(!none.some((t) => t.endpoint.includes("push.example.test")), "obra não avisa quem só quer alagamento");
  r = await a.rpc("push_targets_for_post", { p_id: al.id });
  assert.ok(r.error, "usuário comum não lê os alvos");
});

test("página de compartilhar e prévia", async () => {
  const a = await login("f2j");
  const p = await publish(a, { category: "alagamento", caption: "Alagou" });
  const html = await fetch(`${APP}/p/${p.id}`).then((x) => x.text());
  assert.match(html, /property="og:image"/);
  assert.match(html, /Alagamento em Itapetininga/);
  const og = await fetch(`${APP}/p/${p.id}/opengraph-image`);
  assert.equal(og.headers.get("content-type"), "image/png");
});

test("calor do histórico só com 3+ posts por célula", async () => {
  const { data } = await anon().rpc("heat_history", { p_city_id: CITY, p_days: 30 });
  assert.ok(data.features.every((f) => f.properties.n >= 3));
});

test("moderação", async () => {
  const [a, m] = await Promise.all(["f2k", "f2l"].map((n) => login(n)));
  const p = await publish(a, { category: "outro" });
  let r = await a.rpc("admin_queue");
  assert.ok(r.error, "não-admin não vê a fila");
  await admin.from("profiles").update({ is_admin: true }).eq("id", m.uid);
  r = await m.rpc("admin_set_post", { p_id: p.id, p_visible: false });
  assert.ifError(r.error);
  assert.equal((await row("posts", p.id, "status")).status, "hidden");
  r = await m.rpc("admin_ban_user", { p_user_id: a.uid, p_ban: true });
  assert.ifError(r.error);
  r = await a.rpc("create_request", { ...at(), p_question: "Banido?" });
  assert.match(r.error?.message ?? "", /suspensa/);
  r = await m.rpc("admin_ban_user", { p_user_id: m.uid, p_ban: true });
  assert.ok(r.error, "admin não bane a si mesmo");
});
