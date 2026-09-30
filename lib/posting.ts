import { getSupabase } from "./supabase/client";
import { THUMB_SUFFIX } from "./media";
import type { Category } from "./categories";
import type { PreparedPhoto } from "./image/compress";

type PresignedPost = { url: string; fields: Record<string, string> };
type Where = { lat: number; lng: number };
type Details = Where & { category: Category; caption: string; keepHistory?: boolean };

// O caminho de uma postagem, do navegador, com envio antecipado:
// 1. startDraft, logo depois da foto: create_post reserva o caminho (como
//    rascunho) e a foto e a miniatura sobem em segundo plano, enquanto a
//    pessoa escolhe a categoria e escreve a legenda
// 2. publishDraft, no toque em Publicar: update_draft confirma categoria,
//    legenda, histórico e a posição mais recente; /api/posts/[id]/publish faz
//    a moderação e publica no servidor
// 3. discardDraft, se a pessoa tirar outra foto ou desistir

async function authHeader() {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Faça login para continuar");
  return { Authorization: `Bearer ${token}` };
}

export async function startDraft(where: Where, photo: PreparedPhoto, requestId: string | null): Promise<string> {
  const supabase = getSupabase();
  const auth = await authHeader();
  // A categoria de verdade chega no publishDraft; "outro" só reserva o lugar
  const { data, error } = await supabase.rpc("create_post", {
    p_lat: where.lat,
    p_lng: where.lng,
    p_category: "outro",
    p_caption: null,
    p_request_id: requestId,
    p_keep_history: false,
  });
  if (error) throw error;
  const { id, photo_path } = data as { id: string; photo_path: string };
  await upload(id, photo_path, photo, auth);
  return id;
}

export async function publishDraft(id: string, d: Details): Promise<{ id: string; processing: boolean }> {
  const supabase = getSupabase();
  const auth = await authHeader();
  const { error } = await supabase.rpc("update_draft", {
    p_id: id,
    p_lat: d.lat,
    p_lng: d.lng,
    p_category: d.category,
    p_caption: d.caption,
    p_keep_history: Boolean(d.keepHistory),
  });
  if (error) throw error;
  return publish(id, auth);
}

export async function discardDraft(id: string) {
  await getSupabase().rpc("delete_my_post", { p_id: id });
}

// Sem rascunho pronto (o envio antecipado falhou ou não deu tempo): tudo de uma vez
export async function submitPost(
  d: Details & { requestId?: string | null } & PreparedPhoto,
  onStep: (s: string) => void,
): Promise<{ id: string; processing: boolean }> {
  const supabase = getSupabase();
  const auth = await authHeader();
  onStep("Conferindo a localização…");
  const { data, error } = await supabase.rpc("create_post", {
    p_lat: d.lat,
    p_lng: d.lng,
    p_category: d.category,
    p_caption: d.caption,
    p_request_id: d.requestId ?? null,
    p_keep_history: Boolean(d.keepHistory),
  });
  if (error) throw error;
  const { id, photo_path } = data as { id: string; photo_path: string };
  onStep("Enviando a foto…");
  await upload(id, photo_path, d, auth);
  onStep("Publicando…");
  return publish(id, auth);
}

async function upload(id: string, photoPath: string, photo: PreparedPhoto, auth: Record<string, string>) {
  const targets = await fetch(`/api/posts/${id}/uploads`, { method: "POST", headers: auth }).then((r) => r.json());
  if (targets.provider === "s3") {
    await Promise.all([uploadToS3(targets.photo as PresignedPost, photo.photo), uploadToS3(targets.thumb as PresignedPost, photo.thumb)]);
    return;
  }
  const bucket = getSupabase().storage.from("posts");
  const [a, b] = await Promise.all([
    bucket.upload(photoPath, photo.photo, { contentType: photo.photo.type, upsert: false }),
    bucket.upload(photoPath + THUMB_SUFFIX, photo.thumb, { contentType: photo.thumb.type, upsert: false }),
  ]);
  if (a.error || b.error) throw a.error ?? b.error;
}

async function publish(id: string, auth: Record<string, string>) {
  const res = await fetch(`/api/posts/${id}/publish`, { method: "POST", headers: auth });
  const body = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
  // "processing": o servidor desfoca rostos e placas em segundo plano
  if (!res.ok || (body.status !== "published" && body.status !== "processing")) {
    throw new Error(body.error ?? "Não foi possível publicar");
  }
  return { id, processing: body.status === "processing" };
}

export type PublishResult = { status: "published" | "hidden" | "timeout"; faces: number; plates: number };

// Espera o servidor terminar (costuma levar 1 a 3 s): o status e o que foi protegido
export async function waitPublished(id: string, timeoutMs = 30_000): Promise<PublishResult> {
  const supabase = getSupabase();
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 800));
    const { data } = await supabase.rpc("my_post_result", { p_id: id });
    const r = data as { status: string; faces: number; plates: number } | null;
    if (r && (r.status === "published" || r.status === "hidden")) return { status: r.status, faces: r.faces, plates: r.plates };
  }
  return { status: "timeout", faces: 0, plates: 0 };
}

// A prévia desfocada do pin enquanto o servidor trabalha: feita no aparelho,
// a partir da miniatura, bem reduzida e ampliada de volta (um borrão que não
// deixa reconhecer ninguém). A foto nítida nunca aparece na tela.
export async function blurredPreview(thumb: Blob): Promise<string | null> {
  try {
    const bmp = await createImageBitmap(thumb);
    const tiny = document.createElement("canvas");
    tiny.width = tiny.height = 10;
    tiny.getContext("2d")!.drawImage(bmp, 0, 0, 10, 10);
    const out = document.createElement("canvas");
    out.width = out.height = 96;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tiny, 0, 0, 96, 96);
    return out.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

async function uploadToS3({ url, fields }: PresignedPost, blob: Blob) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v); // inclui o Content-Type assinado
  form.append("file", blob); // o arquivo tem que ser o último campo
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Falha no envio da foto (${res.status})`);
}
