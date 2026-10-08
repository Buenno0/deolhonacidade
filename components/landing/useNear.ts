"use client";

import { useEffect, useRef, useState } from "react";

// true quando o elemento chega perto da tela (uma vez só). Para adiar SVGs
// pesados que ficam longe do topo: menos HTML e DOM no carregamento.
export function useNear<T extends Element>(margin = "600px") {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: `${margin} 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, near] as const;
}
