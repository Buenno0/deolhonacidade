"use client";

import { memo, useEffect, useRef, useState } from "react";
import Medal from "@/components/Medal";
import { DayScene, dayEvent, type DayEvent } from "./scenes";
import { lpPaused, reducedMotion } from "./time";
import { useNear } from "./useNear";

// "Um dia em Itapetininga": arraste o sol (ou deixe o dia passar sozinho) e
// veja o que a cidade posta em cada hora. Para ficar suave, o React só redesenha
// a cidade quando muda o acontecimento; céu, sol, lua, janelas e postes andam a
// cada quadro por variáveis CSS (sem render), e o relógio por ref.
const EVENTS: Record<DayEvent, { at: string; cat: string; color: string; txt: string }> = {
  transito: { at: "7h", cat: "Trânsito", color: "var(--warn)", txt: "Fila na avenida, saída da escola. Vai pelo outro lado." },
  feira: { at: "10h", cat: "Evento", color: "var(--accent)", txt: "Feira cheia hoje, tem pastel saindo agora." },
  chuva: { at: "15h", cat: "Alagamento", color: "var(--warn)", txt: "Choveu forte, a rua da rodoviária encheu de novo." },
  show: { at: "19h", cat: "Evento", color: "var(--accent)", txt: "Show começando na praça, ainda tem lugar." },
  apagao: { at: "23h", cat: "Falta de energia", color: "var(--warn)", txt: "Caiu a luz no bairro todo. Alguém sabe até quando?" },
};

const Scene = memo(DayScene);
const START = 6, END = 24;
const HOURS_PER_SEC = 0.45; // o dia inteiro em ~40 s

const fmt = (h: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;

// Interpolação por pontos (hora → valor)
type Stop = [number, number[]];
const lerpStops = (stops: Stop[], h: number) => {
  if (h <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [h1, v1] = stops[i];
    const [h0, v0] = stops[i - 1];
    if (h <= h1) {
      const t = (h - h0) / (h1 - h0);
      return v0.map((v, k) => v + (v1[k] - v) * t);
    }
  }
  return stops[stops.length - 1][1];
};
const SKY: Stop[] = [
  [6, [58, 40, 58]],
  [8, [42, 52, 74]],
  [12, [34, 50, 76]],
  [16, [40, 46, 70]],
  [17.8, [86, 46, 50]],
  [19.2, [26, 26, 52]],
  [21, [11, 13, 24]],
  [24, [8, 9, 18]],
];
const smooth = (a: number, b: number, h: number) => {
  const t = Math.min(1, Math.max(0, (h - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Tudo que depende da hora e muda a cada quadro, sem React
function paintHour(el: HTMLElement, h: number) {
  const [r, g, b] = lerpStops(SKY, h);
  el.style.setProperty("--ceu", `rgb(${r | 0} ${g | 0} ${b | 0})`);
  // janelas e postes: acesos no amanhecer, apagam de dia, acendem no fim da tarde
  const luz = Math.max(1 - smooth(6, 7.5, h), smooth(17.3, 19.2, h));
  el.style.setProperty("--luz", (0.12 + luz * 0.88).toFixed(3));
  el.style.setProperty("--noite", smooth(18.8, 20.3, h).toFixed(3));
  el.style.setProperty("--quente", Math.max(0.1 * (1 - smooth(6, 9, h)), 0.2 * smooth(16.5, 17.8, h) * (1 - smooth(18.2, 19.4, h))).toFixed(3));
  // sol de 6h a 18h30, lua depois; os dois num arco por cima da cidade
  const arc = (t: number) => [8 + t * 84, 30 - Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 22];
  const [sx, sy] = arc((h - 6) / 12.5);
  const [mx, my] = arc(((h - 18.5) / 5.5) * 0.7 + 0.15);
  el.style.setProperty("--sol-x", `${sx}%`);
  el.style.setProperty("--sol-y", `${sy}%`);
  el.style.setProperty("--sol-o", (1 - smooth(17.8, 18.8, h)).toFixed(3));
  el.style.setProperty("--lua-x", `${mx}%`);
  el.style.setProperty("--lua-y", `${my}%`);
}

export default function DaySection() {
  const [ev, setEv] = useState<DayEvent>(dayEvent(7.5));
  const [night, setNight] = useState(false);
  const hour = useRef(7.5);
  const auto = useRef(true);
  const sky = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const [nearRef, near] = useNear<HTMLDivElement>();

  useEffect(() => {
    // Aplica uma hora: estilos e relógio direto no DOM; React só se mudar o acontecimento
    const apply = (h: number) => {
      hour.current = h;
      if (sky.current) paintHour(sky.current, h);
      if (clockRef.current) clockRef.current.textContent = fmt(h);
      if (range.current && document.activeElement !== range.current) range.current.value = String(h);
      const e = dayEvent(h);
      setEv((cur) => (cur === e ? cur : e));
      setNight((cur) => (cur === h >= 21 ? cur : h >= 21));
    };
    applyRef.current = apply;
    apply(hour.current);
    const el = sky.current;
    if (!el || reducedMotion()) return;
    let visible = false;
    let last = performance.now();
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      last = performance.now();
    });
    io.observe(el);
    let raf = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (visible && auto.current && !lpPaused()) {
        const next = hour.current + dt * HOURS_PER_SEC;
        apply(next >= END - 0.1 ? START : next);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => (io.disconnect(), cancelAnimationFrame(raf));
  }, []);
  const applyRef = useRef<(h: number) => void>(() => {});

  const e = EVENTS[ev];

  return (
    <div className="flex flex-wrap items-center gap-10">
      <div
        ref={(n) => {
          sky.current = n;
          nearRef.current = n;
        }}
        className="lp-dia min-w-0 flex-[1_1_480px] overflow-hidden rounded-2xl border border-line"
        style={{ aspectRatio: "11 / 9" }}
      >
        <span className="lp-dia-sol" aria-hidden="true" />
        <span className="lp-dia-lua" aria-hidden="true" />
        {near && <Scene ev={ev} className="lp-dia-cena" title={`Ilustração: a cidade com ${e.cat.toLowerCase()}`} />}
        <span className="lp-dia-quente" aria-hidden="true" />
        <span className="lp-dia-noite" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
        <label className="flex flex-col gap-3">
          <span className="flex items-baseline justify-between">
            <span className="lp-rot">Arraste o sol</span>
            <span ref={clockRef} className="lp-num text-3xl" style={{ color: "var(--accent)" }}>
              {fmt(7.5)}
            </span>
          </span>
          <input
            ref={range}
            type="range"
            min={START}
            max={END - 0.1}
            step={0.01}
            defaultValue={7.5}
            onInput={(v) => {
              auto.current = false;
              applyRef.current(Number((v.target as HTMLInputElement).value));
            }}
            className="lp-sol w-full"
            aria-label="Hora do dia"
            aria-valuetext={`${e.cat}, por volta das ${e.at}`}
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
