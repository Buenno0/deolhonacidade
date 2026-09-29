// Prepara a foto no próprio aparelho. Redesenhar no canvas descarta todo o
// EXIF (GPS da casa, modelo do celular, data original).
//  - photo: até 1280px no maior lado, para o visualizador
//  - thumb: quadrado de 192px com recorte central, para o pin e a faixa ao vivo
const MAX_SIDE = 1280;
const THUMB_SIDE = 192;

export type PreparedPhoto = { photo: Blob; thumb: Blob };

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const photo = await encode(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale), (ctx, w, h) =>
      ctx.drawImage(bitmap, 0, 0, w, h),
    );

    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const thumb = await encode(THUMB_SIDE, THUMB_SIDE, (ctx, w, h) => ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, w, h), 0.7);
    return { photo, thumb };
  } finally {
    bitmap.close();
  }
}

async function encode(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  quality = 0.8,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!, width, height);
  const webp = await toBlob(canvas, "image/webp", quality);
  // Alguns Safaris não codificam WebP e devolvem PNG; nesse caso vai JPEG
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", quality);
  if (!jpeg) throw new Error("Não foi possível processar a foto");
  return jpeg;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
