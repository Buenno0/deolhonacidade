// Marcos da cidade, a rota da Wikipédia e o "fora da área".
import test from "node:test";
import assert from "node:assert/strict";
import { APP, CITY, anon } from "./helpers.mjs";

test("marcos públicos, com posição e página da Wikipédia quando existe", async () => {
  const { data, error } = await anon().rpc("city_landmarks", { p_city_id: CITY });
  assert.ifError(error);
  assert.ok(data.length >= 15);
  // Quem o marco homenageia fica em "sobre", separado do texto do lugar
  const aviadora = data.find((l) => l.id === "aviadora");
  assert.equal(aviadora.about_title, "Anésia_Pinheiro_Machado");
  assert.ok(aviadora.about_label.startsWith("Quem foi"));
  // Patrimônio tombado: selo, endereço, fonte e foto do próprio lugar com crédito
  const escolas = data.find((l) => l.id === "tres-escolas");
  assert.equal(escolas.kind, "patrimonio");
  assert.match(escolas.heritage, /CONDEPHAAT/);
  assert.ok(escolas.address && escolas.wikidata);
  assert.ok(escolas.photos.length >= 1 && escolas.photos[0].author && escolas.photos[0].license);
  assert.ok(Math.abs(aviadora.lat + 23.59) < 0.02 && Math.abs(aviadora.lng + 48.05) < 0.02, "fica no centro");
  const w = await anon().from("landmarks").insert({ id: "x", city_id: CITY, name: "x", kind: "marco", location: "POINT(0 0)" });
  assert.ok(w.error, "ninguém escreve marco pelo navegador");
});

test("rota da Wikipédia: só páginas cadastradas", async () => {
  const ok = await fetch(`${APP}/api/landmarks/wiki?title=${encodeURIComponent("Anésia_Pinheiro_Machado")}`);
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.ok(body.extract.length > 20 && body.url.includes("wikipedia.org"));
  assert.equal((await fetch(`${APP}/api/landmarks/wiki?title=Pel%C3%A9`)).status, 404, "não é proxy aberto");
  assert.equal((await fetch(`${APP}/api/landmarks/wiki?title=${encodeURIComponent("../x")}`)).status, 400);
});

test("fora da área: acha a cidade mais próxima", async () => {
  const { data: dentro } = await anon().rpc("locate_city", { p_lat: -23.5917, p_lng: -48.0531 });
  assert.equal(dentro.inside, CITY);
  const { data: fora } = await anon().rpc("locate_city", { p_lat: -23.5505, p_lng: -46.6333 });
  assert.equal(fora.inside, null);
  assert.equal(fora.nearest.name, "Itapetininga");
  assert.ok(fora.nearest.km > 100 && fora.nearest.km < 140);
  const r = await anon().rpc("register_interest", { p_lat: -23.5505, p_lng: -46.6333 });
  assert.ifError(r.error);
});
