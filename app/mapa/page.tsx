import { Suspense } from "react";
import type { Metadata } from "next";
import Home from "@/components/Home";
import { CITY } from "@/lib/city";

export const metadata: Metadata = {
  title: `Mapa ao vivo de ${CITY.name} · Viu na Cidade`,
  alternates: { canonical: "/mapa" },
};

// Suspense: o Home lê ?post= e ?pedido= (links compartilhados e alertas)
export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
