"use client";

import { severityVar } from "@/lib/categories";
import { photoUrl, thumbUrl } from "@/lib/media";
import { isFresh, remaining, timeAgo, type PostFeature } from "@/lib/posts";
import { useDragScroll } from "@/lib/useDragScroll";

// Os posts mais recentes, como fila de "stories". Mesmo anel de tempo do pin.
export default function LiveStrip({ posts, onOpen, seen }: { posts: PostFeature[]; onOpen: (id: string) => void; seen?: Set<string> }) {
  const faixa = useDragScroll();
  if (posts.length === 0) return null;
  // Como no Instagram: os que você ainda não viu primeiro; os vistos com anel cinza
  const ordered = seen ? [...posts.filter((f) => !seen.has(f.properties.id)), ...posts.filter((f) => seen.has(f.properties.id))] : posts;
  return (
    <div ref={faixa} className="no-scrollbar -mx-4 flex select-none gap-3 overflow-x-auto px-4 pb-1 pt-1">
      {ordered.map((f) => {
        const p = f.properties;
        const viewed = seen?.has(p.id) ?? false;
        return (
          <button
            key={p.id}
            onClick={() => onOpen(p.id)}
            className="sala-escura flex shrink-0 flex-col items-center gap-1"
            aria-label={`Ver post de ${timeAgo(p.created_at)}`}
          >
            <span
              className="pin pin-mini"
              data-novo={!viewed && p.category !== "estabelecimento" && isFresh(p.created_at) ? "sim" : "nao"}
              data-divulgacao={p.category === "estabelecimento" ? "sim" : "nao"}
              style={
                {
                  "--sev": viewed ? "var(--muted)" : p.category === "estabelecimento" ? "var(--ink)" : severityVar(p.category),
                  "--restante": remaining(p),
                } as React.CSSProperties
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl(p.photo_path)}
                alt=""
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = "1";
                    img.src = photoUrl(p.photo_path);
                  }
                }}
              />
            </span>
            <span className="rotulo rounded-full bg-black/55 px-1.5 text-[9px] text-ink">{timeAgo(p.created_at)}</span>
          </button>
        );
      })}
    </div>
  );
}
