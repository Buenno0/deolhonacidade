import { randomBytes } from "node:crypto";
import { after } from "next/server";
import type { Category } from "@/lib/categories";
import { THUMB_SUFFIX, photoUrl, thumbUrl } from "@/lib/media";
import { blurAreas, checkImage } from "@/lib/server/blur";
import { inspect, type ModerationResult } from "@/lib/server/moderation";
import { notifyPost } from "@/lib/server/push";
import { exists, originalPath, readBytes, remove, writeBytes } from "@/lib/server/storage";
import { adminClient, ownPendingPost, userFromRequest } from "@/lib/server/supabase";

// A análise roda depois da resposta: dá tempo mesmo com a AWS lenta
export const maxDuration = 60;

const WITH_REKOGNITION = (process.env.MODERATION_PROVIDER ?? "none") === "rekognition";

// Último passo da postagem. Com o Rekognition, a resposta volta na hora
// ("processing") e o resto acontece em segundo plano: moderação, rostos e
// placas desfocados numa cópia nova (caminho novo, para nenhum cache servir a
// original), a original apagada e o post publicado. Quem postou vê o pin como
// "processando" e o app pergunta o resultado. É o único caminho até "published".
// A original fica em up/ (o CDN não serve) e só sai de lá depois de refeita.
export async function POST(request: Request, ctx: RouteContext<"/api/posts/[id]/publish">) {
  const user = await userFromRequest(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const post = await ownPendingPost(id, user.id);
  if (!post) return Response.json({ error: "Post não encontrado" }, { status: 404 });
  if (!(await exists(originalPath(post.photo_path)))) return Response.json({ error: "A foto ainda não foi enviada" }, { status: 409 });

  if (!WITH_REKOGNITION) {
    // Local, sem AWS: publica direto
    const status = await finalize(id, { approved: true, provider: "none", labels: [], faces: 0, plates: 0 }, null);
    return Response.json({ status });
  }

  // Marca como em processamento (o pin aparece para quem postou). A troca é
  // atômica: pedidos repetidos ou em paralelo não rodam a análise de novo.
  const { data: claimed } = await adminClient()
    .from("posts")
    .update({ moderation: { processing: true } })
    .eq("id", id)
    .eq("status", "pending")
    .or("moderation.is.null,moderation->>failed.eq.true")
    .select("id");
  if (!claimed?.length) return Response.json({ status: "processing" }, { status: 202 });
  after(() => processPhoto(id, post.photo_path));
  return Response.json({ status: "processing" }, { status: 202 });
}

async function processPhoto(id: string, path: string) {
  const original = originalPath(path);
  try {
    const bytes = await readBytes(original);
    const bad = await checkImage(bytes);
    if (bad) {
      await finalize(id, { approved: false, provider: "formato", labels: [{ name: bad, confidence: 100 }], faces: 0, plates: 0 }, null);
      await dropOriginal(original);
      return;
    }
    const { result, boxes } = await inspect(bytes);
    // Recusada ou não, a foto é refeita e desfocada: o admin revisa (e pode
    // restaurar) sem nunca ver nem publicar a original. O endereço novo é
    // aleatório, sem relação com o id do post.
    const safe = await blurAreas(bytes, boxes);
    const photoPath = `${path}-${randomBytes(8).toString("hex")}`;
    await Promise.all([
      writeBytes(photoPath, safe.photo, safe.photoType),
      writeBytes(photoPath + THUMB_SUFFIX, safe.thumb, "image/webp"),
    ]);
    // Esquenta o CDN: a primeira busca de um endereço novo vai até o S3 (EUA) e
    // leva segundos. Pedindo daqui (a função roda em São Paulo), a cópia fica
    // no ponto do CloudFront que atende a cidade antes de o pin aparecer.
    if (result.approved) await warmCdn([thumbUrl(photoPath), photoUrl(photoPath)]);
    await finalize(id, result, photoPath);
    await dropOriginal(original);
  } catch (e) {
    // Sem checagem, nada publica: o post fica pendente (a original segue em
    // up/, fora do CDN) e a limpeza o encerra
    console.error("processamento da foto falhou", e);
    await adminClient().from("posts").update({ moderation: { processing: false, failed: true } }).eq("id", id);
  }
}

// A original (com rostos) não fica guardada. Se apagar falhar, a limpeza de
// posts vencidos tenta de novo (allPaths inclui up/)
async function dropOriginal(original: string) {
  await remove([original, original + THUMB_SUFFIX]).catch((e) => console.error("apagar original falhou", e));
}

async function warmCdn(urls: string[]) {
  await Promise.all(
    urls.map((u) =>
      fetch(u, { signal: AbortSignal.timeout(4000) })
        .then((r) => r.arrayBuffer())
        .catch(() => {}),
    ),
  );
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
