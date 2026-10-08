"use client";

import { useState } from "react";
import { useT } from "./lang";

// Para todas as animações da LP (a classe vai no wrapper .lp)
export default function PauseButton() {
  const t = useT().foot;
  const [paused, setPaused] = useState(false);
  const toggle = () => {
    document.querySelector(".lp")?.classList.toggle("lp-pausado", !paused);
    setPaused(!paused);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={paused}
      className="min-h-11 cursor-pointer rounded-full border border-line px-3.5 text-[13px] text-muted transition hover:border-accent hover:text-ink"
    >
      {paused ? t.resume : t.pause}
    </button>
  );
}
