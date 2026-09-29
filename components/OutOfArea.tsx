"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { NearestCity } from "@/lib/cityCheck";
import { Button } from "./ui";
import { CloseIcon, PinIcon } from "./ui/icons";
import Mark from "./ui/Mark";

type Props = {
  nearest: NearestCity;
  from: [number, number];
  onGo: () => void;
  onClose: () => void;
};

// Quem abre o app longe de uma cidade atendida: explica sem culpa, leva para
// a cidade mais próxima e deixa registrar o interesse (anônimo, por região).
export default function OutOfArea({ nearest, from, onGo, onClose }: Props) {
  const [asked, setAsked] = useState(false);
  const far = nearest.km >= 1 ? `a ${nearest.km.toLocaleString("pt-BR")} km de você` : "bem perto de você";

  async function want() {
    setAsked(true);
    await getSupabase().rpc("register_interest", { p_lat: from[1], p_lng: from[0] });
  }

  return (
    <div className="pointer-events-auto relative mx-auto w-full max-w-lg rounded-2xl border border-line bg-surface p-5">
      <button
        aria-label="Fechar"
        onClick={onClose}
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-elev hover:text-ink"
      >
        <CloseIcon />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <Mark size={40} className="mt-0.5 shrink-0" />
        <div>
          <p className="rotulo">fora da área</p>
          <h2 className="font-display text-lg font-semibold leading-snug">O De Olho ainda não chegou aí</h2>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">
        Por enquanto estamos em{" "}
        <span className="text-ink">
          {nearest.name}/{nearest.uf}
        </span>
        , {far}. Enquanto isso, dá para ver o que está rolando por lá.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Button size="lg" onClick={onGo} className="w-full">
          <PinIcon /> Ver {nearest.name}
        </Button>
        <Button variant="secundario" onClick={want} disabled={asked}>
          {asked ? "Anotado. Isso ajuda a escolher a próxima cidade" : "Quero o De Olho na minha cidade"}
        </Button>
      </div>
    </div>
  );
}
