import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
import { themeBootScript } from "@/lib/theme";
import { tema } from "@/design/tokens.mjs";
import "./globals.css";

// Fontes servidas pelo próprio app (as mesmas do NAS), sem requisição a terceiros
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
  title: "De Olho na Cidade",
  description: "O que está acontecendo agora em Itapetininga, em fotos que somem em 12h.",
  appleWebApp: { capable: true, title: "De Olho", statusBarStyle: "black-translucent" },
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
    <html lang="pt-BR" className={`${archivo.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
