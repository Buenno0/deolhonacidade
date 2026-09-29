import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "De Olho na Cidade",
    short_name: "De Olho",
    description: "O que está acontecendo agora na cidade, em fotos que somem em 12h.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0a08",
    theme_color: "#0c0a08",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
