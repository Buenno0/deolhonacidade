"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { BUSINESS_RADIUS_M, BUSINESS_STATUS, type Business } from "@/lib/business";
import { useLocation } from "@/lib/useLocation";
import Sheet from "./Sheet";
import { Button, Spinner, cx } from "./ui";
import { AlertIcon, PinIcon } from "./ui/icons";

type Props = {
  business: Business | null;
  onClose: () => void;
  onSaved: (b: Business) => void;
};

const field = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-base outline-none transition focus:border-accent";

// O pedido do comerciante. O ponto é onde a pessoa está agora: é dali (até
// 150 m) que as divulgações vão poder ser feitas, e a moderação confere.
export default function BusinessSheet({ business, onClose, onSaved }: Props) {
  const locked = business?.status === "approved" || business?.status === "suspended";
  return (
    <Sheet eyebrow="Estabelecimento" title={business?.name ?? "Divulgue seu estabelecimento"} onClose={onClose}>
      {business && (
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-line bg-bg p-3 text-sm">
          <p>
            Situação: <span className={cx("font-medium", BUSINESS_STATUS[business.status].tone)}>{BUSINESS_STATUS[business.status].label}</span>
          </p>
          {business.status === "pending" && <p className="text-muted">A moderação confere os dados e o endereço. Você pode corrigir o pedido enquanto isso.</p>}
          {business.status === "approved" && (
            <p className="text-muted">
              Na hora de postar, escolha &quot;Divulgação · {business.name}&quot;. Uma por dia, tirada no endereço cadastrado.
            </p>
          )}
          {business.review_note && <p className="text-muted">Nota da moderação: {business.review_note}</p>}
          {locked && <p className="text-muted">Para mudar os dados, fale com a moderação.</p>}
        </div>
      )}
      {!locked && <BusinessForm business={business} onSaved={onSaved} />}
    </Sheet>
  );
}

function BusinessForm({ business, onSaved }: { business: Business | null; onSaved: (b: Business) => void }) {
  const [name, setName] = useState(business?.name ?? "");
  const [segment, setSegment] = useState(business?.segment ?? "");
  const [address, setAddress] = useState(business?.address ?? "");
  const [whatsapp, setWhatsapp] = useState(business?.whatsapp ?? "");
  const [instagram, setInstagram] = useState(business?.instagram ?? "");
  const { position, error: geoError, elapsed, stalled, retry } = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usable = position !== null && position.accuracy <= 100;
  const missing =
    name.trim().length < 2 ? "Diga o nome" : address.trim().length < 5 ? "Diga o endereço" : !usable ? "Aguardando localização" : null;

  async function submit() {
    if (!position) return;
    setBusy(true);
    setError(null);
    const { data, error } = await getSupabase().rpc("request_business", {
      p_name: name,
      p_segment: segment,
      p_address: address,
      p_lat: position.lat,
      p_lng: position.lng,
      p_whatsapp: whatsapp,
      p_instagram: instagram,
    });
    setBusy(false);
    if (error) return setError(/check constraint/.test(error.message) ? "Confira o WhatsApp e o Instagram." : error.message);
    onSaved(data as Business);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Nome do estabelecimento</span>
        <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Segmento (opcional)</span>
        <input value={segment} maxLength={40} placeholder="Padaria, bar, loja de roupas…" onChange={(e) => setSegment(e.target.value)} className={field} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="rotulo">Endereço</span>
        <input value={address} maxLength={120} placeholder="Rua, número" onChange={(e) => setAddress(e.target.value)} className={field} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">WhatsApp (opcional)</span>
          <input value={whatsapp} inputMode="tel" placeholder="15 99999-9999" onChange={(e) => setWhatsapp(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="rotulo">Instagram (opcional)</span>
          <input value={instagram} placeholder="@seuperfil" onChange={(e) => setInstagram(e.target.value)} className={field} />
        </label>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm">
        <span className="mt-0.5">
          {geoError ? <AlertIcon className="text-danger" /> : position === null ? <Spinner /> : <PinIcon className={usable ? "text-ok" : "text-warn"} />}
        </span>
        <p className="min-w-0 flex-1 text-muted">
          {geoError ? (
            <>
              {geoError}{" "}
              <button type="button" onClick={retry} className="font-medium text-ink underline underline-offset-2">
                Tentar de novo
              </button>
            </>
          ) : position === null && stalled ? (
            <>
              A localização não chegou.{" "}
              <button type="button" onClick={retry} className="font-medium text-ink underline underline-offset-2">
                Permitir localização
              </button>
            </>
          ) : position === null ? (
            <>
              Buscando sua localização… <span className="num">{elapsed}s</span>
            </>
          ) : usable ? (
            <>
              Faça o pedido de dentro do estabelecimento: as divulgações só saem até {BUSINESS_RADIUS_M} m daqui.{" "}
              <span className="num">±{Math.round(position.accuracy)} m</span>
            </>
          ) : (
            <>
              Precisão baixa <span className="num">±{Math.round(position.accuracy)} m</span>, esperando melhorar…
            </>
          )}
        </p>
      </div>

      <Button size="lg" onClick={submit} disabled={Boolean(missing) || busy} className="w-full">
        {busy && <Spinner />}
        {missing ?? (business ? "Reenviar pedido" : "Pedir verificação")}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
      <p className="text-xs text-muted">
        A divulgação aparece no mapa com a tag Divulgação e o nome do estabelecimento, some em 12 horas e não entra no Trends nem no
        histórico.
      </p>
    </div>
  );
}
