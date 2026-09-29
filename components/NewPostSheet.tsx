"use client";

import { useEffect, useState } from "react";
import { preparePhoto } from "@/lib/image/compress";
import { submitPost } from "@/lib/posting";
import { CATEGORIES, CATEGORY_KEYS, LIFETIME_HOURS, type Category } from "@/lib/categories";
import { useLocation } from "@/lib/useLocation";
import Sheet from "./Sheet";
import { Button, Chip, Spinner } from "./ui";
import { AlertIcon, CameraIcon, CategoryIcon, PinIcon } from "./ui/icons";
import { errorMessage } from "@/lib/errors";

// Precisão em metros: até GOOD é "ok"; até MAX posta com aviso de aproximada.
// No celular com GPS costuma dar 5-30 m; em notebook (Wi-Fi) 30-150 m ou mais.
const GOOD_ACCURACY_M = 100;
const MAX_ACCURACY_M = 500;

// As mais usadas primeiro, numa linha só
const ORDER: Category[] = ["evento", "transito", "acidente", "alagamento", "seguranca", "falta_energia", "obra", "outro"].filter((c) =>
  CATEGORY_KEYS.includes(c as Category),
) as Category[];

type Props = {
  // Respondendo a um "Alguém aí?": a pergunta aparece no topo
  request?: { id: string; question: string } | null;
  onClose: () => void;
  // Tentou postar de fora da cidade: o Home mostra o aviso de fora da área
  onOutOfArea?: (at: [number, number]) => void;
  onPosted: (id: string, at: [number, number], accuracy: number, processing: boolean) => void;
  // Estabelecimento aprovado: libera a divulgação
  business?: { name: string } | null;
  // Foto já tirada pelo botão Registrar (câmera primeiro)
  initialPhoto?: File | null;
};

export default function NewPostSheet({ request, onClose, onOutOfArea, onPosted, business, initialPhoto = null }: Props) {
  const [photo, setPhoto] = useState<File | null>(initialPhoto);
  const [category, setCategory] = useState<Category | null>(null);
  const [caption, setCaption] = useState("");
  const [keepHistory, setKeepHistory] = useState(false);
  const promo = category === "estabelecimento";
  const { position, error: geoError, elapsed, retry } = useLocation();
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // O endereço da prévia nasce e morre no mesmo efeito (a montagem dupla do
  // React em desenvolvimento não pode revogar o endereço em uso)
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    Promise.resolve().then(() => setPreview(url));
    return () => URL.revokeObjectURL(url);
  }, [photo]);

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
      const { id, processing } = await submitPost(
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
      onPosted(id, [position.lng, position.lat], position.accuracy, processing);
    } catch (e) {
      const message = errorMessage(e, "Não foi possível publicar");
      if (onOutOfArea && /dentro da cidade/.test(message)) return onOutOfArea([position.lng, position.lat]);
      setError(message);
      setStep(null);
    }
  }

  const locationLine = geoError ? (
    <span className="text-danger">
      {preview ? "Localização bloqueada. Libere para este site nos ajustes do navegador." : geoError}{" "}
      <button type="button" onClick={retry} className="font-medium underline underline-offset-2">
        Tentar de novo
      </button>
    </span>
  ) : position === null ? (
    <span className="text-muted">
      Buscando sua localização… <span className="num">{elapsed}s</span>
      {elapsed >= 15 && " · confira se a localização está liberada para o site"}
    </span>
  ) : position.accuracy <= GOOD_ACCURACY_M ? (
    <span>
      Localização ok <span className="num text-muted">±{meters} m</span>
    </span>
  ) : usable ? (
    <span className="text-warn">
      Aproximada <span className="num">±{meters} m</span>
    </span>
  ) : (
    <span className="text-muted">
      Precisão baixa <span className="num">±{meters} m</span>, esperando melhorar…
    </span>
  );

  const cameraInput = (
    <input
      type="file"
      accept="image/*"
      capture="environment"
      className="sr-only"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) setPhoto(f);
      }}
    />
  );

  return (
    <Sheet
      eyebrow={request ? "Respondendo" : "Novo registro"}
      title={request ? request.question : "O que está acontecendo aqui?"}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {error && <p className="text-sm text-danger">{error}</p>}
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
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* A foto é o post. Tirada: vira miniatura, para caber tudo sem rolar */}
        {preview ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Prévia da foto" className="h-24 w-24 shrink-0 rounded-xl border border-line object-cover" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              <p className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  {geoError ? (
                    <AlertIcon className="text-danger" />
                  ) : position === null ? (
                    <Spinner />
                  ) : (
                    <PinIcon className={position.accuracy <= GOOD_ACCURACY_M ? "text-ok" : "text-warn"} />
                  )}
                </span>
                {locationLine}
              </p>
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:text-ink">
                <CameraIcon /> Tirar outra
                {cameraInput}
              </label>
            </div>
          </div>
        ) : (
          <label className="flex aspect-[16/9] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-elev text-muted transition hover:text-ink">
            <CameraIcon width="2em" height="2em" />
            <span className="font-display text-base font-semibold text-ink">Tirar foto</span>
            <span className="rotulo">tem que ser de agora</span>
            {cameraInput}
          </label>
        )}

        {/* Categorias numa linha, deslizando, as mais usadas primeiro */}
        <fieldset>
          <legend className="rotulo mb-2">O que é</legend>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {business && !request && (
              <Chip type="button" active={promo} onClick={() => setCategory("estabelecimento")} className="shrink-0 py-2 text-sm">
                <CategoryIcon category="estabelecimento" />
                Divulgação · {business.name}
              </Chip>
            )}
            {ORDER.map((key) => (
              <Chip key={key} type="button" active={category === key} onClick={() => setCategory(key)} className="shrink-0 py-2 text-sm">
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
            rows={1}
            placeholder="Conte rapidinho o que está rolando"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="max-h-32 min-h-11 w-full resize-none rounded-lg border border-line bg-bg px-3 py-2.5 text-base outline-none transition [field-sizing:content] focus:border-accent"
          />
        </label>

        {promo ? (
          <p className="text-xs text-muted">Aparece com a tag Divulgação e o nome do estabelecimento. Uma por dia, no endereço cadastrado.</p>
        ) : (
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>
              Guardar no histórico por 30 dias
              <span className="block text-xs text-muted">Você tira quando quiser em Meus posts.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={keepHistory}
              onChange={(e) => setKeepHistory(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[var(--accent)]"
            />
          </label>
        )}

        {/* Sem foto ainda: a localização aparece aqui embaixo */}
        {!preview && <p className="flex items-center gap-2 text-sm">{locationLine}</p>}
      </div>
    </Sheet>
  );
}
