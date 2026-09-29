import { after } from "next/server";
import type { Category } from "@/lib/categories";
import { moderate } from "@/lib/server/moderation";
import { notifyPost } from "@/lib/server/push";
import { exists } from "@/lib/server/storage";
import { adminClient, ownPendingPost, userFromRequest } from "@/lib/server/supabase";

// Último passo da postagem: confere a foto, passa pela moderação automática e
// publica (ou esconde) com a service_role. É o único caminho até "published".
export async function POST(request: Request, ctx: RouteContext<"/api/posts/[id]/publish">) {
  const user = await userFromRequest(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const post = await ownPendingPost(id, user.id);
  if (!post) return Response.json({ error: "Post não encontrado" }, { status: 404 });
  if (!(await exists(post.photo_path))) return Response.json({ error: "A foto ainda não foi enviada" }, { status: 409 });

  let result;
  try {
    result = await moderate(post.photo_path);
  } catch (e) {
    // Moderação fora do ar não publica nada sem checagem: o post fica pendente
    console.error("moderação falhou", e);
    return Response.json({ error: "Não foi possível verificar a foto agora. Tente de novo." }, { status: 503 });
  }

  const { data: status, error } = await adminClient().rpc("finalize_post", {
    p_id: id,
    p_approved: result.approved,
    p_moderation: result,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Alertas por área e resposta a pedido: depois de responder, sem atrasar quem postou
  if (status === "published") {
    after(async () => {
      const { data: p } = await adminClient().from("posts").select("id, category, caption").eq("id", id).single();
      if (p) await notifyPost(p as { id: string; category: Category; caption: string | null }).catch((e) => console.error("aviso do post falhou", e));
    });
  }

  return Response.json(
    status === "published"
      ? { status }
      : { status, error: "A foto foi recusada pela moderação automática. Se achar que foi engano, tente outra foto." },
  );
}
