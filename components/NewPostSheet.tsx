"use client";

import { useEffect, useMemo, useState } from "react";
import { preparePhoto } from "@/lib/image/compress";
import { submitPost } from "@/lib/posting";
import { CATEGORIES, CATEGORY_KEYS, LIFETIME_HOURS, type Category } from "@/lib/categories";
import { useLocation } from "@/lib/useLocation";
import Sheet from "./Sheet";
import { Button, Chip, Spinner } from "./ui";
import { AlertIcon, CameraIcon, CategoryIcon, PinIcon } from "./ui/icons";

// Precisão em metros: até GOOD é "ok"; até MAX posta com aviso de aproximada.
// No celular com GPS costuma dar 5-30 m; em notebook (Wi-Fi) 30-150 m ou mais.
const GOOD_ACCURACY_M = 100;
const MAX_ACCURACY_M = 500;

type Props = {
  // Respondendo a um "Alguém aí?": a pergunta aparece no topo
  request?: { id: string; question: string } | null;
  onClose: () => void;
  // Tentou postar de fora da cidade: o Home mostra o aviso de fora da área
  onOutOfArea?: (at: [number, number]) => void;
  onPosted: (id: string, at: [number, number], accuracy: number) => void;
  // Estabelecimento aprovado: libera a divulgação
  business?: { name: string } | null;
};

export default function NewPostSheet({ request, onClose, onOutOfArea, onPosted, business }: Props) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [caption, setCaption] = useState("");
  const [keepHistory, setKeepHistory] = useState(false);
  const promo = category === "estabelecimento";
  const { position, error: geoError, elapsed, retry } = useLocation();
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const usable = position !== null && position.accuracy <= MAX_ACCURACY_M;
  const meters = position ? Math.round(position.accuracy) : 0;
  const busy = step !== null;
  const missing = !photo ? "Tire a foto" : !category ? "Escolha o que é" : !usable ? "Aguardando localização" : null;

  async function submit() {
    if (!photo || !category || !position) return;
    setError(null);
    try {
      setStep("Preparando a foto…");
      const prepared = await preparePhoto(photo);
      const id = await submitPost(
        {
          lat: position.lat,
          lng: position.lng,
          category,
          caption,
          requestId: request?.id ?? null,
          keepHistory: keepHistory && !promo,
          ...prepared,
        },
        setStep,
      );
      onPosted(id, [position.lng, position.lat], position.accuracy);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Não foi possível publicar";
      if (onOutOfArea && /dentro da cidade/.test(message)) return onOutOfArea([position.lng, position.lat]);
      setError(message);
      setStep(null);
    }
  }

  return (
    <Sheet
      eyebrow={request ? "Respondendo" : "Novo registro"}
      title={request ? request.question : "O que está acontecendo aqui?"}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {/* A foto: tirada na hora, é o post */}
        <label className="relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-line bg-elev text-muted transition hover:text-ink">
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Prévia da foto" className="absolute inset-0 h-full w-full object-cover" />
              <span className="sala-escura absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs text-ink">
                Tirar outra
              </span>
            </>
          ) : (
            <>
              <CameraIcon width="2.25em" height="2.25em" />
              <span className="font-display text-base font-semibold text-ink">Tirar foto</span>
              <span className="rotulo">tem que ser de agora</span>
            </>
          )}
          {/* capture abre direto a câmera no celular */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>

        <fieldset>
          <legend className="rotulo mb-2">O que é</legend>
          <div className="flex flex-wrap gap-2">
            {business && !request && (
              <Chip type="button" active={promo} onClick={() => setCategory("estabelecimento")} className="py-2 text-sm">
                <CategoryIcon category="estabelecimento" />
                Divulgação · {business.name}
              </Chip>
            )}
            {CATEGORY_KEYS.map((key) => (
              <Chip key={key} type="button" active={category === key} onClick={() => setCategory(key)} className="py-2 text-sm">
                <CategoryIcon category={key} />
                {CATEGORIES[key].label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="flex justify-between">
            <span className="rotulo">Legenda (opcional)</span>
            <span className="num text-[10px] text-muted">{caption.length}/140</span>
          </span>
          <textarea
            maxLength={140}
            rows={2}
            placeholder="Conte rapidinho o que está rolando"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-base outline-none transition focus:border-accent"
          />
        </label>

        {promo ? (
          <p className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-muted">
            Aparece no mapa com a tag Divulgação e o nome do estabelecimento. Uma por dia, tirada no endereço cadastrado.
          </p>
        ) : (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={keepHistory}
              onChange={(e) => setKeepHistory(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              <span className="font-medium text-ink">Guardar no histórico por 30 dias</span>
              <span className="mt-0.5 block text-muted">
                Depois de sumir do mapa, a foto fica no histórico da cidade. Você tira quando quiser em Meus posts.
              </span>
            </span>
          </label>
        )}

        {/* Localização */}
        <div className="flex items-start gap-3 rounded-xl border border-line bg-bg px-3 py-2.5 text-sm">
          <span className="mt-0.5">
            {geoError ? (
              <AlertIcon className="text-danger" />
            ) : position === null ? (
              <Spinner />
            ) : (
              <PinIcon className={position.accuracy <= GOOD_ACCURACY_M ? "text-ok" : "text-warn"} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            {geoError ? (
              <p className="text-danger">
                {geoError}{" "}
                <button type="button" onClick={retry} className="font-medium underline underline-offset-2">
                  Tentar de novo
                </button>
              </p>
            ) : position === null ? (
              <p className="text-muted">
                Buscando sua localização… <span className="num">{elapsed}s</span>
                {elapsed >= 15 && (
                  <span className="mt-1 block">
                    Está demorando. Confira se a localização está liberada para o site e para o navegador nos ajustes do
                    aparelho.
                  </span>
                )}
              </p>
            ) : position.accuracy <= GOOD_ACCURACY_M ? (
              <p>
                Localização ok <span className="num text-muted">±{meters} m</span>
              </p>
            ) : usable ? (
              <p className="text-warn">
                Localização aproximada <span className="num">±{meters} m</span>. O pin pode ficar um pouco fora do lugar.
              </p>
            ) : (
              <p className="text-muted">
                Precisão baixa <span className="num">±{meters} m</span>, esperando melhorar…
                {elapsed >= 20 && <span className="mt-1 block">No celular, ative a localização precisa (GPS).</span>}
              </p>
            )}
          </div>
        </div>

        <div>
          <Button size="lg" onClick={submit} disabled={Boolean(missing) || busy} className="w-full">
            {busy ? (
              <>
                <Spinner />
                {step}
              </>
            ) : (
              (missing ?? `${promo ? "Publicar divulgação" : "Publicar"} · some em ${LIFETIME_HOURS[category!]}h`)
            )}
          </Button>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      </div>
    </Sheet>
  );
}
