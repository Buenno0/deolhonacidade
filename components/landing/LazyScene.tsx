"use client";

import { useEffect, useRef, useState } from "react";
import AlertPhone from "./AlertPhone";
import { BlurScene, CityScene } from "./scenes";

// Cenas pesadas de SVG (milhares de nós) só são desenhadas quando chegam perto
// da tela. Ficam aqui, no cliente, para não irem duplicadas no HTML: desenhadas
// no servidor, iam no HTML e de novo nos dados embutidos do React.
const SCENES = {
  city: (title?: string) => <CityScene className="block h-auto w-full" title={title} />,
  blur: (title?: string) => <BlurScene className="lp-cena" title={title} />,
  alert: () => <AlertPhone />,
};

type Props = { kind: keyof typeof SCENES; title?: string; className?: string; style?: React.CSSProperties };

export default function LazyScene({ kind, title, className, style }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={box} className={className} style={style} role={title && !near ? "img" : undefined} aria-label={title && !near ? title : undefined}>
      {near && SCENES[kind](title)}
    </div>
  );
}
