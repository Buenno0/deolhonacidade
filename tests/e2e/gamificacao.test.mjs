// XP, níveis, conquistas, limite diário e apelido.
import test from "node:test";
import assert from "node:assert/strict";
import { CENTER, CITY, admin, anon, login, publish } from "./helpers.mjs";

const at = (d = 0) => ({ p_lat: CENTER[0] + d, p_lng: CENTER[1] });
const progress = async (c) => (await c.rpc("my_progress")).data;

test("postar dá pouco; ser confirmado dá mais; primeiro olhar", async () => {
  const [a, b] = await Promise.all(["g-a", "g-b"].map((n) => login(n)));
  const p = await publish(a, { category: "evento" });
  let pa = await progress(a);
  assert.equal(pa.xp, 5, "publicar vale 5");
  assert.ok(pa.badges.some((x) => x.badge === "primeiro_olhar" && !x.seen), "primeiro olhar, ainda não visto");
  assert.equal(pa.streak_days, 1);

  await b.rpc("vote_post", { p_id: p.id, p_still: true, ...at(0.001) });
  pa = await progress(a);
  assert.equal(pa.xp, 15, "confirmação de outra pessoa vale +10");
  assert.equal((await progress(b)).xp, 2, "quem confirmou ganha +2");

  await a.rpc("mark_badges_seen");
  assert.ok((await progress(a)).badges.every((x) => x.seen));
});

test("resposta rápida a pedido vale 15; post escondido tira 30", async () => {
  const [a, b, c, d, e] = await Promise.all(["g-c", "g-d", "g-e", "g-f", "g-g"].map((n) => login(n)));
  const { data: req } = await b.rpc("create_request", { ...at(), p_question: "Alguém perto da praça?" });
  await publish(a, { category: "outro", requestId: req });
  assert.equal((await progress(a)).xp, 5 + 15);

  const p = await publish(a, { category: "outro" });
  for (const u of [c, d, e]) await u.rpc("report_post", { p_id: p.id });
  assert.equal((await progress(a)).xp, 0, "25 − 30 fica em 0: XP nunca negativo");
});

test("derrubar post falso dá detetive a quem negou", async () => {
  const [a, b, c, d] = await Promise.all(["g-h", "g-i", "g-j", "g-k"].map((n) => login(n)));
  const p = await publish(a, { category: "evento" });
  for (const u of [b, c, d]) await u.rpc("vote_post", { p_id: p.id, p_still: false, ...at() });
  const pb = await progress(b);
  assert.equal(pb.xp, 1 + 5, "negar vale 1; ajudar a derrubar vale 5");
  assert.ok(pb.badges.some((x) => x.badge === "detetive" && x.tier === 1));
});

test("limite de 150 XP por dia e nível", async () => {
  const a = await login("g-l");
  const { data: prof } = await admin.from("profiles").select("xp_day_total").eq("id", a.uid).single();
  assert.equal(prof.xp_day_total, 0);
  // simula um dia cheio: 145 já ganhos hoje
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); // America/Sao_Paulo ≈ UTC-3
  await admin.from("profiles").update({ xp: 145, xp_day: today, xp_day_total: 145 }).eq("id", a.uid);
  await publish(a, { category: "outro" });
  await publish(a, { category: "outro" });
  const pa = await progress(a);
  assert.equal(pa.xp, 150, "passou do teto, não soma");
  assert.equal(pa.level, 2, "150 XP é Olheiro");
});

test("apelido: formato, único e só aparece se a pessoa quiser", async () => {
  const [a, b] = await Promise.all(["g-m", "g-n"].map((n) => login(n)));
  let r = await a.rpc("set_nickname", { p_nickname: "A B", p_show: true });
  assert.ok(r.error, "formato inválido");
  const nick = `olheiro_${Date.now() % 100000}`;
  r = await a.rpc("set_nickname", { p_nickname: nick, p_show: false });
  assert.ifError(r.error);
  r = await b.rpc("set_nickname", { p_nickname: nick, p_show: true });
  assert.match(r.error?.message ?? "", /dono/);

  const p = await publish(a, { category: "evento" });
  const find = async () => (await anon().rpc("active_posts", { p_city_id: CITY })).data.features.find((f) => f.id === p.id).properties;
  let props = await find();
  assert.equal(props.author_nickname, null, "escondido por padrão");
  assert.equal(props.author_level, 1);
  await a.rpc("set_nickname", { p_nickname: nick, p_show: true });
  props = await find();
  assert.equal(props.author_nickname, nick);
});

test("navegador não concede XP a si mesmo", async () => {
  const a = await login("g-o");
  const r = await a.rpc("grant_xp", { p_user: a.uid, p_kind: "hack", p_points: 1000 });
  assert.ok(r.error);
  const r2 = await a.rpc("check_badges", { p_user: a.uid });
  assert.ok(r2.error);
});

test("primeiras vezes: votar, perguntar, responder e compartilhar", async () => {
  const [a, b] = await Promise.all(["g-p", "g-q"].map((n) => login(n)));
  const has = async (c, id) => (await progress(c)).badges.some((x) => x.badge === id && !x.seen);

  const p = await publish(a, { category: "evento" });
  await b.rpc("vote_post", { p_id: p.id, p_still: false, ...at() });
  assert.ok(await has(b, "testemunha"), "primeiro voto (mesmo negando)");

  const { data: req } = await a.rpc("create_request", { ...at(), p_question: "Tem fila no posto?" });
  assert.ok(await has(a, "primeira_pergunta"));

  await publish(b, { category: "outro", requestId: req });
  assert.ok(await has(b, "mao_amiga"), "primeira resposta a um pedido");

  await b.rpc("record_interaction", { p_id: p.id, p_kind: "share" });
  assert.ok(await has(b, "espalhou"), "primeiro compartilhamento");
  await a.rpc("record_interaction", { p_id: p.id, p_kind: "share" });
  assert.ok(!(await has(a, "espalhou")), "compartilhar o próprio post não conta");
});
