// Painel admin: métricas, usuários, ficha, moderação de contas e registro.
import { test } from "node:test";
import assert from "node:assert/strict";
import { admin, login, publish } from "./helpers.mjs";

const FNS = [
  ["admin_counts", {}],
  ["admin_overview", { p_days: 7 }],
  ["admin_users", {}],
  ["admin_export_users", {}],
  ["admin_logs", {}],
];

test("painel: só a moderação entra, e o que ela faz fica no registro", async () => {
  const comum = await login("painel-comum");
  const mod = await login("painel-mod");
  const { id: postId, status } = await publish(comum, { caption: "painel" });
  assert.equal(status, "published");

  // Conta comum: tudo fechado
  for (const [fn, args] of FNS) {
    const r = await comum.rpc(fn, args);
    assert.equal(r.error?.code, "42501", `${fn} devia recusar conta comum`);
  }
  assert.equal((await comum.rpc("admin_user", { p_id: comum.uid })).error?.code, "42501");
  assert.equal((await comum.rpc("admin_set_admin", { p_user_id: comum.uid, p_admin: true })).error?.code, "42501");

  await admin.from("profiles").update({ is_admin: true }).eq("id", mod.uid);

  // Visão geral
  const o = await mod.rpc("admin_overview", { p_days: 14 });
  assert.equal(o.error, null);
  assert.equal(o.data.days, 14);
  assert.equal(o.data.series.length, 14);
  assert.equal(o.data.by_hour.length, 24);
  assert.ok(o.data.totals.users >= 2);
  assert.ok(o.data.totals.posts_period >= 1);
  assert.ok(o.data.active.d1 >= 1);
  const hoje = o.data.series.at(-1);
  assert.ok(hoje.signups >= 2 && hoje.posts >= 1, "o dia de hoje conta o cadastro e o post");

  // Lista e busca
  const busca = await mod.rpc("admin_users", { p_search: comum.email });
  assert.equal(busca.data.total, 1);
  assert.equal(busca.data.users[0].id, comum.uid);
  assert.equal(busca.data.users[0].posts, 1);
  const admins = await mod.rpc("admin_users", { p_filter: "admins", p_limit: 200 });
  assert.ok(admins.data.users.some((u) => u.id === mod.uid));
  assert.ok(!admins.data.users.some((u) => u.id === comum.uid));

  // Ficha: liga a conta ao post e registra a abertura com o alvo
  const ficha = await mod.rpc("admin_user", { p_id: comum.uid });
  assert.equal(ficha.error, null);
  assert.equal(ficha.data.user.email, comum.email);
  assert.ok(ficha.data.posts.some((p) => p.id === postId));
  const vistos = await mod.rpc("admin_logs", { p_action: "admin_view_user", p_user: comum.uid });
  assert.equal(vistos.data.logs[0].user_id, mod.uid);
  assert.equal(vistos.data.logs[0].target_user, comum.uid);
  assert.equal(vistos.data.logs[0].target_email, comum.email);

  // Moderação: não tira a própria; dá e tira a de outra conta
  assert.equal((await mod.rpc("admin_set_admin", { p_user_id: mod.uid, p_admin: false })).error?.code, "42501");
  assert.equal((await mod.rpc("admin_set_admin", { p_user_id: comum.uid, p_admin: true })).error, null);
  assert.equal((await comum.rpc("admin_counts")).error, null, "a conta promovida entra no painel");
  assert.equal((await mod.rpc("admin_set_admin", { p_user_id: comum.uid, p_admin: false })).error, null);
  assert.equal((await comum.rpc("admin_counts")).error?.code, "42501");

  // Banir grava quem foi banido
  assert.equal((await mod.rpc("admin_ban_user", { p_user_id: comum.uid, p_ban: true })).error, null);
  const ban = await mod.rpc("admin_logs", { p_action: "admin_ban", p_user: comum.uid });
  assert.equal(ban.data.logs[0].target_user, comum.uid);
  const todaModeracao = await mod.rpc("admin_logs", { p_action: "admin_*", p_user: mod.uid });
  const acoes = new Set(todaModeracao.data.logs.map((l) => l.action));
  for (const a of ["admin_view_user", "admin_grant", "admin_revoke", "admin_ban"]) assert.ok(acoes.has(a), `registro sem ${a}`);
  assert.ok(todaModeracao.data.logs.every((l) => l.action.startsWith("admin_")));

  // Exportar: traz as contas e fica registrado
  const csv = await mod.rpc("admin_export_users");
  assert.ok(csv.data.some((u) => u.id === comum.uid && u.banned_at));
  const exp = await mod.rpc("admin_logs", { p_action: "admin_export_users", p_user: mod.uid });
  assert.equal(exp.data.logs.length, 1);
});
