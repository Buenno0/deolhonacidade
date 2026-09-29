"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { BADGES, DAILY_CAP, TIER_NAMES, levelProgress, type BadgeId, type Progress } from "@/lib/progress";
import Medal from "./Medal";
import { Button, Spinner } from "./ui";
import { FlameIcon } from "./ui/icons";

// Quanto falta para a próxima conquista, quando dá para saber pelo que o app conhece
function hint(id: BadgeId, next: number, p: Progress) {
  const need: Partial<Record<BadgeId, [number, number, number, number]>> = {
    olho_clinico: [p.counts.confirmed, 5, 25, 100],
    viral: [p.counts.max_views, 25, 100, 500],
    sempre_de_olho: [p.streak_days, 3, 7, 30],
    primeiro_olhar: [p.counts.posts, 1, 1, 1],
  };
  const n = need[id];
  if (!n) return null;
  return `${Math.min(n[0], n[next])}/${n[next]}`;
}

export default function ProgressCard({ progress, onChanged }: { progress: Progress; onChanged: () => void }) {
  const { cur, next, frac } = levelProgress(progress.xp);
  const [nick, setNick] = useState(progress.nickname ?? "");
  const [show, setShow] = useState(progress.show_nickname);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const best = (id: BadgeId) => Math.max(0, ...progress.badges.filter((b) => b.badge === id).map((b) => b.tier));

  async function save() {
    setSaving(true);
    const { error } = await getSupabase().rpc("set_nickname", { p_nickname: nick, p_show: show });
    setSaving(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Salvo" });
    if (!error) onChanged();
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Nível e XP */}
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-bg p-4">
        <Medal label={String(cur.level)} tier={3} size={64} />
        <div className="min-w-0 flex-1">
          <p className="rotulo">nível {cur.level}</p>
          <p className="font-display text-lg font-semibold leading-tight">{cur.name}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-elev">
            <div className="h-full rounded-full bg-accent" style={{ width: `${frac * 100}%` }} />
          </div>
          <p className="rotulo mt-1">
            <span className="num text-ink">{progress.xp}</span> XP
            {next ? ` · faltam ${next.xp - progress.xp} para ${next.name}` : " · nível máximo"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-bg p-3">
          <p className="rotulo">sequência</p>
          <p className="mt-1 flex items-center gap-1.5 text-base">
            <FlameIcon className={progress.streak_today ? "text-danger" : "text-muted"} />
            <span className="num">{progress.streak_days}</span> {progress.streak_days === 1 ? "dia" : "dias"}
          </p>
          <p className="text-xs text-muted">{progress.streak_today ? "Hoje já contou" : "Ajude hoje para não perder"}</p>
        </div>
        <div className="rounded-xl border border-line bg-bg p-3">
          <p className="rotulo">XP hoje</p>
          <p className="num mt-1 text-base">
            {progress.xp_today}/{DAILY_CAP}
          </p>
          <p className="text-xs text-muted">O limite diário evita farm</p>
        </div>
      </div>

      {/* Conquistas */}
      <div>
        <p className="rotulo mb-2">Conquistas</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {(Object.keys(BADGES) as BadgeId[]).map((id) => {
            const def = BADGES[id];
            const tier = best(id) as 0 | 1 | 2 | 3;
            const nextTier = Math.min(tier + 1, def.tiers.length);
            const done = tier >= def.tiers.length;
            const h = done ? null : hint(id, nextTier, progress);
            return (
              <li key={id} className="flex flex-col items-center gap-1 rounded-xl border border-line bg-bg p-2 text-center">
                <Medal icon={def.icon} tier={def.first ? 3 : ((tier || 1) as 1 | 2 | 3)} locked={tier === 0} size={48} />
                <span className="text-xs font-medium leading-tight">{def.name}</span>
                <span className="rotulo text-[9px]">
                  {tier ? (def.first ? "feita" : TIER_NAMES[tier - 1]) : "trancada"}
                  {h ? ` · ${h}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Apelido opcional */}
      <div className="rounded-xl border border-line bg-bg p-3">
        <p className="rotulo mb-2">Apelido (opcional)</p>
        <div className="flex gap-2">
          <span className="grid place-items-center text-muted">@</span>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value.toLowerCase())}
            maxLength={20}
            placeholder="ex.: olheiro_do_centro"
            aria-label="Apelido"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-base outline-none focus:border-accent"
          />
        </div>
        <label className="mt-2 flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          Mostrar meu apelido nos meus posts. Sem isso, eles aparecem só com o nível.
        </label>
        <div className="mt-2 flex items-center gap-3">
          <Button variant="secundario" onClick={save} disabled={saving} className="px-3 py-1.5 text-xs">
            {saving && <Spinner />} Salvar apelido
          </Button>
          {msg && <span className={msg.ok ? "text-xs text-ok" : "text-xs text-danger"}>{msg.text}</span>}
        </div>
      </div>
    </section>
  );
}
