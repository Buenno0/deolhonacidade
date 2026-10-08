import Landing, { landingMetadata } from "@/components/landing/Landing";

// A LP em pt-BR (padrão). A versão em inglês fica em /en.
export const metadata = landingMetadata("pt");

export default function Page() {
  return <Landing lang="pt" />;
}
