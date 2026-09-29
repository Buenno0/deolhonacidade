// Onde as fotos moram. Hoje: Supabase Storage (bucket público "posts").
// Com a AWS configurada: S3 privado atrás do CloudFront, e
// NEXT_PUBLIC_MEDIA_BASE_URL aponta para o domínio da distribuição.
const base =
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "") ??
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/posts`;

export const THUMB_SUFFIX = "-mini";

export const photoUrl = (path: string) => `${base}/${path}`;
export const thumbUrl = (path: string) => `${base}/${path}${THUMB_SUFFIX}`;
