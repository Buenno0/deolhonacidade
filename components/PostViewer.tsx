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
  const mine = Boolean(p.mine);
  const rank = archive ? undefined : ranks?.get(p.id);
  const fresh = !archive && !promo && isFresh(p.created_at, now);
  const color = archive ? "var(--muted)" : promo ? "var(--ink)" : severityVar(p.category);

  const segments = posts.length > 24 ? [] : posts;
  const lifeLeft = archive ? 1 : remaining(p, now);
  const meta = [
    promo ? p.business_segment : archive ? null : `${p.author_nickname ? `@${p.author_nickname} · ` : ""}${levelName(p.author_level ?? 1)}`,
    userPos ? `${formatDistance(distance(userPos, coords))} de você` : null,
    !archive && !promo && p.confirm_count > 0 ? `${p.confirm_count} ${p.confirm_count === 1 ? "confirmou" : "confirmaram"}` : null,
  ].filter(Boolean);

  // Estilo story: foto em tela cheia, desfoque progressivo atrás do texto.
  // No desktop, o story fica no formato de celular sobre a própria foto borrada.
  return (
    <div role="dialog" aria-label="Post" className="sala-escura fixed inset-0 z-40 flex items-center justify-center gap-6 bg-black text-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl(p.photo_path)}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden h-full w-full scale-110 object-cover opacity-50 blur-3xl sm:block"
      />

      {posts.length > 1 && (
        <IconButton
          label="Anterior"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="story-vidro relative hidden h-12 w-12 text-ink disabled:opacity-30 sm:grid"
        >
          <ChevronIcon className="rotate-180" />
        </IconButton>
      )}

      <div className="relative h-full w-full overflow-hidden sm:aspect-[9/16] sm:h-[min(92dvh,860px)] sm:w-auto sm:rounded-2xl sm:shadow-2xl">
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
            <div key={f.properties.id} className="relative h-full w-full shrink-0 snap-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(f.properties.photo_path)}
                alt={f.properties.caption ?? CATEGORIES[f.properties.category].label}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>

        <div className="story-blur-topo" />
        <div className="story-blur-base" />

        {/* Topo: barras (uma por post; a atual mostra a vida que resta) e cabeçalho */}
        <div className="absolute inset-x-0 top-0 flex flex-col gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1" aria-hidden="true">
            {segments.map((f, i) => (
              <span key={f.properties.id} className="story-barra">
                <i
                  style={{
                    width: i < index ? "100%" : i === index ? `${lifeLeft * 100}%` : "0%",
                    background: i === index ? color : undefined,
                  }}
                />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-[1.5px]"
              style={{ borderColor: color, color, background: `color-mix(in oklab, ${color} 22%, transparent)` }}
            >
              <CategoryIcon category={p.category} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{promo ? (p.business_name ?? cat.label) : cat.label}</p>
              <p className="rotulo text-ink/80">
                {archive ? (
                  <>
                    registrado em <span className="num text-ink">{registered(p.created_at)}</span>
                  </>
                ) : (
                  <>
                    {timeAgo(p.created_at, now)} · some em <span className="num text-ink">{countdown(p.expires_at, now)}</span>
                  </>
                )}
              </p>
            </div>
            {posts.length > 24 && (
              <span className="num text-xs text-ink/80">
                {index + 1}/{posts.length}
              </span>
            )}
            <IconButton label="Fechar" onClick={onClose} className="border-0 bg-black/35 text-ink">
              <CloseIcon />
            </IconButton>
          </div>
        </div>

        {/* Base: tags, legenda, dados e ações, sobre o desfoque */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3.5 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {(promo || rank || fresh || archive) && (
            <div className="flex flex-wrap gap-2">
              {promo && <Tag kind="divulgacao" />}
              {rank && <Tag kind="alta" rank={rank} />}
              {fresh && <Tag kind="agora" />}
              {archive && <span className="tag tag-divulgacao">Histórico</span>}
            </div>
          )}
          {p.caption && (
            <p className="font-display text-[26px] font-bold leading-[31px] [text-shadow:0_1px_12px_rgb(0_0_0/0.35)]">{p.caption}</p>
          )}
          {meta.length > 0 && <p className="rotulo text-ink/80">{meta.join(" · ")}</p>}

          {promo ? (
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`}
                target="_blank"
                rel="noreferrer"
                className="story-pill story-vidro"
              >
                <PinIcon /> Como chegar
              </a>
              {p.business_whatsapp && (
                <a href={`https://wa.me/${p.business_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="story-pill story-vidro">
                  WhatsApp
                </a>
              )}
              {p.business_instagram && (
                <a
                  href={`https://instagram.com/${p.business_instagram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="story-pill story-vidro"
                >
                  Instagram
                </a>
              )}
            </div>
          ) : (
            !archive &&
            (mine ? (
              <p className="rotulo text-ink/70">Seu post · quem está perto confirma se ainda está rolando</p>
            ) : (
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
            ))
          )}

          <div className="flex items-center justify-between">
            <ShareButton post={p} onShared={onChanged} archive={archive} />
            {!mine && (
              <Button
                variant="perigo"
                onClick={() => report(p.id)}
                disabled={Boolean(reported[p.id])}
                className="border-0 bg-transparent px-0 py-1.5 text-xs"
              >
                <FlagIcon />
                {reported[p.id] === "done" ? "Denúncia enviada" : "Denunciar"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {posts.length > 1 && (
        <IconButton
          label="Próximo"
          onClick={() => go(1)}
          disabled={index === posts.length - 1}
          className="story-vidro relative hidden h-12 w-12 text-ink disabled:opacity-30 sm:grid"
        >
          <ChevronIcon />
        </IconButton>
      )}
    </div>
  );
}
