"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, isSpecial, severityVar } from "@/lib/categories";
import { photoUrl, thumbUrl } from "@/lib/media";
import { engagement, hotness, isFresh, remaining, timeAgo, timeLeftShort, trendingRanks, type PostFeature } from "@/lib/posts";
import { Tag } from "./ui/Tag";
import { Chip, EmptyState } from "./ui";
import { CategoryIcon, CheckIcon, EyeIcon, ShareIcon } from "./ui/icons";

type Sort = "alta" | "vistos" | "confirmados";

const SORTS: { id: Sort; label: string; key: (f: PostFeature, now: number) => number }[] = [
  { id: "alta", label: "Em alta", key: (f, now) => hotness(f.properties, now) },
  { id: "vistos", label: "Mais vistos", key: (f) => f.properties.view_count },
  { id: "confirmados", label: "Mais confirmados", key: (f) => f.properties.confirm_count },
];

type Props = {
  posts: PostFeature[];
  onOpen: (id: string, ordered: string[]) => void;
};

function Metrics({ p }: { p: PostFeature["properties"] }) {
  return (
    <span className="rotulo flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-flex items-center gap-1">
        <EyeIcon width="1.1em" height="1.1em" /> <span className="num text-ink">{p.view_count}</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <CheckIcon width="1.1em" height="1.1em" /> <span className="num text-ink">{p.confirm_count}</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <ShareIcon width="1.1em" height="1.1em" /> <span className="num text-ink">{p.share_count}</span>
      </span>
    </span>
  );
}

const Thumb = ({ path, className }: { path: string; className: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={thumbUrl(path)}
    alt=""
    className={className}
    onError={(e) => {
      const img = e.currentTarget;
      if (!img.dataset.fallback) {
        img.dataset.fallback = "1";
        img.src = photoUrl(path);
      }
    }}
  />
);

// Trends: o que está chamando atenção agora, entre os posts no ar.
export default function TrendsView({ posts, onOpen }: Props) {
  const [sort, setSort] = useState<Sort>("alta");
  const [now] = useState(() => Date.now());

  const ranked = useMemo(() => {
    const key = SORTS.find((s) => s.id === sort)!.key;
    // Divulgação não concorre no Trends
    return posts
      .filter((f) => !isSpecial(f.properties.category))
      .filter((f) => sort === "alta" || key(f, now) > 0)
      .sort((a, b) => key(b, now) - key(a, now) || engagement(b.properties) - engagement(a.properties));
  }, [posts, sort, now]);
  const ids = ranked.map((f) => f.properties.id);
  const ranks = useMemo(() => trendingRanks(posts, now), [posts, now]);
  const tags = (p: PostFeature["properties"]) => (
    <>
      {ranks.get(p.id) && <Tag kind="alta" rank={ranks.get(p.id)} />}
      {isFresh(p.created_at, now) && <Tag kind="agora" />}
    </>
  );
  const [first, ...rest] = ranked;

  return (
    <div className="flex flex-col gap-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {SORTS.map((s) => (
          <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>
            {s.label}
          </Chip>
        ))}
      </div>

      {!first ? (
        <EmptyState title={sort === "alta" ? "Nada no ar agora" : "Ninguém interagiu ainda"}>
          {sort === "alta"
            ? "Quando alguém registrar algo, aparece aqui."
            : "Os posts sobem aqui conforme as pessoas veem, confirmam e compartilham."}
        </EmptyState>
      ) : (
        <>
          {/* O primeiro lugar, grande */}
          <button
            onClick={() => onOpen(first.properties.id, ids)}
            className="sala-escura relative overflow-hidden rounded-2xl border border-line bg-black text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(first.properties.photo_path)} alt="" className="aspect-[16/10] w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-16">
              <div className="flex items-center gap-2">
                <span className="num text-2xl font-medium text-accent">#1</span>
                <span className="inline-flex items-center gap-1.5" style={{ color: severityVar(first.properties.category) }}>
                  <CategoryIcon category={first.properties.category} />
                  <span className="rotulo" style={{ color: "inherit" }}>
                    {CATEGORIES[first.properties.category].label}
                  </span>
                </span>
                {tags(first.properties)}
              </div>
              {first.properties.caption && (
                <p className="mt-1 font-display text-lg font-semibold leading-snug text-ink">{first.properties.caption}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <Metrics p={first.properties} />
                <span className="rotulo">
                  {timeAgo(first.properties.created_at, now)} · some em {timeLeftShort(first.properties.expires_at, now)}
                </span>
              </div>
            </div>
            <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10">
              <div className="h-full" style={{ width: `${remaining(first.properties, now) * 100}%`, background: severityVar(first.properties.category) }} />
            </div>
          </button>

          {rest.length > 0 && (
            <ol className="flex flex-col gap-2">
              {rest.map((f, i) => {
                const p = f.properties;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => onOpen(p.id, ids)}
                      className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-3 text-left transition hover:bg-elev"
                    >
                      <span className="num w-7 shrink-0 text-center text-base text-muted">{i + 2}</span>
                      <span className="sala-escura h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-elev">
                        <Thumb path={p.photo_path} className="h-full w-full object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: severityVar(p.category) }}>
                          <CategoryIcon category={p.category} width="1.1em" height="1.1em" />
                          {CATEGORIES[p.category].label}
                          <span className="text-muted">· {timeAgo(p.created_at, now)}</span>
                        </span>
                        {p.caption && <span className="block truncate text-sm text-ink">{p.caption}</span>}
                        <span className="sala-escura mt-1 flex flex-wrap gap-1.5 empty:hidden">{tags(p)}</span>
                        <span className="mt-0.5 block">
                          <Metrics p={p} />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
