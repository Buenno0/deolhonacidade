import { after } from "next/server";
import { notifyRequest } from "@/lib/server/push";
import { adminClient, userFromRequest } from "@/lib/server/supabase";

// O navegador chama logo depois de criar um "Alguém aí?". Só o autor, uma vez
// (push_targets_for_request marca notified_at), e o envio roda depois da resposta.
export async function POST(request: Request, ctx: RouteContext<"/api/requests/[id]/notify">) {
  const user = await userFromRequest(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const { data } = await adminClient().from("requests").select("user_id, status").eq("id", id).maybeSingle();
  if (!data || data.user_id !== user.id || data.status !== "open") {
    return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
  }
  after(() => notifyRequest(id).catch((e) => console.error("aviso do pedido falhou", e)));
  return Response.json({ ok: true });
}
