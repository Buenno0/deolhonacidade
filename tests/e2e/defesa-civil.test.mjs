// Sala de situação da Defesa Civil: quem entra, o que o agente enxerga da
// própria cidade, e a guarda de evidência que só liga por contrato.
import test from "node:test";
import assert from "node:assert/strict";
import { APP, CENTER, CITY, admin, env, login, publish, row } from "./helpers.mjs";

const FNS = [
  ["agency_live", {}],
  ["agency_summary", { p_days: 30 }],
  ["agency_log", { p_limit: 10 }],
  ["agency_recurrence", { p_days: 90 }],
];

const vira = (c, cidade = CITY, nome = "Defesa Civil de Teste") =>
  admin.from("profiles").update({ is_agent: true, agency_city: cidade, agency_name: nome }).eq("id", c.uid);

const expirar = (...ids) =>
  admin.from("posts").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).in("id", ids);

const limpeza = () => fetch(`${APP}/api/cron/expire`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });

const retencao = (dias) => admin.from("cities").update({ agency_retention_days: dias }).eq("id", CITY);

test("porta: só agente com cidade entra, e moderação não é crachá", async () => {
  const comum = await login("dc-comum", { aged: false });
  const agente = await login("dc-agente", { aged: false });

  for (const [fn, args] of FNS) {
    assert.equal((await comum.rpc(fn, args)).error?.code, "42501", `${fn} devia recusar conta comum`);
  }
  assert.equal((await comum.rpc("agency_event", { p_id: comum.uid })).error?.code, "42501");
  assert.equal(
    (await comum.rpc("admin_set_agent", { p_user_id: comum.uid, p_agent: true, p_city: CITY })).error?.code,
    "42501",
    "só a moderação dá o crachá",
  );

  // Agente sem cidade não entra: o painel é sempre de um município
  await admin.from("profiles").update({ is_agent: true, agency_city: null }).eq("id", agente.uid);
  assert.match((await agente.rpc("agency_live")).error?.message ?? "", /cidade/i);

  await vira(agente);
  for (const [fn, args] of FNS) {
    assert.equal((await agente.rpc(fn, args)).error, null, `${fn} devia abrir para o agente`);
  }

  // Crachá não abre a moderação
  assert.equal((await agente.rpc("admin_counts", {})).error?.code, "42501");
  assert.equal((await agente.rpc("admin_users", {})).error?.code, "42501");

  // Banido perde o crachá na hora
  await admin.from("profiles").update({ banned_at: new Date().toISOString() }).eq("id", agente.uid);
  assert.equal((await agente.rpc("agency_live")).error?.code, "42501");
  await admin.from("profiles").update({ banned_at: null }).eq("id", agente.uid);
});

test("agora: só ocorrência, e o que não é ocorrência não aparece", async () => {
  const morador = await login("dc-morador");
  const agente = await login("dc-ag2", { aged: false });
  await vira(agente);

  const alagou = await publish(morador, { category: "alagamento", caption: "Ponte alagada" });
  const festa = await publish(morador, { category: "evento", caption: "Feira" });
  assert.equal(alagou.status, "published");
  assert.equal(festa.status, "published");

  const { data, error } = await agente.rpc("agency_live");
  assert.ifError(error);
  const ids = data.features.map((f) => f.id);
  assert.ok(ids.includes(alagou.id), "alagamento entra");
  assert.ok(!ids.includes(festa.id), "evento não é ocorrência da Defesa Civil");

  const f = data.features.find((x) => x.id === alagou.id);
  assert.equal(f.caption, "Ponte alagada");
  assert.equal(f.live, true);
  assert.ok(typeof f.lat === "number" && typeof f.lng === "number", "coordenada vem numérica");
  assert.equal(f.user_id, undefined, "o painel nunca recebe quem postou");

  const s = await agente.rpc("agency_summary", { p_days: 30 });
  assert.ifError(s.error);
  assert.equal(s.data.city.id, CITY);
  assert.equal(s.data.series.length, 30);
  assert.equal(s.data.by_hour.length, 24);
  assert.ok(s.data.live_now >= 1);
  assert.ok(s.data.by_category.some((c) => c.category === "alagamento"));
  assert.ok(!s.data.by_category.some((c) => c.category === "evento"));
});

test("registro: sem retenção some com o vencido; com retenção o órgão guarda", async () => {
  const morador = await login("dc-morador2");
  const agente = await login("dc-ag3", { aged: false });
  await vira(agente);

  // --- retenção desligada (o padrão): vencido sai do painel e a foto some
  await retencao(0);
  const semGuarda = await publish(morador, { category: "acidente", caption: "Batida na esquina" });
  await expirar(semGuarda.id);
  await limpeza();

  let log = await agente.rpc("agency_log", { p_limit: 50 });
  assert.ifError(log.error);
  assert.ok(!log.data.events.some((e) => e.id === semGuarda.id), "sem contrato, o vencido não fica no registro");
  assert.equal((await row("posts", semGuarda.id, "agency_until")).agency_until, null);
  assert.match((await agente.rpc("agency_event", { p_id: semGuarda.id })).error?.message ?? "", /não encontrada/);

  // --- retenção ligada: o vencido vira registro do município
  await retencao(365);
  const guardado = await publish(morador, { category: "alagamento", caption: "Rua tomada pela água" });
  const denunciado = await publish(morador, { category: "alagamento", caption: "Duvidoso" });
  await admin.from("posts").update({ report_count: 3 }).eq("id", denunciado.id);
  await expirar(guardado.id, denunciado.id);
  await limpeza();

  assert.ok((await row("posts", guardado.id, "agency_until")).agency_until, "ocorrência vira evidência");
  assert.equal((await row("posts", denunciado.id, "agency_until")).agency_until, null, "denunciado nunca é evidência");

  log = await agente.rpc("agency_log", { p_limit: 50 });
  assert.ifError(log.error);
  const e = log.data.events.find((x) => x.id === guardado.id);
  assert.ok(e, "o guardado aparece no registro");
  assert.equal(e.live, false, "aparece como encerrada, não no ar");
  assert.ok(!log.data.events.some((x) => x.id === denunciado.id));

  // Filtro por categoria (array de enum vindo do navegador)
  const so = await agente.rpc("agency_log", { p_categories: ["acidente"], p_limit: 50 });
  assert.ifError(so.error);
  assert.ok(!so.data.events.some((x) => x.id === guardado.id), "filtro de categoria exclui alagamento");

  // A ficha: existe, declara o desfoque e fica no registro de acesso
  const ficha = await agente.rpc("agency_event", { p_id: guardado.id });
  assert.ifError(ficha.error);
  assert.equal(ficha.data.event.id, guardado.id);
  assert.equal(ficha.data.city.name, "Itapetininga");
  assert.equal(ficha.data.issued_by.agency, "Defesa Civil de Teste");
  assert.equal(typeof ficha.data.event.faces_blurred, "number");
  const { data: logs } = await admin
    .from("access_logs")
    .select("action")
    .eq("user_id", agente.uid)
    .eq("post_id", guardado.id);
  assert.ok((logs ?? []).some((l) => l.action === "agency_view_event"), "abrir a ficha fica registrado");

  // LGPD: o autor apaga e a evidência cai junto
  await morador.rpc("delete_my_post", { p_id: guardado.id });
  assert.equal((await row("posts", guardado.id, "agency_until")).agency_until, null);
  assert.match((await agente.rpc("agency_event", { p_id: guardado.id })).error?.message ?? "", /não encontrada/);

  await retencao(0);
});

test("recorrência: um trecho só entra a partir da segunda vez", async () => {
  const morador = await login("dc-morador3");
  const agente = await login("dc-ag4", { aged: false });
  await vira(agente);

  const uma = [CENTER[0] + 0.004, CENTER[1] + 0.004];
  const duas = [CENTER[0] - 0.004, CENTER[1] - 0.004];
  await publish(morador, { category: "obra", lat: uma[0], lng: uma[1] });
  await publish(morador, { category: "obra", lat: duas[0], lng: duas[1] });
  await publish(morador, { category: "obra", lat: duas[0], lng: duas[1] });

  const { data, error } = await agente.rpc("agency_recurrence", { p_days: 90 });
  assert.ifError(error);
  const perto = (s, p) => Math.abs(s.lat - p[0]) < 0.001 && Math.abs(s.lng - p[1]) < 0.001;
  assert.ok(!data.some((s) => perto(s, uma)), "uma ocorrência sozinha não é recorrência");
  const t = data.find((s) => perto(s, duas));
  assert.ok(t, "duas no mesmo trecho entram");
  assert.ok(t.n >= 2);
  assert.ok(t.categories.includes("obra"));

  const so = await agente.rpc("agency_recurrence", { p_days: 90, p_category: "alagamento" });
  assert.ifError(so.error);
  assert.ok(!so.data.some((s) => perto(s, duas)), "o filtro de categoria vale");
});

test("cidade: o agente não alcança outro município", async () => {
  const agente = await login("dc-ag5", { aged: false });
  const morador = await login("dc-morador4");
  const nossa = await publish(morador, { category: "transito", caption: "Fila na avenida" });

  // Crachá de outra cidade: o painel abre vazio, nunca com os dados daqui
  const outra = 3550308; // São Paulo
  const { error } = await admin.from("cities").upsert({
    id: outra,
    name: "São Paulo",
    uf: "SP",
    boundary: "SRID=4326;MULTIPOLYGON(((-46.9 -24.1,-46.3 -24.1,-46.3 -23.3,-46.9 -23.3,-46.9 -24.1)))",
  });
  assert.ifError(error);
  await vira(agente, outra, "Defesa Civil de São Paulo");

  const live = await agente.rpc("agency_live");
  assert.ifError(live.error);
  assert.ok(!live.data.features.some((f) => f.id === nossa.id), "não vê ocorrência de outro município");
  assert.equal(live.data.city_id, outra);
  assert.match((await agente.rpc("agency_event", { p_id: nossa.id })).error?.message ?? "", /não encontrada/);

  const s = await agente.rpc("agency_summary", { p_days: 30 });
  assert.equal(s.data.city.name, "São Paulo");

  // Pedido fora do município é recusado pelo limite oficial
  const fora = await agente.rpc("agency_ask", { p_lat: CENTER[0], p_lng: CENTER[1], p_question: "Alagou aí?" });
  assert.match(fora.error?.message ?? "", /fora do município/);

  // A cidade de mentira não pode sobrar: profiles.agency_city aponta para ela
  // e a FK barra o delete em silêncio, deixando São Paulo no banco local —
  // o que faz "fora da área" e "dentro da cidade" falharem nos outros arquivos.
  await vira(agente, CITY);
  const limpou = await admin.from("cities").delete().eq("id", outra);
  assert.ifError(limpou.error);
  const { data: sobrou } = await admin.from("cities").select("id").eq("id", outra);
  assert.equal((sobrou ?? []).length, 0, "a cidade de teste saiu do banco");
});

test("pedir olhos: o agente abre pedido de dentro da sala, e quem está perto responde", async () => {
  const agente = await login("dc-ag6", { aged: false });
  const vizinho = await login("dc-vizinho");
  await vira(agente);

  const { data: id, error } = await agente.rpc("agency_ask", {
    p_lat: CENTER[0],
    p_lng: CENTER[1],
    p_question: "A água já baixou na ponte?",
  });
  assert.ifError(error);

  const live = await agente.rpc("agency_live");
  assert.ok(live.data.requests.some((r) => r.id === id), "o pedido aparece na sala");

  const resposta = await publish(vizinho, { category: "alagamento", requestId: id, caption: "Baixou" });
  assert.equal(resposta.status, "published");
  const f = (await agente.rpc("agency_live")).data.features.find((x) => x.id === resposta.id);
  assert.equal(f.answers_request, true, "a ficha marca que é resposta a um pedido");
});
