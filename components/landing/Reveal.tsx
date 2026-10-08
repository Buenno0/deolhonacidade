"use client";

import { useEffect } from "react";

// Liga a entrada das seções da LP: marca o wrapper e, quando cada bloco entra
// na tela, põe .lp-in (uma vez só). Sem JS, o conteúdo já está visível.
// Também pausa tudo o que está fora da tela (.lp-fora): são ~170 animações
// infinitas, e animar o que ninguém vê só gasta CPU e bateria.
export default function Reveal() {
  useEffect(() => {
    const root = document.querySelector(".lp");
    if (!root) return;
    const off = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("lp-fora", !e.isIntersecting)),
      { rootMargin: "120px 0px" },
    );
    root.querySelectorAll("main > section, main > div, main > .lp-faixa").forEach((el) => off.observe(el));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => off.disconnect();
    root.classList.add("lp-anim");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("lp-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    root.querySelectorAll(".lp-rv, .lp-rvg").forEach((el) => io.observe(el));
    return () => (io.disconnect(), off.disconnect());
  }, []);
  return null;
}
