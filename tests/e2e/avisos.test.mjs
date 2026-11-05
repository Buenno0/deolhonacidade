// Avisos do tempo: o que o mapa mostra quando ninguém postou.
// A coleta do INMET não entra aqui (depende da rede); o que se testa é o que
// o banco faz com o aviso depois de guardado.
import test from "node:test";
import assert from "node:assert/strict";
import { CITY, admin, anon, login } from "./helpers.mjs";

const hs = (h) => new Date(Date.now() + h * 3600_000).toISOString();
let proximo = 900_000;
const novoId = () => ++proximo;

async function guardar({ id = novoId(), severity = "perigo", kind = "Tempestade", de = -1, ate = 6 } = {}) {
  const { error } = await admin.rpc("upsert_alert", {
    p_city_id: CITY,
    p_id: id,
    p_sequence: 1,
    p_kind: kind,
    p_severity: severity,
    p_starts_at: hs(de),
    p_ends_at: hs(ate),
    p_risks: ["Chuva forte e granizo"],
    p_instructions: ["Não se abrigue debaixo de árvores"],
  });
  assert.ifError(error);
  return id;
}

const limpar = () => admin.from("weather_alerts").delete().gte("id", 900_001);

test("leitura: pública, só o que vale agora e o que vem nas próximas 48 h", async () => {
  await limpar();
  const valendo = await guardar({ de: -1, ate: 5 });
  const amanha = await guardar({ de: 20, ate: 26, severity: "potencial" });
  const longe = await guardar({ de: 72, ate: 80, severity: "potencial" });
  const passado = await guardar({ de: -30, ate: -20, severity: "grande_perigo" });

  const { data, error } = await anon().rpc("city_alerts", { p_city_id: CITY });
  assert.ifError(error);
  const ids = data.map((a) => a.id);
  assert.ok(ids.includes(valendo), "o que está valendo aparece");
  assert.ok(ids.includes(amanha), "o que começa amanhã aparece");
  assert.ok(!ids.includes(longe), "daqui a 3 dias é previsão, não aviso");
  assert.ok(!ids.includes(passado), "o que já acabou sai do mapa");

  const a = data.find((x) => x.id === valendo);
  assert.equal(a.live, true);
  assert.equal(a.kind, "Tempestade");
  assert.equal(a.severity, "perigo");
  assert.deepEqual(a.risks, ["Chuva forte e granizo"]);
  assert.equal(data.find((x) => x.id === amanha).live, false);

  // O mais grave vem primeiro
  const grave = await guardar({ de: -1, ate: 5, severity: "grande_perigo" });
  const ordenado = (await anon().rpc("city_alerts", { p_city_id: CITY })).data;
  assert.equal(ordenado[0].id, grave, "grande perigo encabeça a lista");
  await limpar();
});

test("escrita: só o coletor; o navegador não guarda nem apaga aviso", async () => {
  const comum = await login("aviso-comum", { aged: false });
  const escrita = await comum.rpc("upsert_alert", {
    p_city_id: CITY,
    p_id: novoId(),
    p_sequence: 1,
    p_kind: "Tempestade",
    p_severity: "perigo",
    p_starts_at: hs(0),
    p_ends_at: hs(3),
    p_risks: [],
    p_instructions: [],
  });
  assert.equal(escrita.error?.code, "42501");
  assert.equal((await comum.rpc("prune_alerts", { p_city_id: CITY, p_keep: [] })).error?.code, "42501");
  assert.equal((await comum.rpc("push_targets_for_alert", { p_city_id: CITY, p_id: 1 })).error?.code, "42501");
  // ler pode
  assert.equal((await comum.rpc("city_alerts", { p_city_id: CITY })).error, null);
});

test("coleta: o aviso cancelado some, e o reemitido mais grave avisa de novo", async () => {
  await limpar();
  const fica = await guardar();
  const some = await guardar();

  const { data: apagados, error } = await admin.rpc("prune_alerts", { p_city_id: CITY, p_keep: [fica] });
  assert.ifError(error);
  assert.ok(apagados >= 1);
  const ids = (await anon().rpc("city_alerts", { p_city_id: CITY })).data.map((a) => a.id);
  assert.ok(ids.includes(fica));
  assert.ok(!ids.includes(some), "o que o INMET cancelou sai do mapa");

  // marca como já avisado, como faria o push
  await admin.from("weather_alerts").update({ notified_at: new Date().toISOString() }).eq("id", fica);
  // reemissão com a MESMA severidade não reabre o push
  await guardar({ id: fica, severity: "perigo" });
  let row = (await admin.from("weather_alerts").select("notified_at").eq("id", fica).single()).data;
  assert.ok(row.notified_at, "reemissão igual não avisa de novo");
  // subir de perigo para grande perigo reabre
  await guardar({ id: fica, severity: "grande_perigo" });
  row = (await admin.from("weather_alerts").select("notified_at, severity").eq("id", fica).single()).data;
  assert.equal(row.severity, "grande_perigo");
  assert.equal(row.notified_at, null, "ficou mais grave: avisa de novo");
  await limpar();
});

test("push: só perigo, uma vez por aviso, e só para quem está na cidade", async () => {
  await limpar();
  const morador = await login("aviso-morador");
  const sub = async (lat, lng) => {
    const { error } = await morador.rpc("save_push_subscription", {
      // a migration de segurança só aceita endpoint de provedor de verdade
      p_endpoint: `https://fcm.googleapis.com/fcm/send/${Math.random().toString(36).slice(2)}`,
      p_p256dh: "chave",
      p_auth: "auth",
      p_lat: lat,
      p_lng: lng,
      p_radius_m: 1000,
      p_categories: null,
      p_requests: true,
    });
    assert.ifError(error);
  };
  await sub(-23.5917, -48.0531);

  // Perigo potencial nunca acorda o celular
  const fraco = await guardar({ severity: "potencial" });
  let alvos = (await admin.rpc("push_targets_for_alert", { p_city_id: CITY, p_id: fraco })).data;
  assert.equal((alvos ?? []).length, 0, "aviso potencial fica só no mapa");

  // Perigo que já começou: avisa, e só uma vez
  const forte = await guardar({ severity: "perigo", de: -1, ate: 6 });
  alvos = (await admin.rpc("push_targets_for_alert", { p_city_id: CITY, p_id: forte })).data;
  assert.equal(alvos.length, 1, "quem está na cidade recebe");
  assert.ok(alvos[0].endpoint && alvos[0].p256dh && alvos[0].auth);
  const repetido = (await admin.rpc("push_targets_for_alert", { p_city_id: CITY, p_id: forte })).data;
  assert.equal((repetido ?? []).length, 0, "não avisa duas vezes pelo mesmo aviso");

  // Perigo que só começa daqui a dois dias ainda não acorda ninguém
  const futuro = await guardar({ severity: "perigo", de: 40, ate: 46 });
  alvos = (await admin.rpc("push_targets_for_alert", { p_city_id: CITY, p_id: futuro })).data;
  assert.equal((alvos ?? []).length, 0, "aviso distante espera chegar mais perto");

  await limpar();
});
