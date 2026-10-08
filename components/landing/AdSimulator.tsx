"use client";

import { useState } from "react";
import { Tag } from "@/components/ui/Tag";
import { SHOP_KINDS, ShopScene, type ShopKind } from "./scenes";
import { useNear } from "./useNear";
import { useT } from "./lang";

// Simulador da divulgação: escolha o tipo de negócio, escreva a oferta e veja
// o pin pousando no mapa e o story que aparece pra quem passa perto. As ofertas
// de exemplo estão no i18n (ad.offers); o letreiro da ilustração não muda.

export default function AdSimulator() {
  const T = useT();
  const t = T.ad;
  const [kind, setKind] = useState<ShopKind>("padaria");
  const [offer, setOffer] = useState(t.offers.padaria);
  const [touched, setTouched] = useState(false);
  const [nearRef, near] = useNear<HTMLDivElement>();

  const pick = (k: ShopKind) => {
    setKind(k);
    if (!touched) setOffer(t.offers[k]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.type}>
        {(Object.keys(SHOP_KINDS) as ShopKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => pick(k)}
            className="min-h-10 cursor-pointer rounded-full border px-3.5 text-sm transition"
            style={kind === k ? { borderColor: "var(--accent)", color: "var(--accent-ink)", background: "var(--accent)" } : { borderColor: "var(--line)", color: "var(--muted)" }}
          >
            {t.kinds[k]}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5 text-sm text-muted">
        {t.offer}
        <input
          value={offer}
          maxLength={60}
          onChange={(e) => {
            setTouched(true);
            setOffer(e.target.value);
          }}
          className="min-h-12 w-full rounded-lg border border-line bg-bg px-3.5 text-base text-ink outline-none transition focus:border-accent"
        />
      </label>

      <div ref={nearRef} className="relative overflow-hidden rounded-xl border border-line" style={{ aspectRatio: "16 / 10" }}>
        {near && <ShopScene kind={kind} className="lp-cena" title={t.scene(t.kinds[kind])} />}
        <span className="lp-viram lp-rot absolute bottom-10 left-3 rounded-full px-2.5 py-1" style={{ background: "rgba(12,10,8,.8)", color: "var(--ok)" }}>
          {t.seen}
        </span>
      </div>
      <div key={kind + offer} className="story-entra sala-escura -mt-8 mx-3 relative flex flex-col gap-2 rounded-xl border border-line p-3" style={{ background: "rgba(12,10,8,.9)", backdropFilter: "blur(6px)" }}>
          <span className="flex items-center gap-2">
            <Tag kind="divulgacao" label={T.tags.divulgacao} />
            <span className="lp-rot whitespace-nowrap">{t.distance}</span>
          </span>
          <p className="lp-disp m-0 text-lg leading-tight text-ink">{offer || t.placeholder}</p>
          <span className="flex gap-2">
            <span className="story-pill story-vidro !px-3 text-xs">{t.directions}</span>
            <span className="story-pill story-vidro !px-3 text-xs">WhatsApp</span>
          </span>
      </div>
    </div>
  );
}
