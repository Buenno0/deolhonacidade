import { getSupabase } from "./supabase/client";
import { THUMB_SUFFIX } from "./media";
import type { Category } from "./categories";
import type { PreparedPhoto } from "./image/compress";

type Draft = { lat: number; lng: number; category: Category; caption: string; requestId?: string | null; keepHistory?: boolean } & PreparedPhoto;
type PresignedPost = { url: string; fields: Record<string, string> };

// O caminho de uma postagem, do navegador:
// 1. create_post (RPC): valida local, limite e termos; reserva o caminho
// 2. envia foto e miniatura (Supabase Storage direto, ou S3 com formulário assinado)
// 3. /api/posts/[id]/publish: moderação + publicação no servidor
export async function submitPost(draft: Draft, onStep: (s: string) => void): Promise<{ id: string; processing: boolean }> {
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
    p_keep_history: Boolean(draft.keepHistory),
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

  onStep("Publicando…");
  const res = await fetch(`/api/posts/${id}/publish`, { method: "POST", headers: auth });
  const body = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
  // "processing": o servidor desfoca rostos e placas em segundo plano
  if (!res.ok || (body.status !== "published" && body.status !== "processing")) {
    throw new Error(body.error ?? "Não foi possível publicar");
  }
  return { id, processing: body.status === "processing" };
}

// Espera o servidor terminar (costuma levar 1 a 2 s). Devolve o status final.
export async function waitPublished(id: string, timeoutMs = 30_000): Promise<"published" | "hidden" | "timeout"> {
  const supabase = getSupabase();
  const until = Date.now() + timeoutMs;
  // Pergunta a cada 0,8 s: a publicação costuma levar 1 a 3 s, e intervalos
  // crescentes faziam o pin demorar a trocar mesmo com tudo pronto
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 800));
    const { data } = await supabase.rpc("my_post_status", { p_id: id });
    if (data === "published" || data === "hidden") return data;
  }
  return "timeout";
}

async function uploadToS3({ url, fields }: PresignedPost, blob: Blob) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("Content-Type", blob.type);
  form.append("file", blob); // o arquivo tem que ser o último campo
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Falha no envio da foto (${res.status})`);
}
