"use client";

import { useEffect, useRef, useState } from "react";
import { Tag } from "@/components/ui/Tag";
import { AccidentScene, EventScene, FloodScene } from "./scenes";
import { useNear } from "./useNear";

// O visualizador do app (PostViewer) em miniatura: barras que enchem, cabeçalho
// com a categoria e a legenda sobre o desfoque. Mesmas classes do globals.css.
const STORIES = [
  { Scene: AccidentScene, cat: "Acidente", color: "var(--danger)", ago: "há 4 min", caption: "Batida na Av. Peixoto Gomide, faixa da direita fechada.", meta: "8 confirmaram · some em 2:41", tag: "agora" as const },
  { Scene: EventScene, cat: "Evento", color: "var(--accent)", ago: "há 22 min", caption: "Show começando na praça, ainda tem lugar.", meta: "23 confirmaram · 312 viram", tag: "alta" as const },
  { Scene: FloodScene, cat: "Alagamento", color: "var(--warn)", ago: "há 9 min", caption: "Rua cheia perto da rodoviária, carro baixo não passa.", meta: "12 confirmaram · some em 5:12", tag: "agora" as const },
];
const STORY_MS = 5000;

// start: abre num story (pin do hero); onClose: mostra o X (modo sobreposição)
export default function StoryDemo({ start = 0, onClose }: { start?: number; onClose?: () => void }) {
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

  const s = STORIES[i];
  const go = (d: number) => {
    setI((v) => (v + d + STORIES.length) % STORIES.length);
    setRound((r) => r + 1);
  };

  return (
    <div ref={box} className="lp-fone sala-escura text-ink">
      <div ref={nearRef} className="absolute inset-0" aria-hidden="true" />
      {STORIES.map((x, k) => (
        <div key={x.cat} className="lp-story-cena" data-on={k === i}>
          {/* só a atual e a próxima: as outras cenas não precisam existir agora */}
          {near && (k === i || k === (i + 1) % STORIES.length) && <x.Scene className="lp-cena" title={k === i ? `Ilustração: ${x.caption}` : undefined} />}
        </div>
      ))}
      <div className="story-blur-topo" />
      <div className="story-blur-base" />

      <div className="absolute inset-0 flex">
        <button type="button" aria-label="Story anterior" className="h-full w-2/5 cursor-w-resize" onClick={() => go(-1)} />
        <button type="button" aria-label="Próximo story" className="h-full flex-1 cursor-e-resize" onClick={() => go(1)} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-3 px-3 pt-3">
        <div className="flex gap-1" aria-hidden="true">
          {STORIES.map((x, k) => (
            <span key={x.cat} className="story-barra">
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
              aria-label="Fechar story"
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
          <Tag kind={s.tag} />
        </div>
        <p className="lp-disp m-0 text-lg leading-tight [text-shadow:0_1px_10px_rgb(0_0_0/0.55)]">{s.caption}</p>
        <p className="lp-rot m-0 text-ink/85">{s.meta}</p>
        <div className="flex gap-2">
          <span className="story-pill story-vidro flex-1 justify-center whitespace-nowrap !px-2 text-xs">Ainda está</span>
          <span className="story-pill story-vidro flex-1 justify-center whitespace-nowrap !px-2 text-xs">Já acabou</span>
        </div>
      </div>
    </div>
  );
}
