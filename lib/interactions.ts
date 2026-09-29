"use client";

import { getSupabase } from "./supabase/client";

// Visualizações e compartilhamentos para o Trends. O banco conta uma vez por
// aparelho e post; aqui só evitamos chamadas repetidas na mesma visita.
const sent = new Set<string>();

export function recordInteraction(postId: string, kind: "view" | "share") {
  const key = `${kind}:${postId}`;
  if (sent.has(key)) return;
  sent.add(key);
  getSupabase()
    .rpc("record_interaction", { p_id: postId, p_kind: kind })
    .then(({ error }) => {
      if (error) sent.delete(key);
    });
}
