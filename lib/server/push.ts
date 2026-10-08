import "server-only";
import webpush from "web-push";
import { CATEGORIES, type Category } from "@/lib/categories";
import { adminClient } from "./supabase";

// Web Push com VAPID. Sem as chaves no ambiente, os avisos ficam desligados.
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const enabled = Boolean(PUBLIC && PRIVATE);
if (enabled) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:contato@deolhonacidade.local", PUBLIC!, PRIVATE!);

type Target = { endpoint: string; p256dh: string; auth: string };
type Payload = { title: string; body: string; url: string; tag: string };

async function send(targets: Target[], payload: (t: Target) => Payload) {
  if (!enabled || targets.length === 0) return { sent: 0 };
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          JSON.stringify({ ...payload(t), icon: "/icons/icon-192.png" }),
          { TTL: 60 * 60 },
        );
        sent++;
      } catch (e) {
        // 404/410: a inscrição morreu (app desinstalado, permissão retirada)
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(t.endpoint);
        else console.error("push falhou", code, e);
      }
    }),
  );
  if (gone.length) await adminClient().from("push_subscriptions").delete().in("endpoint", gone);
  return { sent };
}

export async function notifyPost(post: { id: string; category: Category; caption: string | null }) {
  const { data, error } = await adminClient().rpc("push_targets_for_post", { p_id: post.id });
  if (error) throw error;
  const label = CATEGORIES[post.category].label;
  return send((data ?? []) as (Target & { kind: string })[], (t) =>
    (t as Target & { kind: string }).kind === "resposta"
      ? { title: "Responderam sua pergunta", body: post.caption ?? `Chegou uma foto: ${label}`, url: `/p/${post.id}`, tag: `post-${post.id}` }
      : { title: `${label} perto de você`, body: post.caption ?? "Novo registro no mapa", url: `/p/${post.id}`, tag: `post-${post.id}` },
  );
}

export async function notifyRequest(id: string) {
  const { data, error } = await adminClient().rpc("push_targets_for_request", { p_id: id });
  if (error) throw error;
  const targets = (data ?? []) as (Target & { question: string })[];
  return send(targets, (t) => ({
    title: "Alguém aí? Pedido de foto perto de você",
    body: (t as Target & { question: string }).question,
    url: `/mapa?pedido=${id}`,
    tag: `pedido-${id}`,
  }));
}
