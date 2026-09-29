import { getSupabase } from "./supabase/client";
import { THUMB_SUFFIX } from "./media";
import type { Category } from "./categories";
import type { PreparedPhoto } from "./image/compress";

type Draft = { lat: number; lng: number; category: Category; caption: string; requestId?: string | null } & PreparedPhoto;
type PresignedPost = { url: string; fields: Record<string, string> };

// O caminho de uma postagem, do navegador:
// 1. create_post (RPC): valida local, limite e termos; reserva o caminho
// 2. envia foto e miniatura (Supabase Storage direto, ou S3 com formulário assinado)
// 3. /api/posts/[id]/publish: moderação + publicação no servidor
export async function submitPost(draft: Draft, onStep: (s: string) => void): Promise<string> {
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Faça login para continuar");
  const auth = { Authorization: `Bearer ${token}` };

  onStep("Conferindo a localização…");
  const { data, error } = await supabase.rpc("create_post", {
    p_lat: draft.lat,
    p_lng: draft.lng,
    p_category: draft.category,
    p_caption: draft.caption,
    p_request_id: draft.requestId ?? null,
  });
  if (error) throw error;
  const { id, photo_path } = data as { id: string; photo_path: string };

  onStep("Enviando a foto…");
  const targets = await fetch(`/api/posts/${id}/uploads`, { method: "POST", headers: auth }).then((r) => r.json());
  if (targets.provider === "s3") {
    await Promise.all([
      uploadToS3(targets.photo as PresignedPost, draft.photo),
      uploadToS3(targets.thumb as PresignedPost, draft.thumb),
    ]);
  } else {
    const bucket = supabase.storage.from("posts");
    const [a, b] = await Promise.all([
      bucket.upload(photo_path, draft.photo, { contentType: draft.photo.type, upsert: false }),
      bucket.upload(photo_path + THUMB_SUFFIX, draft.thumb, { contentType: draft.thumb.type, upsert: false }),
    ]);
    if (a.error || b.error) throw a.error ?? b.error;
  }

  onStep("Verificando e publicando…");
  const res = await fetch(`/api/posts/${id}/publish`, { method: "POST", headers: auth });
  const body = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
  if (!res.ok || body.status !== "published") throw new Error(body.error ?? "Não foi possível publicar");
  return id;
}

async function uploadToS3({ url, fields }: PresignedPost, blob: Blob) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("Content-Type", blob.type);
  form.append("file", blob); // o arquivo tem que ser o último campo
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Falha no envio da foto (${res.status})`);
}
