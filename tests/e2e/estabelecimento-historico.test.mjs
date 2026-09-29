// Divulgação de estabelecimento e histórico de 30 dias.
import test from "node:test";
import assert from "node:assert/strict";
import { APP, CENTER, CITY, admin, anon, env, login, publish, row } from "./helpers.mjs";

const cityDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

async function runCleanup() {
  const res = await fetch(`${APP}/api/cron/expire`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
  assert.equal(res.status, 200, "rota de limpeza");
  return res.json();
}

async function photoExists(path) {
  const [dir, name] = path.split("/");
  const { data } = await admin.storage.from("posts").list(dir, { search: name });
  return (data ?? []).some((f) => f.name === name);
}

async function expireNow(...ids) {
  await admin.from("posts").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).in("id", ids);
}

test("divulgação: só estabelecimento aprovado, no endereço, uma por dia, sem XP e sem votos", async () => {
  const loja = await login("loja");
  const qualquer = await login("qualquer");

  const semNegocio = await publish(qualquer, { category: "estabelecimento" });
  assert.match(semNegocio.error?.message ?? "", /verificados/);

  const { data: pedido, error } = await loja.rpc("request_business", {
    p_name: "Padaria do Teste",
    p_segment: "Padaria",
    p_address: "Rua de Teste, 100",
    p_lat: CENTER[0],
    p_lng: CENTER[1],
    p_whatsapp: "15 99999-0000",
    p_instagram: "@padariateste",
  });
  assert.ifError(error);
  assert.equal(pedido.status, "pending");
  assert.match((await publish(loja, { category: "estabelecimento" })).error?.message ?? "", /verificados/, "pendente não posta");

  // A moderação aprova (aqui direto com a service_role)
  await admin.from("businesses").update({ status: "approved" }).eq("id", pedido.id);

  const longe = await publish(loja, { category: "estabelecimento", lat: CENTER[0] + 0.01 });
  assert.match(longe.error?.message ?? "", /endereço/);

  const ok = await publish(loja, { category: "estabelecimento", caption: "Pão quentinho até as 10h", keepHistory: true });
  assert.equal(ok.status, "published");
  const r = await row("posts", ok.id, "business_id, keep_history");
  assert.equal(r.business_id, pedido.id);
  assert.equal(r.keep_history, false, "divulgação nunca vai para o histórico");

  const { data: xp } = await admin.from("xp_events").select("kind").eq("user_id", loja.uid);
  assert.equal((xp ?? []).length, 0, "divulgação não rende XP");

  const { data: fc } = await anon().rpc("active_posts", { p_city_id: CITY });
  const f = fc.features.find((x) => x.properties.id === ok.id);
  assert.equal(f.properties.business_name, "Padaria do Teste");
  assert.equal(f.properties.business_instagram, "@padariateste");
  assert.equal(f.properties.author_level, null, "divulgação não mostra o nível de quem postou");

  const voto = await qualquer.rpc("vote_post", { p_id: ok.id, p_still: true, p_lat: CENTER[0], p_lng: CENTER[1] });
  assert.match(voto.error?.message ?? "", /Divulgação/);

  const segunda = await publish(loja, { category: "estabelecimento" });
  assert.match(segunda.error?.message ?? "", /24 horas/);

  const { data: meu } = await loja.rpc("my_business");
  assert.equal(meu.status, "approved");
  assert.ok(meu.last_post_at);
  const fila = await loja.rpc("admin_businesses", { p_status: null });
  assert.ok(fila.error, "a fila é só da moderação");
});

test("histórico: guarda a foto de quem escolheu, some a de quem não escolheu, o autor tira", async () => {
  const autor = await login("hist");
  const outro = await login("hist-outro");
  const guardado = await publish(autor, { category: "evento", caption: "Show na praça", keepHistory: true });
  const comum = await publish(autor, { category: "evento" });
  assert.equal(guardado.status, "published");
  assert.equal((await row("posts", guardado.id, "keep_history")).keep_history, true);

  await expireNow(guardado.id, comum.id);
  await runCleanup();

  const g = await row("posts", guardado.id, "status, photo_path, archived_until");
  assert.equal(g.status, "expired");
  assert.ok(g.photo_path, "a foto guardada continua");
  assert.ok(new Date(g.archived_until) > new Date(Date.now() + 29 * 864e5));
  assert.ok(await photoExists(g.photo_path), "o arquivo continua no Storage");
  assert.equal((await row("posts", comum.id, "photo_path")).photo_path, null, "a foto comum foi apagada");

  const today = cityDay();
  const { data: days } = await anon().rpc("history_days", { p_city_id: CITY });
  assert.ok(days.some((d) => d.day === today && d.n >= 1));
  const { data: fc } = await anon().rpc("history_posts", { p_city_id: CITY, p_day: today });
  const f = fc.features.find((x) => x.properties.id === guardado.id);
  assert.ok(f, "aparece no dia");
  assert.equal(f.properties.caption, "Show na praça");
  assert.ok(!("author_level" in f.properties) && !("user_id" in f.properties), "sem nada de quem postou");
  assert.ok(!fc.features.some((x) => x.properties.id === comum.id));

  const { data: pub } = await anon().rpc("public_post", { p_id: guardado.id });
  assert.equal(pub.archived, true);
  assert.ok(pub.photo_path, "o link compartilhado continua abrindo");

  const denuncia = await outro.rpc("report_post", { p_id: guardado.id });
  assert.ifError(denuncia.error);

  const { data: meus } = await autor.rpc("my_posts");
  assert.ok(meus.find((p) => p.id === guardado.id).archived_until);

  const tirar = await autor.rpc("remove_from_history", { p_id: guardado.id });
  assert.ifError(tirar.error);
  assert.ok((await outro.rpc("remove_from_history", { p_id: comum.id })).error, "só o autor tira");
  await runCleanup();
  assert.equal((await row("posts", guardado.id, "photo_path")).photo_path, null, "tirou, a foto sai");
});

test("histórico: teto de 500 por cidade, com os 10 melhores de cada dia garantidos", async () => {
  const dono = await login("teto");
  const now = Date.now();
  const base = { user_id: dono.uid, city_id: CITY, location: `POINT(${CENTER[1]} ${CENTER[0]})`, category: "outro", status: "expired" };
  const rows = [];
  // Um dia cheio e bem visto (400) e 12 dias fracos com 10 cada: 520 no total
  for (let i = 0; i < 400; i++) {
    const created = new Date(now - 864e5 - i * 1000);
    rows.push({ ...base, created_at: created.toISOString(), view_count: 100 + i, photo_path: `${CITY}/teto-a-${i}` });
  }
  for (let d = 2; d < 14; d++) {
    for (let i = 0; i < 10; i++) {
      const created = new Date(now - d * 864e5 - i * 1000);
      rows.push({ ...base, created_at: created.toISOString(), view_count: 0, photo_path: `${CITY}/teto-${d}-${i}` });
    }
  }
  for (const r of rows) {
    r.expires_at = r.created_at;
    r.keep_history = true;
    r.archived_until = new Date(new Date(r.created_at).getTime() + 30 * 864e5).toISOString();
  }
  const { error } = await admin.from("posts").insert(rows);
  assert.ifError(error);

  await runCleanup();

  const { count } = await admin
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("city_id", CITY)
    .gt("archived_until", new Date().toISOString());
  assert.ok(count <= 500, `no máximo 500 (${count})`);

  const { data: mine } = await admin
    .from("posts")
    .select("photo_path, archived_until")
    .eq("user_id", dono.uid);
  const kept = mine.filter((p) => p.archived_until && new Date(p.archived_until) > new Date());
  for (let d = 2; d < 14; d++) {
    assert.equal(kept.filter((p) => p.photo_path?.startsWith(`${CITY}/teto-${d}-`)).length, 10, `dia ${d} garante os 10`);
  }
  const cut = mine.filter((p) => !p.archived_until);
  assert.ok(cut.length >= 20, "os excedentes saíram");
  assert.ok(cut.every((p) => p.photo_path === null), "e as fotos deles foram para a limpeza");
});
