"use client";

import { memo, useEffect, useRef, useState } from "react";
import Medal from "@/components/Medal";
import { DayBase, DayLayer, DayZzz, dayEvent, type DayEvent } from "./scenes";
import { lpPaused, reducedMotion } from "./time";
import { useNear } from "./useNear";
import { useT } from "./lang";

// "Um dia em Itapetininga": arraste o sol (ou deixe o dia passar sozinho) e
// veja o que a cidade posta em cada hora.
//
// Desempenho (medido): o loop roda a cada quadro, então nada aqui pode mexer
// na seção inteira. Antes, 11 variáveis CSS iam para o topo da seção; como
// variáveis são herdadas, ~780 elementos recalculavam o estilo a cada quadro e
// o lixo disso virava pausas de GC (a "travadinha"). Agora cada valor vai
// direto para o elemento que o usa (~10 elementos), e só se mudou.
// Hora, categoria e texto de cada acontecimento vêm do i18n (day.events)
const COLOR: Record<DayEvent, string> = {
  transito: "var(--warn)",
  feira: "var(--accent)",
  chuva: "var(--warn)",
  show: "var(--accent)",
  apagao: "var(--warn)",
};
// As camadas ficam sempre montadas, e só o estado delas muda (a lista vem do
// COLOR, que o TypeScript obriga a ter todos os acontecimentos)
const EVENTS = Object.keys(COLOR) as DayEvent[];
// Na troca, a que sai vai logo abaixo da que entra (como na troca cruzada
// antiga). A ordem só muda nesse instante: mover um nó no DOM reinicia as
// animações dele, então ela não pode voltar atrás quando a que saiu some.
const reorder = (cur: DayEvent[], out: DayEvent, into: DayEvent) => [...cur.filter((x) => x !== out && x !== into), out, into];

// A cidade fixa, as camadas e os zzz não dependem de nada que mude por quadro
const Base = memo(DayBase);
const Zzz = memo(DayZzz);
const Layer = memo(DayLayer);
const CROSSFADE_MS = 1100;
const START = 6, END = 24;
const HOURS_PER_SEC = 0.9; // o dia inteiro em ~20 s

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

// Os elementos que a hora mexe (achados uma vez, e de novo quando o SVG monta)
type Targets = {
  sky: HTMLElement;
  sol: HTMLElement | null;
  lua: HTMLElement | null;
  quente: HTMLElement | null;
  noite: HTMLElement | null;
  range: HTMLInputElement | null;
  janelas: SVGElement[];
  postes: SVGElement[];
  estrelas: SVGElement[];
  sono: SVGElement[];
};
const findTargets = (sky: HTMLElement, range: HTMLInputElement | null): Targets => {
  const q = <T extends Element>(s: string) => [...sky.querySelectorAll<T & Element>(s)] as unknown as T[];
  return {
    sky,
    sol: sky.querySelector(".lp-dia-sol"),
    lua: sky.querySelector(".lp-dia-lua"),
    quente: sky.querySelector(".lp-dia-quente"),
    noite: sky.querySelector(".lp-dia-noite"),
    range,
    janelas: q<SVGElement>(".lp-janela"),
    postes: q<SVGElement>(".lp-poste"),
    estrelas: q<SVGElement>(".lp-estrelas"),
    sono: q<SVGElement>(".lp-sono"),
  };
};

// Escreve só se mudou (o último valor fica guardado por elemento e propriedade)
const written = new WeakMap<Element, Record<string, string>>();
function put(el: (HTMLElement | SVGElement) | null, prop: string, value: string) {
  if (!el) return;
  let last = written.get(el);
  if (!last) written.set(el, (last = {}));
  if (last[prop] === value) return;
  last[prop] = value;
  el.style.setProperty(prop, value);
}
const putAll = (els: (HTMLElement | SVGElement)[], prop: string, value: string) => els.forEach((el) => put(el, prop, value));

// Tudo que depende da hora e muda a cada quadro, sem React
function paintHour(t: Targets, h: number) {
  const [r, g, b] = lerpStops(SKY, h);
  put(t.sky, "background-color", `rgb(${r | 0} ${g | 0} ${b | 0})`);
  // janelas e postes: acesos no amanhecer, apagam de dia, acendem no fim da tarde
  const luz = 0.12 + Math.max(1 - smooth(6, 7.5, h), smooth(17.3, 19.2, h)) * 0.88;
  putAll(t.janelas, "opacity", luz.toFixed(3));
  putAll(t.postes, "opacity", (luz * 0.4).toFixed(3));
  const noite = smooth(18.8, 20.3, h);
  putAll(t.estrelas, "opacity", noite.toFixed(3));
  put(t.noite, "opacity", (noite * 0.45).toFixed(3));
  // a cidade dorme às 22h e acorda às 6h (o dia recomeça às 6 e os zzz somem)
  putAll(t.sono, "opacity", Math.max(smooth(21.6, 22.4, h), 1 - smooth(6, 6.5, h)).toFixed(3));
  put(t.quente, "opacity", Math.max(0.1 * (1 - smooth(6, 9, h)), 0.2 * smooth(16.5, 17.8, h) * (1 - smooth(18.2, 19.4, h))).toFixed(3));
  // o botão do controle vira lua depois das 18h (e volta a sol de manhã)
  put(t.range, "--l", Math.max(smooth(17.9, 18.9, h), 1 - smooth(6, 6.6, h)).toFixed(3));
  // sol de 6h a 18h30, lua depois; os dois num arco por cima da cidade.
  // Invisíveis, não se mexem (não há por que recalcular a posição)
  const arc = (x: number) => [8 + x * 84, 30 - Math.sin(Math.PI * Math.min(1, Math.max(0, x))) * 22];
  const solO = 1 - smooth(17.8, 18.8, h);
  put(t.sol, "opacity", solO.toFixed(3));
  if (solO > 0) {
    const [sx, sy] = arc((h - 6) / 12.5);
    put(t.sol, "left", `${sx.toFixed(2)}%`);
    put(t.sol, "top", `${sy.toFixed(2)}%`);
  }
  put(t.lua, "opacity", noite.toFixed(3));
  if (noite > 0) {
    const [mx, my] = arc(((h - 18.5) / 5.5) * 0.7 + 0.15);
    put(t.lua, "left", `${mx.toFixed(2)}%`);
    put(t.lua, "top", `${my.toFixed(2)}%`);
  }
}

export default function DaySection() {
  const [ev, setEv] = useState<DayEvent>(dayEvent(7.5));
  const [night, setNight] = useState(false);
  const hour = useRef(7.5);
  const evRef = useRef<DayEvent>(ev);
  const nightRef = useRef(false);
  // segurando o sol: o dia espera; ao soltar, continua da hora em que parou
  const dragging = useRef(false);
  const sky = useRef<HTMLDivElement | null>(null);
  const targets = useRef<Targets | null>(null);
  // o acontecimento que está saindo, para a troca ser cruzada
  const [prev, setPrev] = useState<DayEvent | null>(null);
  const [layers, setLayers] = useState<DayEvent[]>(EVENTS);
  const clockRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const [nearRef, near] = useNear<HTMLDivElement>();
  const applyRef = useRef<(h: number) => void>(() => {});

  useEffect(() => {
    // Aplica uma hora: estilos e relógio direto no DOM; React só se mudar o acontecimento
    const apply = (h: number) => {
      hour.current = h;
      if (!targets.current && sky.current) targets.current = findTargets(sky.current, range.current);
      if (targets.current) paintHour(targets.current, h);
      // o relógio troca o texto do nó (não recria o nó a cada quadro)
      const clock = clockRef.current?.firstChild as Text | null;
      const s = fmt(h);
      if (clock && clock.data !== s) clock.data = s;
      // os dois rótulos, já no idioma da página, moram no próprio elemento
      const el = labelRef.current;
      const label = el && (h >= 18.4 || h < 6.3 ? el.dataset.moon : el.dataset.sun);
      if (el && label && el.textContent !== label) el.textContent = label;
      if (range.current && !dragging.current) range.current.value = String(h);
      const e = dayEvent(h);
      if (e !== evRef.current) {
        const out = evRef.current;
        setLayers((cur) => reorder(cur, out, e));
        setPrev(out);
        evRef.current = e;
        setEv(e);
      }
      if (h >= 21 !== nightRef.current) {
        nightRef.current = h >= 21;
        setNight(nightRef.current);
      }
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
      if (visible && !dragging.current && !lpPaused()) {
        const next = hour.current + dt * HOURS_PER_SEC;
        apply(next >= END - 0.1 ? START : next);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => (io.disconnect(), cancelAnimationFrame(raf));
  }, []);

  // O SVG só monta perto da tela: aí os alvos dele entram na lista
  useEffect(() => {
    if (!near || !sky.current) return;
    targets.current = findTargets(sky.current, range.current);
    applyRef.current(hour.current);
  }, [near]);

  // o que saiu some depois da transição
  useEffect(() => {
    if (!prev) return;
    const id = setTimeout(() => setPrev(null), CROSSFADE_MS);
    return () => clearTimeout(id);
  }, [prev, ev]);

  const t = useT().day;
  const e = { ...t.events[ev], color: COLOR[ev] };
  const st = (x: DayEvent) => (x === ev ? "on" : x === prev ? "off" : "none");

  return (
    <div className="flex flex-wrap items-center gap-10">
      <div
        ref={(n) => {
          sky.current = n;
          nearRef.current = n;
        }}
        className="lp-dia min-w-0 flex-[1_1_480px] overflow-hidden rounded-2xl border border-line"
        data-apagao={ev === "apagao" || undefined}
        style={{ aspectRatio: "11 / 9" }}
      >
        <span className="lp-dia-sol" aria-hidden="true" />
        <span className="lp-dia-lua" aria-hidden="true" />
        {near && (
          <svg viewBox="0 0 440 360" preserveAspectRatio="xMidYMid slice" className="lp-dia-cena" role="img" aria-label={t.scene(e.cat)}>
            <Base part="fundo" />
            {/* todas as camadas montadas: trocar é só mudar data-st (nada monta nem
                desmonta no meio do dia, então não há lixo para o GC) */}
            {layers.map((x) => (
              <g key={`u-${x}`} className="lp-ev" data-st={st(x)}>
                <Layer ev={x} />
              </g>
            ))}
            <Base part="frente" />
            <Zzz />
            {layers.map((x) => (
              <g key={`o-${x}`} className="lp-ev lp-ev-pin" data-st={st(x)}>
                <Layer ev={x} over />
              </g>
            ))}
          </svg>
        )}
        <span className="lp-dia-quente" aria-hidden="true" />
        <span className="lp-dia-noite" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
        <label className="flex flex-col gap-3">
          <span className="flex items-baseline justify-between">
            <span ref={labelRef} className="lp-rot" data-sun={t.sun} data-moon={t.moon}>{t.sun}</span>
            <span ref={clockRef} className="lp-num lp-dia-relogio text-3xl" style={{ color: "var(--accent)" }}>
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
            onPointerDown={() => (dragging.current = true)}
            onTouchStart={() => (dragging.current = true)}
            onInput={(v) => {
              dragging.current = true;
              applyRef.current(Number((v.target as HTMLInputElement).value));
            }}
            // soltou (mouse, dedo ou teclado): o dia volta a andar dali
            onPointerUp={() => (dragging.current = false)}
            onTouchEnd={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
            onKeyUp={() => (dragging.current = false)}
            onBlur={() => (dragging.current = false)}
            className="lp-sol w-full"
            aria-label={t.hour}
            aria-valuetext={t.valueText(e.cat, e.at)}
          />
          <span className="lp-num lp-muted flex justify-between text-xs" aria-hidden="true">
            {t.ticks.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </span>
        </label>

        <div key={ev} className="lp-card lp-card-bg story-entra flex flex-col gap-2">
          <span className="flex items-center gap-2">
            <span className="lp-tag font-semibold" style={{ position: "static", color: e.color, border: `1px solid ${e.color}` }}>{e.cat}</span>
            <span className="lp-rot">{t.around(e.at)}</span>
          </span>
          <p className="m-0 text-[17px]">{e.txt}</p>
        </div>

        {/* sempre no lugar (só aparece e some): montar e desmontar mudava a
            altura da coluna no celular e empurrava a página */}
        <div className="lp-coruja flex items-center gap-3" data-on={night} aria-hidden={!night}>
          <Medal icon="moon" tier={3} size={48} />
          <span className="lp-muted text-sm">
            {t.owlA} <strong className="text-ink">{t.owl}</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}
