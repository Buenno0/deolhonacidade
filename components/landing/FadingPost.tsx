"use client";

import { useEffect, useRef, useState } from "react";
import { EventScene } from "./scenes";
import { clock, lpPaused, reducedMotion } from "./time";

// Um post que nasce e some na frente da pessoa: a ideia do app em 12 segundos.
// A contagem só começa quando o card aparece na tela (senão ninguém vê o fim);
// nos últimos segundos o relógio fica vermelho e o card treme, e aí some.
const LIFE = 12;
const URGENT = 3;

export default function FadingPost() {
  const [left, setLeft] = useState(LIFE);
  const [conf, setConf] = useState(1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || reducedMotion()) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    const id = setInterval(() => {
      if (!visible || lpPaused()) return;
      setLeft((v) => Math.max(0, +(v - 0.1).toFixed(1)));
      // gente perto confirmando enquanto ele está no ar
      if (Math.random() < 0.06) setConf((c) => c + 1);
    }, 100);
    return () => (io.disconnect(), clearInterval(id));
  }, []);

  const gone = left === 0;
  const restart = () => {
    setLeft(LIFE);
    setConf(1);
  };

  return (
    <div className="lp-wrap flex flex-wrap items-center justify-center gap-x-12 gap-y-6 pb-16">
      <div className="flex w-full max-w-[380px] flex-col gap-2 text-center sm:text-left">
        <span className="lp-rot" style={{ color: "var(--accent)" }}>Esse post é seu</span>
        <p className="lp-disp m-0 text-2xl leading-tight">
          {gone ? (
            <>
              Viu? Sumiu. <span style={{ color: "var(--accent)" }}>Por isso tem que ser agora.</span>
            </>
          ) : (
            left <= URGENT ? "Olha ele sumindo…" : "Ele acabou de nascer. Fica de olho."
          )}
        </p>
        {gone && (
          <div className="mt-2 flex flex-wrap justify-center gap-3 sm:justify-start">
            <a href="/mapa" className="lp-btn lp-btn-p">Abrir o mapa</a>
            <button type="button" onClick={restart} className="lp-btn lp-btn-s cursor-pointer">Ver de novo</button>
          </div>
        )}
      </div>

      <div ref={box} className="relative w-[280px]" style={{ height: 196 }}>
        {gone && (
          <div className="lp-fantasma absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span className="lp-rot">sumiu do mapa</span>
            <span className="lp-muted text-xs">Roda de samba · durou 12 segundos aqui</span>
          </div>
        )}
      <article
        className={`absolute inset-0 overflow-hidden rounded-2xl border ${gone ? "lp-desfaz border-line" : left <= URGENT ? "lp-urgente" : "lp-nasce border-line"}`}
        style={{ background: "var(--surface)" }}
        aria-live="off"
      >
        <div className="relative" style={{ height: 120 }}>
          <EventScene className="lp-cena absolute inset-0" vb="80 60 280 200" />
          <span className="lp-tag font-semibold" style={{ top: 10, left: 10, color: "var(--accent)", border: "1px solid var(--accent)" }}>Evento</span>
          <span className={`lp-tag lp-num ${left <= URGENT ? "lp-relogio-urgente" : ""}`} style={{ top: 10, right: 10 }}>{clock(Math.ceil(left))}</span>
          <span className="absolute bottom-0 left-0" style={{ height: 3, width: `${(left / LIFE) * 100}%`, background: left <= URGENT ? "var(--danger)" : "var(--accent)", transition: "width .1s linear, background .3s" }} />
        </div>
        <div className="flex flex-col gap-1 px-3.5 py-3">
          <span className="text-sm">Roda de samba começando na praça agora.</span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ok)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12l5 5L20 7" /></svg>
            <span className="lp-num">{conf}</span> {conf === 1 ? "pessoa confirmou" : "pessoas confirmaram"}
          </span>
        </div>
      </article>
      </div>
    </div>
  );
}
