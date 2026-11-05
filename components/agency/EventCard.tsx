"use client";

import Link from "next/link";
import { CATEGORIES, severityVar } from "@/lib/categories";
import { thumbUrl } from "@/lib/media";
import { ago, coord, dateTime, mapsUrl, trust, type AgencyEvent } from "@/lib/agency/types";
import { cx } from "@/components/ui";

const TONE: Record<string, string> = {
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
  muted: "text-muted",
};

// Uma ocorrência na lista do painel. Tudo que a pessoa precisa para decidir
// mandar equipe está escrito: o quê, onde, quando chegou e se alguém que
// estava perto confirmou.
export default function EventCard({
  event,
  active,
  onSelect,
}: {
  event: AgencyEvent;
  active?: boolean;
  onSelect?: (id: string) => void;
}) {
  const cat = CATEGORIES[event.category];
  const t = trust(event);

  return (
    <li
      className={cx(
        "rounded-none border bg-surface p-3 transition",
        active ? "border-accent" : "border-line",
      )}
    >
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onSelect?.(event.id)}
          className="shrink-0"
          aria-label={`Ver ${cat.label} no mapa`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbUrl(event.photo_path)}
            alt=""
            width={72}
            height={72}
            loading="lazy"
            className="rounded-none border-2 object-cover"
            style={{ borderColor: severityVar(event.category), height: 72, width: 72 }}
          />
        </button>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display font-semibold" style={{ color: severityVar(event.category) }}>
              {cat.label}
            </span>
            <span className="text-xs text-muted">
              {ago(event.created_at)} · {dateTime(event.created_at)}
            </span>
            {event.live ? (
              <span className="legenda text-ok">no ar</span>
            ) : (
              <span className="legenda text-muted">encerrada</span>
            )}
          </p>

          {event.caption && <p className="mt-0.5 text-sm">{event.caption}</p>}

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className={TONE[t.tone]}>{t.label}</span>
            {event.answers_request && <span className="text-muted">resposta a um pedido</span>}
            <a href={mapsUrl(event.lat, event.lng)} target="_blank" rel="noreferrer" className="font-mono text-muted underline hover:text-accent">
              {coord(event.lat, event.lng)}
            </a>
            <Link href={`/defesa-civil/evento/${event.id}`} className="text-accent underline">
              ficha
            </Link>
          </p>
        </div>
      </div>
    </li>
  );
}
