// Prepara a foto no próprio aparelho. Redesenhar no canvas descarta todo o
// EXIF (GPS da casa, modelo do celular, data original).
//  - photo: até 2048px no maior lado, para o visualizador (o story preenche a
//    tela do celular, que tem uns 1170 × 2530 pixels reais; com 1280 px a foto
//    era ampliada mais de 2 vezes e ficava borrada)
//  - thumb: quadrado de 384px com recorte central, para o pin, a faixa e a
//    grade do histórico (nítido em telas de alta densidade)
const MAX_SIDE = 2048;
const THUMB_SIDE = 384;

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
    const thumb = await encode(THUMB_SIDE, THUMB_SIDE, (ctx, w, h) => ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, w, h), 0.82);
    return { photo, thumb };
  } finally {
    bitmap.close();
  }
}

async function encode(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  quality = 0.86,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  // Reduzir em alta qualidade: o padrão de alguns navegadores serrilha
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  draw(ctx, width, height);
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
