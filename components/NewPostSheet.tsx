"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { compressPhoto } from "@/lib/image/compress";
import { CATEGORIES, CATEGORY_KEYS, type Category } from "@/lib/categories";
import { useLocation } from "@/lib/useLocation";
import Sheet from "./Sheet";

// Precisão em metros: até GOOD é "ok"; até MAX posta com aviso de aproximada.
// No celular com GPS costuma dar 5-30 m; em notebook (Wi-Fi) 30-150 m ou mais.
const GOOD_ACCURACY_M = 100;
const MAX_ACCURACY_M = 500;

export default function NewPostSheet({ onClose, onPosted }: { onClose: () => void; onPosted: (at: [number, number]) => void }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [caption, setCaption] = useState("");
  const { position, error: geoError, elapsed, retry } = useLocation();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const accurate = position !== null && position.accuracy <= MAX_ACCURACY_M;
  const meters = position ? Math.round(position.accuracy) : 0;
  const busy = status !== null;
  const canSubmit = photo && category && accurate && !busy;

  async function submit() {
    if (!photo || !category || !position) return;
    const supabase = getSupabase();
    setError(null);
    try {
      setStatus("Preparando a foto…");
      const blob = await compressPhoto(photo);

      setStatus("Conferindo a localização…");
      const { data, error: createError } = await supabase.rpc("create_post", {
        p_lat: position.lat,
        p_lng: position.lng,
        p_category: category,
        p_caption: caption,
      });
      if (createError) throw createError;
      const { id, photo_path } = data as { id: string; photo_path: string };

      setStatus("Enviando a foto…");
      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(photo_path, blob, { contentType: blob.type, upsert: false });
      if (uploadError) throw uploadError;

      setStatus("Publicando…");
      const { error: publishError } = await supabase.rpc("publish_post", { p_id: id });
      if (publishError) throw publishError;

      onPosted([position.lng, position.lat]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível postar");
      setStatus(null);
    }
  }

  return (
    <Sheet title="O que está acontecendo aqui?" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Prévia da foto" className="h-full w-full object-cover" />
          ) : (
            <span className="text-neutral-500">📷 Tirar foto</span>
          )}
          {/* capture abre direto a câmera no celular: a foto tem que ser tirada na hora */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((key) => {
            const c = CATEGORIES[key];
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`rounded-full border px-3 py-1.5 text-sm ${active ? "border-transparent text-white" : "border-neutral-300 dark:border-neutral-700"}`}
                style={active ? { backgroundColor: c.color } : undefined}
              >
                {c.emoji} {c.label}
              </button>
            );
          })}
        </div>

        <div>
          <textarea
            maxLength={140}
            rows={2}
            placeholder="Conte rapidinho o que está rolando (opcional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
          <p className="text-right text-xs text-neutral-500">{caption.length}/140</p>
        </div>

        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {geoError ? (
            <p className="text-red-600">
              {geoError}{" "}
              <button type="button" onClick={retry} className="font-medium underline">
                Tentar de novo
              </button>
            </p>
          ) : position === null ? (
            <p>
              📡 Buscando sua localização… ({elapsed}s)
              {elapsed >= 15 && (
                <span className="mt-1 block">
                  Está demorando. Confira se a localização está liberada para o site e para o navegador nos ajustes do
                  aparelho.
                </span>
              )}
            </p>
          ) : position.accuracy <= GOOD_ACCURACY_M ? (
            <p>📍 Localização ok (±{meters} m)</p>
          ) : accurate ? (
            <p className="text-amber-600">⚠️ Localização aproximada (±{meters} m). O pin pode ficar um pouco fora do lugar.</p>
          ) : (
            <p>
              📡 Precisão baixa (±{meters} m), esperando melhorar…
              {elapsed >= 20 && <span className="mt-1 block">No celular, ative a localização precisa (GPS).</span>}
            </p>
          )}
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-lg bg-blue-600 py-3 font-medium text-white disabled:opacity-50"
        >
          {status ?? "Postar (some em 12h)"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Sheet>
  );
}
