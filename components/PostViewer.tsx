"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { recordInteraction } from "@/lib/interactions";
import { CATEGORIES, severityVar } from "@/lib/categories";
import { photoUrl } from "@/lib/media";
import { levelName } from "@/lib/progress";
import { distance, formatDistance, isFresh, timeAgo, type PostFeature } from "@/lib/posts";
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
  // Já vistos neste aparelho: a passagem automática pula
  seen?: Set<string>;
};

const whenFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const STORY_MS = 6000;
const registered = (iso: string) => whenFmt.format(new Date(iso)).replace(",", " às");

// Tela cheia sobre a foto: sala-escura, porque a foto manda na luz.
// Um carrossel com scroll-snap nativo: arrastar no celular, setas no teclado.
export default function PostViewer({ posts, startId, userPos, loggedIn, onActive, onClose, onNeedLogin, onChanged, ranks, archive = false, seen }: Props) {
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

  // Passagem automática: cada story fica STORY_MS. Segurar pausa; toque
  // rápido navega (um toque longo só pausa, não navega).
  const [held, setHeld] = useState(false);
  // Os vistos antes de abrir (os que você assiste agora não contam)
  const [seenAtOpen] = useState(() => new Set(seen ?? []));
  const [hidden, setHidden] = useState(false);
  const [round, setRound] = useState(0);
  const pressAt = useRef(0);
  // Até quando ignorar a rolagem (é o próprio app rolando)
  const autoScroll = useRef(0);
  const paused = held || hidden;
  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  function tapGo(delta: number) {
    // Segurou mais de meio segundo: era para pausar, não para navegar
    if (pressAt.current && Date.now() - pressAt.current > 500) return;
    if (delta > 0 && index === posts.length - 1) return;
    if (delta < 0 && index === 0) return setRound((r) => r + 1); // recomeça o primeiro
    go(delta);
  }

  const reduceMotion = useRef(false);
  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Assentamento: no iPhone a rolagem pode acabar sem avisar a posição
  // final. Parada a rolagem (e sem o dedo na tela), encaixa no story mais
  // próximo.
  const touching = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Posiciona a rolagem sem o encaixe no meio (no iPhone, o scroll-snap puxava
  // de volta para o story anterior logo depois de um pulo)
  function placeScroll(el: HTMLDivElement, left: number) {
    el.style.scrollSnapType = "none";
    el.scrollLeft = left;
    requestAnimationFrame(() => {
      el.scrollLeft = left;
      el.style.scrollSnapType = "";
    });
  }
  function settleSoon(el: HTMLDivElement, target?: number, wait = 150) {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (touching.current) return;
      const w = el.clientWidth || 1;
      const i = target ?? Math.min(posts.length - 1, Math.max(0, Math.round(el.scrollLeft / w)));
      if (Math.abs(el.scrollLeft - i * w) > 1) placeScroll(el, i * w);
      autoScroll.current = Date.now() + 80;
      setIndex(i);
    }, wait);
  }
  useEffect(() => () => clearTimeout(settleTimer.current), []);

  // Empilhar (toque e passagem automática): o próximo desliza por cima com
  // sombra e o atual recua e escurece. Só transform e opacity, pela Web
  // Animations API (roda na placa de vídeo). No fim, a rolagem pula para o
  // destino e as camadas voltam ao normal no mesmo quadro. Arrastar com o dedo
  // continua sendo o deslize nativo do navegador.
  const animating = useRef(false);
  function go(delta: number) {
    const el = track.current;
    if (!el || animating.current) return;
    const next = Math.min(posts.length - 1, Math.max(0, index + delta));
    if (next === index) return;
    const w = el.clientWidth;
    setIndex(next);
    autoScroll.current = Date.now() + 700;
    const jump = () => {
      placeScroll(el, next * w);
      autoScroll.current = Date.now() + 120;
      // e confere depois: se a rolagem não ficou no story certo, corrige
      settleSoon(el, next, 220);
    };
    const cur = el.children[index] as HTMLElement | undefined;
    const nxt = el.children[next] as HTMLElement | undefined;
    if (!cur || !nxt || reduceMotion.current || document.visibilityState !== "visible" || typeof cur.animate !== "function") {
      jump();
      return;
    }
    animating.current = true;
    const dist = (next - index) * w; // pode pular vários (os já vistos)
    const opts: KeyframeAnimationOptions = { duration: 340, easing: "cubic-bezier(.25,.1,.25,1)", fill: "forwards" };
    const back = "translateX(-12%) scale(0.97)";
    const dim = (face: HTMLElement) => face.querySelector(".story-dim") as HTMLElement;
    const anims =
      next > index
        ? [
            // o próximo entra por cima, da direita
            nxt.animate([{ transform: "translateX(0)" }, { transform: `translateX(${-dist}px)` }], opts),
            cur.animate([{ transform: "none" }, { transform: back }], opts),
            dim(cur).animate([{ opacity: 0 }, { opacity: 0.35 }], opts),
          ]
        : [
            // voltando: o atual sai pela direita e revela o anterior embaixo
            cur.animate([{ transform: "none" }, { transform: `translateX(${w}px)` }], opts),
            nxt.animate([{ transform: `translateX(${-dist}px) ${back}` }, { transform: `translateX(${-dist}px)` }], opts),
            dim(nxt).animate([{ opacity: 0.35 }, { opacity: 0 }], opts),
          ];
    (next > index ? nxt : cur).style.zIndex = "2";
    // Limite de segurança: se o mapa recarregar os posts no meio e a foto em
    // animação for trocada, a animação "órfã" nunca termina e travava os toques
    const guard = new Promise((r) => setTimeout(r, (opts.duration as number) + 150));
    Promise.race([Promise.all(anims.map((a) => a.finished)), guard])
      .catch(() => {})
      .finally(() => {
        jump();
        for (const a of anims) a.cancel();
        nxt.style.zIndex = "";
        cur.style.zIndex = "";
        animating.current = false;
      });
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
          className="no-scrollbar relative isolate z-0 flex h-full snap-x snap-mandatory overflow-x-auto"
          onTouchStart={() => (touching.current = true)}
          onTouchEnd={(e) => {
            touching.current = false;
            settleSoon(e.currentTarget);
          }}
          onScroll={(e) => {
            if (Date.now() >= autoScroll.current) settleSoon(e.currentTarget);
            if (Date.now() < autoScroll.current) return;
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== index) setIndex(i);
          }}
        >
          {posts.map((f) => (
            <div key={f.properties.id} className="story-face relative h-full w-full shrink-0 snap-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(f.properties.photo_path)}
                alt={f.properties.caption ?? CATEGORIES[f.properties.category].label}
                className="h-full w-full object-cover"
                draggable={false}
              />
              <div className="story-dim" />
            </div>
          ))}
        </div>

        <div className="story-blur-topo" />
        <div className="story-blur-base" />

        {/* Toque: esquerda volta, direita avança; segurar pausa */}
        <div
          className="absolute inset-x-0 top-20 bottom-[34%] flex"
          onPointerDown={() => {
            // na hora do toque (não num efeito depois): o clique chega antes
            pressAt.current = Date.now();
            setHeld(true);
          }}
          onPointerUp={() => setHeld(false)}
          onPointerCancel={() => setHeld(false)}
          onPointerLeave={() => setHeld(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button type="button" aria-label="Story anterior" className="h-full w-2/5 cursor-w-resize [-webkit-tap-highlight-color:transparent]" onClick={() => tapGo(-1)} />
          <button type="button" aria-label="Próximo story" className="h-full flex-1 cursor-e-resize [-webkit-tap-highlight-color:transparent]" onClick={() => tapGo(1)} />
        </div>

        {/* Topo: barras (uma por post; a atual enche e passa sozinha) e cabeçalho */}
        <div className="absolute inset-x-0 top-0 flex flex-col gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex gap-1" aria-hidden="true">
            {segments.map((f, i) => (
              <span key={f.properties.id} className="story-barra">
                {i === index ? (
                  // A barra do atual enche em STORY_MS; ao terminar, passa para o próximo
                  <i
                    key={`${f.properties.id}-${round}`}
                    className="story-enche"
                    style={{ animationDuration: `${STORY_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
                    onAnimationEnd={() => {
                      // Próximo que você ainda não viu; se todos à frente já foram
                      // vistos, segue para o próximo mesmo assim (para só no último)
                      const j = posts.findIndex((x, k) => k > index && !seenAtOpen.has(x.properties.id));
                      if (j > index) go(j - index);
                      else if (index < posts.length - 1) go(1);
                    }}
                  />
                ) : (
                  <i style={{ width: i < index ? "100%" : "0%" }} />
                )}
              </span>
            ))}
          </div>
          <div key={`topo-${p.id}`} className="story-entra flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-[1.5px]"
              style={{ borderColor: color, color, background: `color-mix(in oklab, ${color} 22%, transparent)` }}
            >
              <CategoryIcon category={p.category} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">{promo ? (p.business_name ?? cat.label) : cat.label}</p>
              <p className="rotulo text-ink/85 [text-shadow:0_1px_6px_rgb(0_0_0/0.7)]">
                {archive ? (
                  <>
                    registrado em <span className="num text-ink">{registered(p.created_at)}</span>
                  </>
                ) : (
                  <>
                    {timeAgo(p.created_at, now)}
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
        <div
          key={`base-${p.id}`}
          className="story-entra absolute inset-x-0 bottom-0 flex flex-col gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          {(promo || rank || fresh || archive) && (
            <div className="flex flex-wrap gap-2">
              {promo && <Tag kind="divulgacao" />}
              {rank && <Tag kind="alta" rank={rank} />}
              {fresh && <Tag kind="agora" />}
              {archive && <span className="tag tag-divulgacao">Histórico</span>}
            </div>
          )}
          {p.caption && (
            <p className="font-display text-2xl font-bold leading-tight [text-shadow:0_1px_10px_rgb(0_0_0/0.55)]">{p.caption}</p>
          )}
          {meta.length > 0 && <p className="rotulo text-ink/85 [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">{meta.join(" · ")}</p>}

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
