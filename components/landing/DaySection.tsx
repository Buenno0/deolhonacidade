"use client";

import { memo, useEffect, useRef, useState } from "react";
import Medal from "@/components/Medal";
import { DayScene, dayEvent, type DayEvent } from "./scenes";
import { lpPaused, reducedMotion } from "./time";
import { useNear } from "./useNear";

// "Um dia em Itapetininga": arraste o sol (ou deixe o dia passar sozinho) e
// veja o que a cidade posta em cada hora.
const EVENTS: Record<DayEvent, { at: string; cat: string; color: string; txt: string }> = {
  transito: { at: "7h", cat: "Trânsito", color: "var(--warn)", txt: "Fila na avenida, saída da escola. Vai pelo outro lado." },
  feira: { at: "10h", cat: "Evento", color: "var(--accent)", txt: "Feira cheia hoje, tem pastel saindo agora." },
  chuva: { at: "15h", cat: "Alagamento", color: "var(--warn)", txt: "Choveu forte, a rua da rodoviária encheu de novo." },
  show: { at: "19h", cat: "Evento", color: "var(--accent)", txt: "Show começando na praça, ainda tem lugar." },
  apagao: { at: "23h", cat: "Falta de energia", color: "var(--warn)", txt: "Caiu a luz no bairro todo. Alguém sabe até quando?" },
};

// A cena só muda de 15 em 15 minutos (a luz faz a transição por CSS); o relógio
// ao lado anda a cada passo, mas redesenhar o SVG inteiro a cada passo pesava
const Scene = memo(DayScene);
const quarter = (h: number) => Math.round(h * 4) / 4;

const fmt = (h: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;

export default function DaySection() {
  const [hour, setHour] = useState(7.5);
  const auto = useRef(true);
  const [nearRef, near] = useNear<HTMLDivElement>();
  const box = useRef<HTMLDivElement>(null);

  // O dia passa sozinho enquanto a seção está na tela, até a pessoa mexer
  useEffect(() => {
    const el = box.current;
    if (!el || reducedMotion()) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    const id = setInterval(() => {
      if (!visible || !auto.current || lpPaused()) return;
      setHour((h) => (h >= 23.9 ? 6 : h + 0.1));
    }, 120);
    return () => (io.disconnect(), clearInterval(id));
  }, []);

  const ev = dayEvent(hour);
  const e = EVENTS[ev];
  const night = hour >= 21;

  return (
    <div ref={box} className="flex flex-wrap items-center gap-10">
      <div ref={nearRef} className="min-w-0 flex-[1_1_480px] overflow-hidden rounded-2xl border border-line" style={{ aspectRatio: "11 / 9" }}>
        {near && <Scene hour={quarter(hour)} className="lp-cena" title={`Ilustração: a cidade com ${e.cat.toLowerCase()}`} />}
      </div>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
        <label className="flex flex-col gap-3">
          <span className="flex items-baseline justify-between">
            <span className="lp-rot">Arraste o sol</span>
            <span className="lp-num text-3xl" style={{ color: "var(--accent)" }}>{fmt(hour)}</span>
          </span>
          <input
            type="range"
            min={6}
            max={23.9}
            step={0.05}
            value={hour}
            onChange={(v) => {
              auto.current = false;
              setHour(Number(v.target.value));
            }}
            className="lp-sol w-full"
            aria-valuetext={`${fmt(hour)}, ${e.cat}`}
          />
          <span className="lp-num lp-muted flex justify-between text-xs" aria-hidden="true">
            <span>06h</span>
            <span>12h</span>
            <span>18h</span>
            <span>00h</span>
          </span>
        </label>

        <div key={ev} className="lp-card lp-card-bg story-entra flex flex-col gap-2">
          <span className="flex items-center gap-2">
            <span className="lp-tag font-semibold" style={{ position: "static", color: e.color, border: `1px solid ${e.color}` }}>{e.cat}</span>
            <span className="lp-rot">por volta das {e.at}</span>
          </span>
          <p className="m-0 text-[17px]">{e.txt}</p>
        </div>

        {night && (
          <div className="story-entra flex items-center gap-3">
            <Medal icon="moon" tier={3} size={48} />
            <span className="lp-muted text-sm">
              Post confirmado de madrugada vale a conquista <strong className="text-ink">Coruja</strong>.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
