"use client";

import { useEffect } from "react";
import { BADGES, TIER_COLOR, TIER_NAMES, levelName, type BadgeId } from "@/lib/progress";
import Medal from "./Medal";
import { Button } from "./ui";

export type Celebration = { kind: "badge"; badge: BadgeId; tier: 1 | 2 | 3 } | { kind: "level"; level: number };

type Props = { item: Celebration; remaining: number; onNext: () => void; onSeeAll: () => void };

// A festa: o único momento do app que anima por celebração (como a cena do
// login no NAS). A medalha entra, o anel se fecha e faíscas saem do centro.
export default function AchievementOverlay({ item, remaining, onNext, onSeeAll }: Props) {
  useEffect(() => {
    navigator.vibrate?.([30, 40, 60]);
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter") && onNext();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onNext]);

  const isBadge = item.kind === "badge";
  const def = isBadge ? BADGES[item.badge] : null;
  const color = isBadge && !def!.first ? TIER_COLOR[item.tier - 1] : "var(--accent)";

  return (
    <div role="dialog" aria-label="Conquista" className="sala-escura fixed inset-0 z-50 grid place-items-center bg-black/85 px-6 backdrop-blur-sm">
      <div className="conquista-entra flex w-full max-w-xs flex-col items-center text-center">
        <div className="relative">
          {/* faíscas */}
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="faisca absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
              style={
                {
                  background: i % 3 === 0 ? "var(--ink)" : color,
                  "--ang": `${(360 / 14) * i}deg`,
                  "--dist": `${90 + (i % 4) * 18}px`,
                  animationDelay: `${420 + (i % 5) * 40}ms`,
                } as React.CSSProperties
              }
            />
          ))}
          {isBadge ? (
            <Medal icon={def!.icon} tier={def!.first ? 3 : item.tier} size={148} animate />
          ) : (
            <Medal label={String(item.level)} tier={3} size={148} animate />
          )}
        </div>
        <p className="rotulo mt-6" style={{ color }}>
          {isBadge ? (def!.first ? "primeira vez" : `conquista · ${TIER_NAMES[item.tier - 1]}`) : "subiu de nível"}
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-ink">{isBadge ? def!.name : levelName(item.level)}</h2>
        <p className="mt-2 text-sm text-muted">
          {isBadge ? def!.tiers[Math.min(item.tier, def!.tiers.length) - 1] : `Nível ${item.level}. Continue ajudando a cidade.`}
        </p>
        <div className="mt-8 flex w-full flex-col gap-2">
          <Button size="lg" onClick={onNext} className="w-full">
            {remaining > 0 ? `Continuar · mais ${remaining}` : "Continuar"}
          </Button>
          <Button variant="fantasma" onClick={onSeeAll} className="text-ink">
            Ver minhas conquistas
          </Button>
        </div>
      </div>
    </div>
  );
}
