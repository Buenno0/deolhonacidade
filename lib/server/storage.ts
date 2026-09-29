import "server-only";
import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost, type PresignedPost } from "@aws-sdk/s3-presigned-post";
import { THUMB_SUFFIX } from "@/lib/media";
import { awsCredentials, awsRegion } from "./aws";
import { adminClient } from "./supabase";

// Onde as fotos moram. STORAGE_PROVIDER=supabase (padrão, local) ou s3.
// Com s3, o bucket é privado e o público lê pelo CloudFront (infra/).
export type StorageProvider = "supabase" | "s3";
export const storageProvider = (process.env.STORAGE_PROVIDER ?? "supabase") as StorageProvider;

const BUCKET = process.env.S3_BUCKET ?? "";
const PREFIX = "posts/"; // o CloudFront serve este prefixo como raiz
const MAX_BYTES = 1024 * 1024;
// O CDN pode segurar uma cópia por no máximo 10 min depois que o post some
const CACHE_CONTROL = "public, max-age=600";

let s3: S3Client | undefined;
const client = () => (s3 ??= new S3Client({ region: awsRegion, credentials: awsCredentials() }));

export const s3Key = (path: string) => PREFIX + path;
export const allPaths = (photoPath: string) => [photoPath, photoPath + THUMB_SUFFIX];

// Formulários de upload direto do navegador para o S3, com tamanho e tipo
// travados na assinatura (o navegador não consegue mandar outra coisa)
export async function presignUploads(photoPath: string): Promise<Record<"photo" | "thumb", PresignedPost>> {
  const sign = (path: string) =>
    createPresignedPost(client(), {
      Bucket: BUCKET,
      Key: s3Key(path),
      Conditions: [
        ["content-length-range", 1, MAX_BYTES],
        ["starts-with", "$Content-Type", "image/"],
        ["eq", "$Cache-Control", CACHE_CONTROL],
      ],
      Fields: { "Cache-Control": CACHE_CONTROL },
      Expires: 300,
    });
  const [photo, thumb] = await Promise.all(allPaths(photoPath).map(sign));
  return { photo, thumb };
}

export async function exists(path: string) {
  if (storageProvider === "s3") {
    try {
      await client().send(new HeadObjectCommand({ Bucket: BUCKET, Key: s3Key(path) }));
      return true;
    } catch {
      return false;
    }
  }
  const [dir, name] = [path.slice(0, path.lastIndexOf("/")), path.slice(path.lastIndexOf("/") + 1)];
  const { data } = await adminClient().storage.from("posts").list(dir, { search: name, limit: 5 });
  return Boolean(data?.some((f) => f.name === name));
}

export async function readBytes(path: string): Promise<Uint8Array> {
  if (storageProvider === "s3") {
    const out = await client().send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key(path) }));
    return out.Body!.transformToByteArray();
  }
  const { data, error } = await adminClient().storage.from("posts").download(path);
  if (error || !data) throw error ?? new Error("foto não encontrada");
  return new Uint8Array(await data.arrayBuffer());
}

// Escrita pelo servidor (a foto já desfocada)
export async function writeBytes(path: string, bytes: Uint8Array, contentType: string) {
  if (storageProvider === "s3") {
    await client().send(
      new PutObjectCommand({ Bucket: BUCKET, Key: s3Key(path), Body: bytes, ContentType: contentType, CacheControl: CACHE_CONTROL }),
    );
    return;
  }
  const { error } = await adminClient().storage.from("posts").upload(path, bytes, { contentType, upsert: true, cacheControl: "600" });
  if (error) throw error;
}

export async function remove(paths: string[]) {
  if (paths.length === 0) return;
  if (storageProvider === "s3") {
    // até 1000 chaves por chamada
    for (let i = 0; i < paths.length; i += 1000) {
      await client().send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: paths.slice(i, i + 1000).map((p) => ({ Key: s3Key(p) })), Quiet: true },
        }),
      );
    }
    return;
  }
  const { error } = await adminClient().storage.from("posts").remove(paths);
  if (error) throw error;
}
