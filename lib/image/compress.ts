// Redimensiona e reencoda a foto no próprio aparelho. Redesenhar no canvas
// descarta todo o EXIF (GPS da casa, modelo do celular, data original).
const MAX_SIDE = 1280;

export async function compressPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = await toBlob(canvas, "image/webp", 0.8);
  // Alguns Safaris não codificam WebP e devolvem PNG; nesse caso vai JPEG
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", 0.8);
  if (!jpeg) throw new Error("Não foi possível processar a foto");
  return jpeg;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
