"use client";

import { useEffect } from "react";
import { recordInteraction } from "@/lib/interactions";

// Quem abre o link compartilhado também conta como visualização. Roda no
// navegador de propósito: pelo servidor, todas as visitas teriam o mesmo IP.
export default function RecordView({ id }: { id: string }) {
  useEffect(() => recordInteraction(id, "view"), [id]);
  return null;
}
