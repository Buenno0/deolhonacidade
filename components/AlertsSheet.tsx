"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES, CATEGORY_KEYS, type Category } from "@/lib/categories";
import { currentSubscription, pushSupport, subscribe, unsubscribe } from "@/lib/push";
import { formatDistance } from "@/lib/posts";
import Sheet from "./Sheet";
import { Button, Chip, Spinner } from "./ui";
import { CategoryIcon, LocateIcon, PinIcon } from "./ui/icons";
import { errorMessage } from "@/lib/errors";

const RADII = [500, 1000, 3000];

type Props = {
  getMapCenter: () => [number, number] | null;
  onClose: () => void;
  onSaved: (text: string) => void;
};

// Alertas por área: "me avisa quando tiver alagamento a 1 km de casa".
// O ponto é a sua localização agora ou o centro do mapa; nada sai do aparelho
// além desse ponto, do raio e das categorias.
export default function AlertsSheet({ getMapCenter, onClose, onSaved }: Props) {
  const support = pushSupport();
  const [where, setWhere] = useState<"aqui" | "mapa">("aqui");
  const [radius, setRadius] = useState(1000);
  const [cats, setCats] = useState<Category[]>([]);
  const [requests, setRequests] = useState(true);
  const [active, setActive] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Já tem alerta neste aparelho? Carrega a configuração salva
  useEffect(() => {
    if (support !== "ok") return;
    let off = false;
    currentSubscription().then(async (sub) => {
      if (!sub) return !off && setActive(false);
      const { data } = await getSupabase().rpc("my_push_subscription", { p_endpoint: sub.endpoint });
      if (off) return;
      if (data) {
        setRadius(data.radius_m);
        setCats(data.categories ?? []);
        setRequests(data.requests);
      }
      setActive(Boolean(data));
    });
    return () => {
      off = true;
    };
  }, [support]);

  async function point(): Promise<[number, number]> {
    if (where === "mapa") {
      const c = getMapCenter();
      if (!c) throw new Error("O mapa ainda não carregou");
      return c;
    }
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve([p.coords.longitude, p.coords.latitude]),
        () => reject(new Error("Sem acesso à localização. Escolha \"Onde o mapa está\".")),
        { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
      ),
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const at = await point();
      const sub = await subscribe();
      const { error } = await getSupabase().rpc("save_push_subscription", {
        p_endpoint: sub.endpoint,
        p_p256dh: sub.keys?.p256dh,
        p_auth: sub.keys?.auth,
        p_lat: at[1],
        p_lng: at[0],
        p_radius_m: radius,
        p_categories: cats.length ? cats : null,
        p_requests: requests,
      });
      if (error) throw error;
      onSaved(`Alertas ligados · ${formatDistance(radius)} ${where === "aqui" ? "de você" : "do ponto"}`);
    } catch (e) {
      setError(errorMessage(e, "Não foi possível ligar os alertas"));
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    const endpoint = await unsubscribe();
    if (endpoint) await getSupabase().rpc("delete_push_subscription", { p_endpoint: endpoint });
    setBusy(false);
    onSaved("Alertas desligados");
  }

  const toggleCat = (c: Category) => setCats((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));

  if (support !== "ok") {
    return (
      <Sheet eyebrow="Alertas" title="Avisos perto de você" onClose={onClose}>
        <p className="text-sm text-muted">
          {support === "ios-instalar"
            ? "No iPhone, os avisos só funcionam com o app na tela de início. Toque em Compartilhar no Safari, depois em \"Adicionar à Tela de Início\", e abra o De Olho por lá."
            : support === "desligado"
              ? "Os avisos ainda não estão configurados neste servidor."
              : "Este navegador não recebe notificações. Tente o Chrome ou o Safari atualizados."}
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet eyebrow="Alertas" title="Me avisa quando acontecer algo perto" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <fieldset>
          <legend className="rotulo mb-2">Onde</legend>
          <div className="flex flex-wrap gap-2">
            <Chip type="button" active={where === "aqui"} onClick={() => setWhere("aqui")} className="py-2 text-sm">
              <LocateIcon /> Perto de mim agora
            </Chip>
            <Chip type="button" active={where === "mapa"} onClick={() => setWhere("mapa")} className="py-2 text-sm">
              <PinIcon /> Onde o mapa está
            </Chip>
          </div>
        </fieldset>

        <fieldset>
          <legend className="rotulo mb-2">Raio</legend>
          <div className="flex gap-2">
            {RADII.map((r) => (
              <Chip key={r} type="button" active={radius === r} onClick={() => setRadius(r)} className="num py-2 text-sm">
                {formatDistance(r)}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="rotulo mb-2">O quê {cats.length === 0 && "· tudo"}</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((c) => (
              <Chip key={c} type="button" active={cats.includes(c)} onClick={() => toggleCat(c)}>
                <CategoryIcon category={c} />
                {CATEGORIES[c].label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm">
          <span>
            Pedidos &quot;Alguém aí?&quot; perto
            <span className="block text-xs text-muted">Quando alguém pedir uma foto da sua área</span>
          </span>
          <input type="checkbox" checked={requests} onChange={(e) => setRequests(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
        </label>

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={save} disabled={busy || active === null} className="w-full">
            {busy && <Spinner />} {active ? "Salvar alertas" : "Ligar alertas"}
          </Button>
          {active && (
            <Button variant="fantasma" onClick={turnOff} disabled={busy}>
              Desligar alertas deste aparelho
            </Button>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </div>
    </Sheet>
  );
}
