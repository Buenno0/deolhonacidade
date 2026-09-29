"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { Button, Spinner } from "./ui";

type Props = {
  getCenter: () => [number, number] | null;
  onCancel: () => void;
  onCreated: (id: string, at: [number, number]) => void;
};

// Perguntar: a pessoa arrasta o mapa até a mira no centro e escreve o que quer
// saber. O pedido fica aberto por 2h e avisa quem tem alerta ali perto.
export default function AskPanel({ getCenter, onCancel, onCreated }: Props) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const at = getCenter();
    if (!at) return;
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("create_request", { p_lat: at[1], p_lng: at[0], p_question: question });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    // Avisar quem está perto roda no servidor; se falhar, o pedido continua no mapa
    fetch(`/api/requests/${data}/notify`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    onCreated(data as string, at);
  }

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-lg rounded-2xl border border-line bg-surface p-4">
      <p className="rotulo">Alguém aí?</p>
      <p className="mt-1 text-sm text-muted">Arraste o mapa até a mira no lugar que você quer ver.</p>
      <textarea
        autoFocus
        maxLength={140}
        rows={2}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ex.: Como está a fila do posto? A ponte alagou?"
        className="mt-3 w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-base outline-none transition focus:border-accent"
      />
      <div className="mt-3 flex gap-2">
        <Button variant="secundario" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={submit} disabled={busy || question.trim().length < 3} className="flex-[2]">
          {busy ? <Spinner /> : null} Perguntar aqui
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
