"use client";

import { useEffect, useState } from "react";
import { KIND_LABEL, LANDMARK_PATHS, LANDMARK_RADIUS_M, type Landmark, type WikiSummary } from "@/lib/landmarks";
import { photoUrl, thumbUrl } from "@/lib/media";
import { distance, timeAgo, type PostFeature } from "@/lib/posts";
import Sheet from "./Sheet";
import { Button, Spinner } from "./ui";
import { CameraIcon, PinIcon, QuestionIcon } from "./ui/icons";

type Props = {
  landmark: Landmark;
  posts: PostFeature[];
  onClose: () => void;
  onOpenPost: (id: string, ids: string[]) => void;
  onPostHere: () => void;
  onAskHere: () => void;
};

function useWiki(title: string | null) {
  const [w, setW] = useState<WikiSummary | null | "carregando">(title ? "carregando" : null);
  useEffect(() => {
    if (!title) return;
    let off = false;
    fetch(`/api/landmarks/wiki?title=${encodeURIComponent(title)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !off && setW(d))
      .catch(() => !off && setW(null));
    return () => {
      off = true;
    };
  }, [title]);
  return w;
}

const Glyph = ({ kind, size }: { kind: Landmark["kind"]; size: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: LANDMARK_PATHS[kind] }}
  />
);

// A ficha de um marco. Regra: foto só do próprio lugar (com autor e licença);
// texto principal só quando fala do lugar; o que é sobre quem é homenageado
// fica numa seção à parte. Nada que não venha de uma fonte.
export default function LandmarkSheet({ landmark: l, posts, onClose, onOpenPost, onPostHere, onAskHere }: Props) {
  const place = useWiki(l.wiki_title);
  const about = useWiki(l.about_title);
  const [now] = useState(() => Date.now());

  const here: [number, number] = [l.lng, l.lat];
  const nearby = posts
    .filter((f) => distance(here, f.geometry.coordinates as [number, number]) <= LANDMARK_RADIUS_M)
    .sort((a, b) => b.properties.created_at.localeCompare(a.properties.created_at));
  const p = place !== "carregando" ? place : null;
  const a = about !== "carregando" ? about : null;
  const wikidata = l.wikidata?.split(/\s+/).filter(Boolean) ?? [];

  return (
    <Sheet eyebrow={KIND_LABEL[l.kind]} title={l.name} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Fotos do próprio lugar */}
        {l.photos.length > 0 ? (
          <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1">
            {l.photos.map((ph) => (
              <figure key={ph.url} className="w-full shrink-0 snap-center overflow-hidden rounded-xl border border-line bg-elev">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ph.url} alt={l.name} className="aspect-[4/3] w-full object-cover" />
                <figcaption className="rotulo flex justify-between gap-2 px-3 py-1.5">
                  <a href={ph.page} target="_blank" rel="noreferrer" className="truncate hover:text-ink">
                    Foto: {ph.author}
                  </a>
                  <span className="shrink-0">{ph.license}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line p-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink">
              <Glyph kind={l.kind} size={26} />
            </span>
            <p className="text-sm text-muted">Ainda não temos uma foto deste lugar. As fotos de quem passa por aqui aparecem abaixo.</p>
          </div>
        )}

        {/* Fatos */}
        {(l.heritage || l.address) && (
          <div className="flex flex-col gap-2">
            {l.heritage && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent px-3 py-1 text-xs font-medium text-accent">
                <span aria-hidden="true">★</span> {l.heritage}
              </span>
            )}
            {l.address && (
              <p className="flex items-start gap-2 text-sm text-muted">
                <PinIcon className="mt-0.5 shrink-0" /> {l.address}
              </p>
            )}
          </div>
        )}

        {l.summary && <p className="text-base leading-relaxed">{l.summary}</p>}

        {/* Texto sobre o próprio lugar */}
        {place === "carregando" && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Spinner /> Buscando na Wikipédia…
          </p>
        )}
        {p?.extract && (
          <div className="rounded-xl border border-line bg-bg p-3">
            <p className="rotulo mb-1.5">Da Wikipédia</p>
            <p className="text-sm leading-relaxed">{p.extract}</p>
            <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent underline underline-offset-2">
              Ler o artigo completo
            </a>
          </div>
        )}
        {!l.summary && !l.wiki_title && (
          <p className="text-sm text-muted">Estamos escrevendo a história deste lugar. Se você conhece, ela pode aparecer aqui.</p>
        )}

        {/* Sobre quem ou o que o lugar homenageia */}
        {l.about_title && (
          <details className="group rounded-xl border border-line bg-bg">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium">
              {l.about_label ?? "Saiba mais"}
              <span className="text-muted transition group-open:rotate-90" aria-hidden="true">
                ›
              </span>
            </summary>
            <div className="border-t border-line px-3 py-3">
              {about === "carregando" ? (
                <Spinner />
              ) : a?.extract ? (
                <>
                  <p className="text-sm leading-relaxed text-muted">{a.extract}</p>
                  <a href={a.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent underline underline-offset-2">
                    Continuar na Wikipédia
                  </a>
                </>
              ) : (
                <p className="text-sm text-muted">Não foi possível carregar agora.</p>
              )}
            </div>
          </details>
        )}

        <section>
          <p className="rotulo mb-2">Agora por aqui · {LANDMARK_RADIUS_M} m</p>
          {nearby.length === 0 ? (
            <p className="text-sm text-muted">Nada registrado aqui agora.</p>
          ) : (
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {nearby.map((f) => (
                <button
                  key={f.properties.id}
                  onClick={() => onOpenPost(f.properties.id, nearby.map((x) => x.properties.id))}
                  className="flex shrink-0 flex-col items-center gap-1"
                >
                  <span className="h-20 w-20 overflow-hidden rounded-xl border border-line bg-elev">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbUrl(f.properties.photo_path)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.dataset.fallback) {
                          img.dataset.fallback = "1";
                          img.src = photoUrl(f.properties.photo_path);
                        }
                      }}
                    />
                  </span>
                  <span className="rotulo text-[9px]">{timeAgo(f.properties.created_at, now)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={onPostHere} className="w-full">
            <CameraIcon /> Registrar aqui
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secundario" onClick={onAskHere}>
              <QuestionIcon /> Perguntar
            </Button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:bg-elev"
            >
              <PinIcon /> Como chegar
            </a>
          </div>
        </div>

        <p className="rotulo leading-relaxed">
          Fontes:{" "}
          {wikidata.map((q, i) => (
            <a key={q} href={`https://www.wikidata.org/wiki/${q}`} target="_blank" rel="noreferrer" className="hover:text-ink">
              Wikidata {q}
              {i < wikidata.length - 1 ? ", " : ""}
            </a>
          ))}
          {wikidata.length > 0 && " · "}
          {l.osm ? (
            <a href={`https://www.openstreetmap.org/${l.osm}`} target="_blank" rel="noreferrer" className="hover:text-ink">
              OpenStreetMap
            </a>
          ) : (
            "OpenStreetMap"
          )}
          {(l.wiki_title || l.about_title) && " · Wikipédia (CC BY-SA 4.0)"}
        </p>
      </div>
    </Sheet>
  );
}
