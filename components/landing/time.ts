// Relógio de missão do app (h:mm:ss), para os posts de exemplo da LP
export function clock(s: number) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// A LP está pausada pelo botão do rodapé?
export const lpPaused = () => Boolean(document.querySelector(".lp-pausado"));
export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
