import "server-only";
import sharp from "sharp";
import type { Box } from "./moderation";

const THUMB = 192;

// Desfoca cada área (com folga de 20%, para pegar cabelo e borda da placa) e
// refaz a miniatura a partir da foto desfocada: a do aparelho tinha o rosto.
export async function blurAreas(bytes: Uint8Array, boxes: Box[]) {
  const img = sharp(bytes).rotate();
  const { width = 0, height = 0 } = await img.metadata();
  let out: Buffer = Buffer.from(bytes);
  if (boxes.length && width && height) {
    const patches = await Promise.all(
      boxes.map(async (b) => {
        const padX = b.width * 0.2;
        const padY = b.height * 0.2;
        const left = Math.max(0, Math.floor((b.left - padX) * width));
        const top = Math.max(0, Math.floor((b.top - padY) * height));
        const w = Math.min(width - left, Math.ceil((b.width + 2 * padX) * width));
        const h = Math.min(height - top, Math.ceil((b.height + 2 * padY) * height));
        if (w < 2 || h < 2) return null;
        const sigma = Math.max(8, Math.round(Math.max(w, h) / 6));
        const input = await sharp(bytes).rotate().extract({ left, top, width: w, height: h }).blur(sigma).toBuffer();
        return { input, left, top };
      }),
    );
    out = await sharp(bytes)
      .rotate()
      .composite(patches.filter((p): p is NonNullable<typeof p> => p !== null))
      .webp({ quality: 80 })
      .toBuffer();
  }
  const thumb = await sharp(out).resize(THUMB, THUMB, { fit: "cover" }).webp({ quality: 70 }).toBuffer();
  return { photo: new Uint8Array(out), thumb: new Uint8Array(thumb) };
}
