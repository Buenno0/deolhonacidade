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
  }, [visible]);

  const item = SEQ[i];
  const isBadge = item.kind === "badge";
  const def = isBadge ? BADGES[item.badge] : null;
  const tier = isBadge ? (def!.first ? 3 : item.tier) : 3;
  const color = isBadge && !def!.first ? TIER_COLOR[item.tier - 1] : "var(--accent)";

  return (
    <div ref={box} className="sala-escura flex flex-col items-center py-4 text-center" aria-live="off">
      {/* key: cada conquista remonta, e a animação de entrada roda de novo */}
      <div key={`${i}-${visible}`} className={visible ? "conquista-entra flex flex-col items-center" : "flex flex-col items-center"}>
        <div className="relative">
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
        </div>
        <p className="lp-rot mt-5" style={{ color }}>
          {isBadge ? (def!.first ? "primeira vez" : `conquista · ${TIER_NAMES[item.tier - 1]}`) : "subiu de nível"}
        </p>
        <p className="lp-disp mt-1.5 text-2xl leading-tight text-ink">{isBadge ? def!.name : levelName(item.level)}</p>
        <p className="lp-muted mt-1 min-h-[2.6em] max-w-[260px] text-sm">
          {isBadge ? def!.tiers[Math.min(item.tier, def!.tiers.length) - 1] : `Nível ${item.level}. Continue ajudando a cidade.`}
        </p>
      </div>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {SEQ.map((_, k) => (
          <span key={k} className="h-1.5 rounded-full transition-all duration-500" style={{ width: k === i ? 18 : 6, background: k === i ? color : "var(--line)" }} />
        ))}
      </div>
    </div>
  );
}
