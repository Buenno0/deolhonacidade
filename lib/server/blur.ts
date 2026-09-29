import "server-only";
import sharp from "sharp";
import type { Box } from "./moderation";

const THUMB = 192;

// Folga em volta da área detectada, em proporção dela. Rosto: pouca nas
// laterais, um pouco mais em cima (cabelo e testa) e embaixo (queixo e barba,
// que a detecção deixa de fora). Placa: justa.
const PAD = {
  face: { x: 0.12, top: 0.22, bottom: 0.2 },
  plate: { x: 0.08, top: 0.12, bottom: 0.12 },
};

// Máscara com borda suave: o miolo fica totalmente coberto e a borda some aos
// poucos, sem a "caixa" visível. Rosto em elipse; placa em retângulo arredondado.
function maskSvg(w: number, h: number, kind: Box["kind"]) {
  if (kind === "face") {
    return Buffer.from(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="g" cx="50%" cy="50%" r="50%">
          <stop offset="72%" stop-color="#fff" stop-opacity="1"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient></defs>
        <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="url(#g)"/>
      </svg>`,
    );
  }
  const feather = Math.max(2, Math.round(Math.min(w, h) * 0.12));
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="f"><feGaussianBlur stdDeviation="${feather / 2}"/></filter></defs>
      <rect x="${feather}" y="${feather}" width="${w - 2 * feather}" height="${h - 2 * feather}" rx="${feather}" fill="#fff" filter="url(#f)"/>
    </svg>`,
  );
}

// Desfoca cada rosto e placa só na própria área, com borda suave, e refaz a
// miniatura a partir da foto desfocada (a do aparelho tinha o rosto).
export async function blurAreas(bytes: Uint8Array, boxes: Box[]) {
  const base = await sharp(bytes).rotate().toBuffer();
  const { width = 0, height = 0 } = await sharp(base).metadata();
  let out: Buffer = base;
  if (boxes.length && width && height) {
    const patches = await Promise.all(
      boxes.map(async (b) => {
        const pad = PAD[b.kind];
        const left = Math.max(0, Math.floor((b.left - b.width * pad.x) * width));
        const top = Math.max(0, Math.floor((b.top - b.height * pad.top) * height));
        const right = Math.min(width, Math.ceil((b.left + b.width * (1 + pad.x)) * width));
        const bottom = Math.min(height, Math.ceil((b.top + b.height * (1 + pad.bottom)) * height));
        const w = right - left;
        const h = bottom - top;
        if (w < 4 || h < 4) return null;
        // Forte o bastante para não reconhecer, proporcional ao tamanho da área
        const sigma = Math.max(6, Math.round(Math.min(w, h) / 5));
        const input = await sharp(base)
          .extract({ left, top, width: w, height: h })
          .blur(sigma)
          .ensureAlpha()
          .composite([{ input: maskSvg(w, h, b.kind), blend: "dest-in" }])
          .png()
          .toBuffer();
        return { input, left, top };
      }),
    );
    out = await sharp(base)
      .composite(patches.filter((p): p is NonNullable<typeof p> => p !== null))
      .toBuffer();
  }
  const photo = await sharp(out).webp({ quality: 80 }).toBuffer();
  const thumb = await sharp(out).resize(THUMB, THUMB, { fit: "cover" }).webp({ quality: 70 }).toBuffer();
  return { photo: new Uint8Array(photo), thumb: new Uint8Array(thumb) };
}
