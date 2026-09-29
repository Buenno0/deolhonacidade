import { ImageResponse } from "next/og";
import sharp from "sharp";
import { CATEGORIES } from "@/lib/categories";
import { CITY } from "@/lib/city";
import { photoUrl } from "@/lib/media";
import { timeLeftShort } from "@/lib/posts";
import { getPublicPost } from "@/lib/server/publicPost";
import { CITY_PATH, PIN_PATH } from "@/components/ui/Mark";

// A prévia que o WhatsApp mostra: a foto inteira, com a categoria, a legenda
// e quanto falta para sumir. O ImageResponse não lê WebP, então a foto passa
// pelo sharp e vira JPEG antes.
export const alt = "Registro no De Olho na Cidade";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GOLD = "#d29a44";
const BASALT = "#0c0a08";
const INK = "#f4efe4";

const markSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 8 96 84"><path d="${CITY_PATH}" fill="${GOLD}" stroke="${GOLD}" stroke-width="2" stroke-linejoin="round"/><path d="${PIN_PATH}" fill="${BASALT}"/><circle cx="58" cy="27" r="3.6" fill="${GOLD}"/></svg>`,
)}`;

async function photoData(path: string) {
  const res = await fetch(photoUrl(path));
  if (!res.ok) return null;
  const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPublicPost(id);
  const photo = post?.alive && post.photo_path ? await photoData(post.photo_path).catch(() => null) : null;
  const label = post ? CATEGORIES[post.category].label : "De Olho na Cidade";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: BASALT, color: INK }}>
        {photo && (
          <img src={photo} width={1200} height={630} style={{ position: "absolute", inset: 0, objectFit: "cover" }} alt="" />
        )}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: photo ? 470 : 630,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "0 56px 48px",
            background: photo ? "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.78) 45%, rgba(0,0,0,0) 100%)" : BASALT,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", border: `3px solid ${GOLD}`, color: GOLD, borderRadius: 999, padding: "6px 18px", fontSize: 26, letterSpacing: 3 }}>
              {label.toUpperCase()}
            </div>
            {post?.alive && (
              <div style={{ display: "flex", fontSize: 26, color: INK, letterSpacing: 2, background: "rgba(0,0,0,0.55)", borderRadius: 999, padding: "8px 18px" }}>
                {`SOME EM ${timeLeftShort(post.expires_at).toUpperCase()}`}
              </div>
            )}
          </div>
          <div style={{ display: "flex", fontSize: 64, lineHeight: 1.08, marginTop: 20, maxWidth: 1060, letterSpacing: -1 }}>
            {post?.alive ? (post.caption ?? `${label} agora em ${CITY.name}`) : post ? "Esse registro já sumiu do mapa" : "O que está acontecendo agora"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28 }}>
            <img src={markSvg} width={64} height={56} alt="" />
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>De Olho</div>
            <div style={{ display: "flex", fontSize: 24, color: "#a99a84", letterSpacing: 3 }}>{`${CITY.name.toUpperCase()} · ${CITY.uf}`}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
