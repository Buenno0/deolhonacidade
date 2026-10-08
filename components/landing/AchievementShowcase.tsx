"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Medal from "@/components/Medal";
import { BADGES, TIER_COLOR, TIER_NAMES, levelName, type BadgeId } from "@/lib/progress";

// A festa de conquista do app (AchievementOverlay), em loop na LP: a mesma
// medalha, o mesmo anel fechando e as mesmas faíscas (classes do globals.css).
type Item = { kind: "badge"; badge: BadgeId; tier: 1 | 2 | 3 } | { kind: "level"; level: number };

const SEQ: Item[] = [
  { kind: "badge", badge: "primeiro_olhar", tier: 1 },
  { kind: "badge", badge: "olho_clinico", tier: 1 },
  { kind: "level", level: 2 },
  { kind: "badge", badge: "pronto_socorro", tier: 2 },
  { kind: "badge", badge: "coruja", tier: 3 },
  { kind: "level", level: 3 },
  { kind: "badge", badge: "sempre_de_olho", tier: 3 },
];

const STEP_MS = 3600;

export default function AchievementShowcase() {
  const box = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(false);
  // muda quando a pessoa navega na mão: reinicia a passagem automática
  const [round, setRound] = useState(0);
  const go = (to: number) => {
    setI(((to % SEQ.length) + SEQ.length) % SEQ.length);
    setRound((r) => r + 1);
  };
  const swipe = useRef<number | null>(null);
  const swiped = useRef(false); // o clique que vem depois de arrastar não conta

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!document.querySelector(".lp-pausado")) setI((v) => (v + 1) % SEQ.length);
    }, STEP_MS);
    return () => clearInterval(id);
  }, [visible, round]);

  const item = SEQ[i];
  const isBadge = item.kind === "badge";
  const def = isBadge ? BADGES[item.badge] : null;
  const tier = isBadge ? (def!.first ? 3 : item.tier) : 3;
  const color = isBadge && !def!.first ? TIER_COLOR[item.tier - 1] : "var(--accent)";

  return (
    <div
      ref={box}
      className="sala-escura flex touch-pan-y select-none flex-col items-center py-4 text-center"
      aria-live="off"
      // arrastar para os lados também passa
      onPointerDown={(e) => (swipe.current = e.clientX)}
      onPointerUp={(e) => {
        if (swipe.current === null) return;
        const dx = e.clientX - swipe.current;
        swipe.current = null;
        swiped.current = Math.abs(dx) > 40;
        if (swiped.current) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      {/* key: cada conquista remonta, e a animação de entrada roda de novo */}
      <button
        type="button"
        key={`${i}-${visible}`}
        onClick={() => (swiped.current ? (swiped.current = false) : go(i + 1))}
        aria-label="Próxima conquista"
        className={`flex cursor-pointer flex-col items-center border-0 bg-transparent p-0 text-center ${visible ? "conquista-entra" : ""}`}
      >
        <span className="relative block">
          {visible &&
            Array.from({ length: 14 }, (_, k) => (
              <span
                key={k}
                className="faisca absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                style={
                  {
                    background: k % 3 === 0 ? "var(--ink)" : color,
                    "--ang": `${(360 / 14) * k}deg`,
                    "--dist": `${70 + (k % 4) * 14}px`,
                    animationDelay: `${420 + (k % 5) * 40}ms`,
                  } as CSSProperties
                }
              />
            ))}
          {isBadge ? (
            <Medal icon={def!.icon} tier={tier} size={120} animate={visible} />
          ) : (
            <Medal label={String(item.level)} tier={3} size={120} animate={visible} />
          )}
        </span>
        <span className="lp-rot mt-5 block" style={{ color }}>
          {isBadge ? (def!.first ? "primeira vez" : `conquista · ${TIER_NAMES[item.tier - 1]}`) : "subiu de nível"}
        </span>
        <span className="lp-disp mt-1.5 block text-2xl leading-tight text-ink">{isBadge ? def!.name : levelName(item.level)}</span>
        <span className="lp-muted mt-1 block min-h-[2.6em] max-w-[260px] text-sm">
          {isBadge ? def!.tiers[Math.min(item.tier, def!.tiers.length) - 1] : `Nível ${item.level}. Continue ajudando a cidade.`}
        </span>
      </button>
      <div className="mt-2 flex" role="group" aria-label="Conquistas">
        {SEQ.map((_, k) => (
          // área de toque de 28 px em volta de cada bolinha
          <button key={k} type="button" onClick={() => go(k)} aria-label={`Conquista ${k + 1} de ${SEQ.length}`} aria-current={k === i} className="grid h-7 cursor-pointer place-items-center border-0 bg-transparent px-[3px]">
            <span className="block h-1.5 rounded-full transition-all duration-500" style={{ width: k === i ? 18 : 6, background: k === i ? color : "var(--line)" }} />
          </button>
        ))}
      </div>
      <span className="lp-rot mt-1 opacity-70">toque para ver a próxima</span>
    </div>
  );
}
