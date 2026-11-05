import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
import { themeBootScript } from "@/lib/theme";
import { tema } from "@/design/tokens.mjs";
import "./globals.css";

// Fontes servidas pelo próprio app, sem requisição a terceiros.
//
// Anton é o título de cartaz e Instrument Serif é a legenda: as duas vieram no
// redesign "mural da cidade", que troca o rótulo mono em caixa alta por uma
// linha em serifa itálica. O corpo segue na pilha do sistema, de propósito:
// uma terceira família baixada custaria mais do que entrega.
//
// Archivo e a mono ficam enquanto as telas antigas ainda as usam.
const cartaz = localFont({
  src: "./fonts/anton-latin.woff2",
  weight: "400",
  variable: "--fonte-cartaz",
  display: "swap",
});
const serifa = localFont({
  src: [
    { path: "./fonts/instrument-serif-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-italic-latin.woff2", weight: "400", style: "italic" },
  ],
  variable: "--fonte-serifa",
  display: "swap",
});
const archivo = localFont({
  src: "./fonts/archivo-latin.woff2",
  weight: "400 700",
  variable: "--fonte-archivo",
  display: "swap",
});
const mono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  weight: "400 500",
  variable: "--fonte-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // Links absolutos nas prévias (og:image) precisam da origem pública do app
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Viu na Cidade",
  description: "O que está acontecendo agora em Itapetininga, em fotos que somem do mapa em até 12h.",
  appleWebApp: { capable: true, title: "Viu", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: tema.escuro.bg,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // A classe do tema entra pelo script antes da hidratação
    <html lang="pt-BR" className={`${cartaz.variable} ${serifa.variable} ${archivo.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
