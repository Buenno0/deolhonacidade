import { Suspense } from "react";
import Home from "@/components/Home";

// Suspense: o Home lê ?post= e ?pedido= (links compartilhados e alertas)
export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
