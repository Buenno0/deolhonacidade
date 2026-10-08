"use client";

import { useEffect, useRef, useState } from "react";
import { Tag } from "@/components/ui/Tag";
import { AccidentScene, EventScene, FloodScene } from "./scenes";
import { useNear } from "./useNear";
import { useT } from "./lang";

// O visualizador do app (PostViewer) em miniatura: barras que enchem, cabeçalho
// com a categoria e a legenda sobre o desfoque. Mesmas classes do globals.css.
// os textos de cada story vêm do i18n (stories.items), na mesma ordem
const STORIES = [
  { Scene: AccidentScene, color: "var(--danger)", tag: "agora" as const },
  { Scene: EventScene, color: "var(--accent)", tag: "alta" as const },
  { Scene: FloodScene, color: "var(--warn)", tag: "agora" as const },
];
const STORY_MS = 5000;

// start: abre num story (pin do hero); onClose: mostra o X (modo sobreposição)
export default function StoryDemo({ start = 0, onClose }: { start?: number; onClose?: () => void }) {
  const T = useT();
  const t = T.stories;
  const box = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(start);
  const [round, setRound] = useState(0);
  const [running, setRunning] = useState(false);
  const [nearRef, near] = useNear<HTMLDivElement>();

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let visible = false;
    const sync = () => setRunning(visible && !document.querySelector(".lp-pausado"));
    const io = new IntersectionObserver(([e]) => ((visible = e.isIntersecting), sync()), { threshold: 0.3 });
    io.observe(el);
    // o botão "Pausar animações" mexe numa classe do wrapper
    const mo = new MutationObserver(sync);
    const root = document.querySelector(".lp");
    if (root) mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => (io.disconnect(), mo.disconnect());
  }, []);

  const s = { ...STORIES[i], ...t.items[i] };
  const go = (d: number) => {
    setI((v) => (v + d + STORIES.length) % STORIES.length);
    setRound((r) => r + 1);
  };

  return (
    <div ref={box} className="lp-fone sala-escura text-ink">
      <div ref={nearRef} className="absolute inset-0" aria-hidden="true" />
      {STORIES.map((x, k) => (
        <div key={k} className="lp-story-cena" data-on={k === i}>
          {/* só a atual e a próxima: as outras cenas não precisam existir agora */}
          {near && (k === i || k === (i + 1) % STORIES.length) && <x.Scene className="lp-cena" title={k === i ? t.scene(t.items[k].caption) : undefined} />}
        </div>
      ))}
      <div className="story-blur-topo" />
      <div className="story-blur-base" />

      <div className="absolute inset-0 flex">
        <button type="button" aria-label={t.prev} className="h-full w-2/5 cursor-w-resize" onClick={() => go(-1)} />
        <button type="button" aria-label={t.next} className="h-full flex-1 cursor-e-resize" onClick={() => go(1)} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 px-3 pt-3">
        <div className="flex gap-1" aria-hidden="true">
          {STORIES.map((_, k) => (
            <span key={k} className="story-barra">
              {k === i ? (
                <i
                  key={`${i}-${round}`}
                  className="story-enche"
                  style={{ animationDuration: `${STORY_MS}ms`, animationPlayState: running ? "running" : "paused" }}
                  onAnimationEnd={() => go(1)}
                />
              ) : (
                <i style={{ width: k < i ? "100%" : "0%" }} />
              )}
            </span>
          ))}
        </div>
        <div key={`t${i}`} className="story-entra flex items-center gap-2.5">
          <span className="h-8 w-8 shrink-0 rounded-full border-[1.5px]" style={{ borderColor: s.color, background: `color-mix(in oklab, ${s.color} 22%, transparent)` }} />
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-sm font-semibold [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">{s.cat}</p>
            <p className="lp-rot m-0 text-ink/85">{s.ago}</p>
          </div>
          {onClose && (
            <button
              type="button"
              aria-label={t.close}
              onClick={onClose}
              className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-black/40 text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          )}
        </div>
      </div>

      <div key={`b${i}`} className="story-entra pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2.5 px-4 pb-5">
        <div className="flex gap-2">
          <Tag kind={s.tag} label={T.tags[s.tag]} />
        </div>
        <p className="lp-disp m-0 text-lg leading-tight [text-shadow:0_1px_10px_rgb(0_0_0/0.55)]">{s.caption}</p>
        <p className="lp-rot m-0 text-ink/85">{s.meta}</p>
        <div className="flex gap-2">
          <span className="story-pill story-vidro flex-1 justify-center whitespace-nowrap !px-2 text-xs">{t.still}</span>
          <span className="story-pill story-vidro flex-1 justify-center whitespace-nowrap !px-2 text-xs">{t.over}</span>
        </div>
      </div>
    </div>
  );
}
