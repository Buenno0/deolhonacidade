import { presignUploads, storageProvider } from "@/lib/server/storage";
import { ownPendingPost, userFromRequest } from "@/lib/server/supabase";

// Só no modo S3: devolve dois formulários assinados (foto e miniatura) para o
// navegador enviar direto ao bucket. No modo Supabase o upload vai direto ao
// Storage, protegido pela policy can_upload_post_photo.
export async function POST(request: Request, ctx: RouteContext<"/api/posts/[id]/uploads">) {
  if (storageProvider !== "s3") return Response.json({ provider: storageProvider });
  const user = await userFromRequest(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const post = await ownPendingPost(id, user.id);
  if (!post) return Response.json({ error: "Post não encontrado" }, { status: 404 });
  return Response.json({ provider: "s3", ...(await presignUploads(post.photo_path)) });
}
