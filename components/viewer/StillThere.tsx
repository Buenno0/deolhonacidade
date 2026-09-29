"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { timeAgo, type PostProperties } from "@/lib/posts";
import { Button, Spinner } from "../ui";
import { CheckIcon, CloseIcon } from "../ui/icons";

type Vote = Pick<PostProperties, "confirm_count" | "deny_count" | "expires_at" | "last_confirmed_at">;

type Props = {
  post: PostProperties;
  loggedIn: boolean;
  onNeedLogin: () => void;
  onVoted: (id: string, v: Vote) => void;
};

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 })
      : reject(new Error("Este navegador não informa a localização")),
  );
}

// "Ainda está rolando?": quem está perto confirma ou nega. Confirmar mantém o
// post no ar; negar encurta. O resultado aparece na hora na barra de vida.
export default function StillThere({ post, loggedIn, onNeedLogin, onVoted }: Props) {
  const [busy, setBusy] = useState<"sim" | "nao" | null>(null);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function vote(still: boolean) {
    if (!loggedIn) return onNeedLogin();
    setBusy(still ? "sim" : "nao");
    setError(null);
    try {
      const pos = await position().catch(() => {
        throw new Error("Precisamos da sua localização para saber se você está perto");
      });
      const { data, error } = await getSupabase().rpc("vote_post", {
        p_id: post.id,
        p_still: still,
        p_lat: pos.coords.latitude,
        p_lng: pos.coords.longitude,
      });
      if (error) {
        if (error.code === "23505") setAnswered(still);
        throw error;
      }
      setAnswered(still);
      onVoted(post.id, data as Vote);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível responder");
    } finally {
      setBusy(null);
    }
  }

  const summary =
    post.confirm_count > 0
      ? `${post.confirm_count} ${post.confirm_count === 1 ? "confirmou" : "confirmaram"}${post.last_confirmed_at ? ` · último ${timeAgo(post.last_confirmed_at)}` : ""}`
      : "Ninguém confirmou ainda";

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{answered === null ? "Ainda está rolando?" : "Obrigado por confirmar"}</p>
          <p className="rotulo mt-0.5">{summary}{post.deny_count > 0 ? ` · ${post.deny_count} disse que acabou` : ""}</p>
        </div>
        {answered === null ? (
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
            <Button variant="secundario" className="border-white/15 bg-white/5 px-3 py-1.5" disabled={busy !== null} onClick={() => vote(true)}>
              {busy === "sim" ? <Spinner /> : <CheckIcon className="text-ok" />} Sim
            </Button>
            <Button variant="secundario" className="border-white/15 bg-white/5 px-3 py-1.5" disabled={busy !== null} onClick={() => vote(false)}>
              {busy === "nao" ? <Spinner /> : <CloseIcon className="text-muted" />} Acabou
            </Button>
          </div>
        ) : (
          <span className="rotulo shrink-0 text-ink">{answered ? "você: sim" : "você: acabou"}</span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
