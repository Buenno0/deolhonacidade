"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AccidentScene, CityScene, EventScene, FloodScene, cityPins } from "./scenes";
import StoryDemo from "./StoryDemo";
import { clock, lpPaused, reducedMotion } from "./time";

// O hero: a cidade isométrica que se monta, inclina com o mouse (ou o
// giroscópio) e tem pins que abrem o story ali mesmo. O card de baixo troca de
// post a cada 5 s e o relógio desconta.
const ICON = {
  acidente: "M12 3 2 20h20Z M12 10v4 M12 17h.01",
  evento: "M9 18V5l12-2v13 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  agua: "M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12Z",
  transito: "M3 11h18v6H3Z M5 11l2-5h10l2 5 M7 20v-3 M17 20v-3",
  luz: "M13 2 4 14h7l-1 8 9-12h-7Z",
  obra: "M2 20h20 M5 20V9l7-5 7 5v11",
};

const AT = cityPins();
// story: índice no StoryDemo (acidente, evento, alagamento); sem story = só enfeite que nasce e some
const PINS = [
  { id: "acidente", c: "var(--danger)", icon: ICON.acidente, fx: "lp-pulse", story: 0, label: "Acidente", d: "1.4s" },
  { id: "evento", c: "var(--accent)", icon: ICON.evento, fx: "lp-rise", story: 1, label: "Evento", d: "1.7s" },
  { id: "alagamento", c: "var(--warn)", icon: ICON.agua, fx: "", story: 2, label: "Alagamento", d: "2s" },
  { id: "transito", c: "var(--warn)", icon: ICON.transito, fx: "lp-pulse", d: "-2s" },
  { id: "luz", c: "var(--warn)", icon: ICON.luz, fx: "", d: "-5s" },
  { id: "obra", c: "var(--warn)", icon: ICON.obra, fx: "", d: "-7.5s" },
] as const;

const POSTS = [
  { Scene: AccidentScene, cat: "Acidente", c: "var(--danger)", s: 9767, total: 10800, txt: "Batida na Av. Peixoto Gomide, faixa da direita fechada.", conf: 8 },
  { Scene: EventScene, cat: "Evento", c: "var(--accent)", s: 31220, total: 43200, txt: "Show começando na Praça Duque de Caxias, ainda tem lugar.", conf: 23 },
  { Scene: FloodScene, cat: "Alagamento", c: "var(--warn)", s: 18710, total: 21600, txt: "Rua cheia perto da rodoviária, carro baixo não passa.", conf: 12 },
];

function PinGlyph({ c, icon, fx }: { c: string; icon: string; fx: string }) {
  return (
    <span className={`lp-pin ${fx}`} style={{ borderColor: c, color: c }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={icon} />
      </svg>
    </span>
  );
}

// O card de post do hero, com relógio próprio: o tique de cada segundo
// redesenha só o card, não a cidade inteira. Só desenha a cena do post da vez.
function PostCard() {
  const [t, setT] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reducedMotion()) return;
    const id = setInterval(() => !lpPaused() && !box.current?.closest(".lp-fora") && setT((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const idx = Math.floor(t / 5) % POSTS.length;
  return (
    <div
      ref={box}
      className="lp-cartao absolute bottom-3 left-3 z-[1] overflow-hidden rounded-2xl border border-line"
      style={{ width: "min(290px, calc(100% - 24px))", height: 200, background: "var(--surface)" }}
    >
      {POSTS.map((p, i) => {
        const s = p.s - t;
        return (
          <article key={p.cat} className="lp-post" data-on={i === idx} aria-hidden={i !== idx}>
            <div className="relative" style={{ height: 104, background: "var(--elev)" }}>
              {i === idx && <MemoScene Scene={p.Scene} />}
              <span className="lp-tag font-semibold" style={{ top: 10, left: 10, color: p.c, border: `1px solid ${p.c}` }}>{p.cat}</span>
              <span className="lp-tag lp-num" style={{ top: 10, right: 10 }}>{clock(s)}</span>
              <span className="absolute bottom-0 left-0" style={{ height: 3, width: `${(s / p.total) * 100}%`, background: p.c, transition: "width 1s linear" }} />
            </div>
            <div className="flex flex-col gap-1 px-3.5 py-2.5">
              <span className="text-sm leading-snug">{p.txt}</span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ok)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12l5 5L20 7" /></svg>
                <span className="lp-num">{p.conf + Math.floor(t / 7)}</span> pessoas confirmaram
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const MemoScene = memo(function MemoScene({ Scene }: { Scene: typeof AccidentScene }) {
  return <Scene className="lp-cena absolute inset-0" vb="70 40 300 230" />;
});
const MemoCity = memo(function MemoCity() {
  return <CityScene title="Ilustração da cidade com acontecimentos marcados no mapa" />;
});

export default function LiveMap() {
  const [story, setStory] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  // Inclinação: alvo vem do mouse ou do giroscópio, o quadro persegue com amortecimento
  useEffect(() => {
    const el = box.current;
    const st = stage.current;
    if (!el || !st || reducedMotion()) return;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    // O laço só roda enquanto o quadro persegue o alvo; parado, dorme
    let raf = 0;
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      st.style.transform = `rotateX(${(-cur.y * 7).toFixed(2)}deg) rotateY(${(cur.x * 9).toFixed(2)}deg)`;
      raf = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || lpPaused()) return;
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      wake();
    };
    const onLeave = () => ((target.x = 0), (target.y = 0), wake());
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null || lpPaused()) return;
      if (el.closest(".lp-fora")) return;
      target.x = Math.max(-1, Math.min(1, e.gamma / 25));
      target.y = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
      wake();
    };
    // iOS só libera o giroscópio depois de um toque e de uma permissão
    const askTilt = () => {
      const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (D.requestPermission) D.requestPermission().then((r) => r === "granted" && window.addEventListener("deviceorientation", onTilt)).catch(() => {});
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("deviceorientation", onTilt);
    el.addEventListener("touchend", askTilt, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("touchend", askTilt);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, []);

  useEffect(() => {
    if (story === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setStory(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [story]);

  return (
    <div ref={box} className="lp-mapa lp-fade" style={{ animationDelay: "0.1s" }}>
      <div ref={stage} className="lp-palco">
        <MemoCity />
        <div className="lp-pinos">
          <span className="lp-eu" style={{ left: "50%", top: "52%" }} />
          {PINS.map((p) =>
            "story" in p ? (
              <button
                key={p.id}
                type="button"
                className="lp-pinbtn"
                style={{ ...AT[p.id], color: p.c, animationDelay: p.d }}
                onClick={() => setStory(p.story)}
                aria-label={`Ver o story: ${p.label}`}
              >
                <PinGlyph c={p.c} icon={p.icon} fx={p.fx} />
                {p.id === "acidente" && <span className="lp-dica">toque</span>}
              </button>
            ) : (
              <div key={p.id} className="lp-vida" style={{ ...AT[p.id], animationDelay: p.d }} aria-hidden="true">
                <PinGlyph c={p.c} icon={p.icon} fx={p.fx} />
                <span className="lp-xp" style={{ animationDelay: p.d }}>+1 confirmou</span>
              </div>
            ),
          )}
        </div>
      </div>

      <PostCard />
      <span className="lp-rot absolute right-3.5 top-3.5 z-[1] flex items-center gap-2 rounded-full px-2.5 py-1.5" style={{ background: "rgba(12,10,8,.75)", color: "var(--ink)" }}>
        <span className="lp-ponto" />
        Exemplo
      </span>

      {story !== null && (
        <div className="lp-sobre" role="dialog" aria-label="Story de exemplo" onClick={(e) => e.target === e.currentTarget && setStory(null)}>
          <StoryDemo start={story} onClose={() => setStory(null)} />
        </div>
      )}
    </div>
  );
}
