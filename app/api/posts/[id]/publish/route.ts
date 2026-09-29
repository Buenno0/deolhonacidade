import { after } from "next/server";
import type { Category } from "@/lib/categories";
import { THUMB_SUFFIX } from "@/lib/media";
import { blurAreas } from "@/lib/server/blur";
import { inspect, type ModerationResult } from "@/lib/server/moderation";
import { notifyPost } from "@/lib/server/push";
import { exists, readBytes, remove, writeBytes } from "@/lib/server/storage";
import { adminClient, ownPendingPost, userFromRequest } from "@/lib/server/supabase";

// A análise roda depois da resposta: dá tempo mesmo com a AWS lenta
export const maxDuration = 60;

const WITH_REKOGNITION = (process.env.MODERATION_PROVIDER ?? "none") === "rekognition";

// Último passo da postagem. Com o Rekognition, a resposta volta na hora
// ("processing") e o resto acontece em segundo plano: moderação, rostos e
// placas desfocados numa cópia nova (caminho novo, para nenhum cache servir a
// original), a original apagada e o post publicado. Quem postou vê o pin como
// "processando" e o app pergunta o resultado. É o único caminho até "published".
export async function POST(request: Request, ctx: RouteContext<"/api/posts/[id]/publish">) {
  const user = await userFromRequest(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const post = await ownPendingPost(id, user.id);
  if (!post) return Response.json({ error: "Post não encontrado" }, { status: 404 });
  if (!(await exists(post.photo_path))) return Response.json({ error: "A foto ainda não foi enviada" }, { status: 409 });

  if (!WITH_REKOGNITION) {
    // Local, sem AWS: publica direto
    const status = await finalize(id, { approved: true, provider: "none", labels: [], faces: 0, plates: 0 }, null);
    return Response.json({ status });
  }

  // Marca como em processamento: o pin aparece para quem postou
  await adminClient().from("posts").update({ moderation: { processing: true } }).eq("id", id);
  after(() => processPhoto(id, post.photo_path));
  return Response.json({ status: "processing" }, { status: 202 });
}

async function processPhoto(id: string, original: string) {
  try {
    const bytes = await readBytes(original);
    const { result, boxes } = await inspect(bytes);
    let photoPath: string | null = null;
    if (result.approved) {
      const safe = await blurAreas(bytes, boxes);
      photoPath = `${original}-b`;
      await Promise.all([
        writeBytes(photoPath, safe.photo, "image/webp"),
        writeBytes(photoPath + THUMB_SUFFIX, safe.thumb, "image/webp"),
      ]);
    }
    await finalize(id, result, photoPath);
    // A original (com rostos) não fica guardada; se foi recusada, sai também
    await remove(photoPath ? [original, original + THUMB_SUFFIX] : []).catch((e) => console.error("apagar original falhou", e));
  } catch (e) {
    // Sem checagem, nada publica: o post fica pendente e a limpeza o encerra
    console.error("processamento da foto falhou", e);
    await adminClient().from("posts").update({ moderation: { processing: false, failed: true } }).eq("id", id);
  }
}

async function finalize(id: string, result: ModerationResult, photoPath: string | null) {
  const { data: status, error } = await adminClient().rpc("finalize_post", {
    p_id: id,
    p_approved: result.approved,
    p_moderation: result,
    p_photo_path: photoPath,
  });
  if (error) throw error;
  if (status === "published") {
    after(async () => {
      const { data: p } = await adminClient().from("posts").select("id, category, caption").eq("id", id).single();
      if (p) await notifyPost(p as { id: string; category: Category; caption: string | null }).catch((e) => console.error("aviso do post falhou", e));
    });
  }
  return status as string;
}
