"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { recordInteraction } from "@/lib/interactions";
import { CATEGORIES, severityVar } from "@/lib/categories";
import { photoUrl } from "@/lib/media";
import { levelName } from "@/lib/progress";
import { countdown, distance, formatDistance, isFresh, remaining, timeAgo, type PostFeature } from "@/lib/posts";
import { CategoryIcon, ChevronIcon, CloseIcon, FlagIcon, PinIcon } from "./ui/icons";
import { Tag } from "./ui/Tag";
import { Button, IconButton } from "./ui";
import ShareButton from "./viewer/ShareButton";
import StillThere from "./viewer/StillThere";

type Props = {
  posts: PostFeature[];
  startId: string;
  userPos: [number, number] | null;
  loggedIn: boolean;
  onActive: (post: PostFeature) => void;
  onClose: () => void;
  onNeedLogin: () => void;
  onChanged: () => void;
  // Em alta: posição de cada post no Trends (só os 3 primeiros)
  ranks?: Map<string, number>;
  // Histórico: posts que já saíram do mapa
  archive?: boolean;
};

const whenFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const registered = (iso: string) => whenFmt.format(new Date(iso)).replace(",", " às");

// Tela cheia sobre a foto: sala-escura, porque a foto manda na luz.
// Um carrossel com scroll-snap nativo: arrastar no celular, setas no teclado.
export default function PostViewer({ posts, startId, userPos, loggedIn, onActive, onClose, onNeedLogin, onChanged, ranks, archive = false }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(() => Math.max(0, posts.findIndex((p) => p.properties.id === startId)));
  const [reported, setReported] = useState<Record<string, "sending" | "done">>({});
  const [now, setNow] = useState(() => Date.now());
  // Resultado dos votos desta sessão, por cima do que veio do servidor
  const [overrides, setOverrides] = useState<Record<string, Partial<PostFeature["properties"]>>>({});
  const current = posts[index];

  useEffect(() => {
    const el = track.current;
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior: "instant" });
    // só na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (current) {
      onActive(current);
      // Vista no histórico não conta: o arquivo não compete com o agora
      if (!archive) recordInteraction(current.properties.id, "view");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.properties.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(t);
      window.removeEventListener("keydown", onKey);
    };
  });

  function go(delta: number) {
    const el = track.current;
    if (!el) return;
    const next = Math.min(posts.length - 1, Math.max(0, index + delta));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  async function report(id: string) {
    if (!loggedIn) return onNeedLogin();
    if (!confirm(`Denunciar este post como impróprio ou falso? Com 3 denúncias ele sai ${archive ? "do histórico" : "do mapa"}.`)) return;
    setReported((r) => ({ ...r, [id]: "sending" }));
    const { error } = await getSupabase().rpc("report_post", { p_id: id });
    setReported((r) => {
      const next = { ...r };
      if (error) delete next[id];
      else next[id] = "done";
      return next;
    });
    if (error) alert(error.message);
  }

  if (!current) return null;
  const p = { ...current.properties, ...overrides[current.properties.id] };
  const cat = CATEGORIES[p.category];
  const coords = current.geometry.coordinates as [number, number];
  const promo = p.category === "estabelecimento";
  const rank = archive ? undefined : ranks?.get(p.id);
  const fresh = !archive && !promo && isFresh(p.created_at, now);
  const color = archive ? "var(--muted)" : promo ? "var(--ink)" : severityVar(p.category);

  return (
    <div role="dialog" aria-label="Post" className="sala-escura fixed inset-0 z-40 bg-black text-ink">
      <div
        ref={track}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) setIndex(i);
        }}
      >
        {posts.map((f) => (
          <div key={f.properties.id} className="relative h-full w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl(f.properties.photo_path)}
              alt={f.properties.caption ?? CATEGORIES[f.properties.category].label}
              className="h-full w-full object-contain"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Topo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5" style={{ borderColor: color, color }}>
              <CategoryIcon category={p.category} />
              <span className="rotulo" style={{ color: "inherit" }}>
                {promo ? (p.business_name ?? cat.label) : cat.label}
              </span>
            </span>
            {promo && <Tag kind="divulgacao" />}
            {rank && <Tag kind="alta" rank={rank} />}
            {fresh && <Tag kind="agora" />}
            {archive && <span className="tag tag-divulgacao">Histórico</span>}
          </div>
          <div className="flex items-center gap-2">
            {posts.length > 1 && (
              <span className="num text-xs text-muted">
                {index + 1}/{posts.length}
              </span>
            )}
            <IconButton label="Fechar" onClick={onClose} className="border-white/15 bg-black/40 text-ink">
              <CloseIcon />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Setas (desktop) */}
      {posts.length > 1 && (
        <>
          <IconButton
            label="Anterior"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 border-white/15 bg-black/40 text-ink disabled:opacity-30 sm:grid"
          >
            <ChevronIcon className="rotate-180" />
          </IconButton>
          <IconButton
            label="Próximo"
            onClick={() => go(1)}
            disabled={index === posts.length - 1}
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 border-white/15 bg-black/40 text-ink disabled:opacity-30 sm:grid"
          >
            <ChevronIcon />
          </IconButton>
        </>
      )}

      {/* Base */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16">
        <div className="mx-auto max-w-lg">
          {p.caption && <p className="mb-3 font-display text-xl font-semibold leading-snug">{p.caption}</p>}
          <p className="rotulo flex flex-wrap gap-x-3 gap-y-1">
            {promo ? (
              p.business_segment && <span className="text-ink">{p.business_segment}</span>
            ) : archive ? null : (
              <span className="text-ink">
                {p.author_nickname ? `@${p.author_nickname} · ` : ""}
                {levelName(p.author_level ?? 1)}
              </span>
            )}
            {archive ? (
              <span>
                registrado em <span className="num text-ink">{registered(p.created_at)}</span>
              </span>
            ) : (
              <>
                <span>{timeAgo(p.created_at, now)}</span>
                <span>
                  some em <span className="num text-ink">{countdown(p.expires_at, now)}</span>
                </span>
              </>
            )}
            {userPos && <span>{formatDistance(distance(userPos, coords))} de você</span>}
          </p>
          {/* A vida do post: a mesma medida do anel no pin */}
          {!archive && (
            <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${remaining(p, now) * 100}%`, background: color }} />
            </div>
          )}
          {promo ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm"
              >
                <PinIcon /> Como chegar
              </a>
              {p.business_whatsapp && (
                <a
                  href={`https://wa.me/${p.business_whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm"
                >
                  WhatsApp
                </a>
              )}
              {p.business_instagram && (
                <a
                  href={`https://instagram.com/${p.business_instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm"
                >
                  Instagram
                </a>
              )}
            </div>
          ) : (
            !archive && (
              <div className="mt-4">
                <StillThere
                  key={p.id}
                  post={p}
                  loggedIn={loggedIn}
                  onNeedLogin={onNeedLogin}
                  onVoted={(id, v) => {
                    setOverrides((o) => ({ ...o, [id]: v }));
                    onChanged();
                  }}
                />
              </div>
            )
          )}
          <div className="mt-3 flex items-center justify-between">
            <ShareButton post={p} onShared={onChanged} archive={archive} />
            <Button
              variant="perigo"
              onClick={() => report(p.id)}
              disabled={Boolean(reported[p.id])}
              className="px-3 py-1.5 text-xs"
            >
              <FlagIcon />
              {reported[p.id] === "done" ? "Denúncia enviada" : "Denunciar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
