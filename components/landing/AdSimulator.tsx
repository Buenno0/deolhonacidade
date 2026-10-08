"use client";

import { useState } from "react";
import { Tag } from "@/components/ui/Tag";
import { SHOP_KINDS, ShopScene, type ShopKind } from "./scenes";
import { useNear } from "./useNear";

// Simulador da divulgação: escolha o tipo de negócio, escreva a oferta e veja
// o pin pousando no mapa e o story que aparece pra quem passa perto.
const OFFERS: Record<ShopKind, string> = {
  padaria: "Pão de queijo saindo agora, 10 por R$ 8",
  bar: "Happy hour até as 20h, chope em dobro",
  loja: "Queima de estoque só hoje, até 50% off",
  evento: "Hoje tem roda de samba, entrada gratuita",
  salao: "Encaixe livre agora à tarde, corte + escova",
};

export default function AdSimulator() {
  const [kind, setKind] = useState<ShopKind>("padaria");
  const [offer, setOffer] = useState(OFFERS.padaria);
  const [touched, setTouched] = useState(false);
  const [nearRef, near] = useNear<HTMLDivElement>();

  const pick = (k: ShopKind) => {
    setKind(k);
    if (!touched) setOffer(OFFERS[k]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de negócio">
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
            {SHOP_KINDS[k].name}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5 text-sm text-muted">
        Sua oferta
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
        {near && <ShopScene kind={kind} className="lp-cena" title={`Ilustração: ${SHOP_KINDS[kind].name} com o pin de divulgação no mapa`} />}
        <span className="lp-viram lp-rot absolute bottom-10 left-3 rounded-full px-2.5 py-1" style={{ background: "rgba(12,10,8,.8)", color: "var(--ok)" }}>
          +3 viram
        </span>
      </div>
      <div key={kind + offer} className="story-entra sala-escura -mt-8 mx-3 relative flex flex-col gap-2 rounded-xl border border-line p-3" style={{ background: "rgba(12,10,8,.9)", backdropFilter: "blur(6px)" }}>
          <span className="flex items-center gap-2">
            <Tag kind="divulgacao" />
            <span className="lp-rot whitespace-nowrap">a 300 m de você</span>
          </span>
          <p className="lp-disp m-0 text-lg leading-tight text-ink">{offer || "Escreva sua oferta"}</p>
          <span className="flex gap-2">
            <span className="story-pill story-vidro !px-3 text-xs">Como chegar</span>
            <span className="story-pill story-vidro !px-3 text-xs">WhatsApp</span>
          </span>
      </div>
    </div>
  );
}
