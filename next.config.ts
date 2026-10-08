import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vídeos da LP (public/video): um dia de cache no navegador e no CDN, renovando por baixo por mais uma semana.
  // Vídeo refeito com o mesmo nome aparece para todos em até um dia.
  async headers() {
    return [{ source: "/video/:arquivo*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] }];
  },
};

export default nextConfig;
