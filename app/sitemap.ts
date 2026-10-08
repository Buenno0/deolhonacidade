import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Só as páginas fixas: os posts somem em 12h e não valem a indexação
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/en`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/mapa`, changeFrequency: "always", priority: 0.8 },
    { url: `${SITE}/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
