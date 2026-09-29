"use client";

import { createContext, useContext } from "react";
import type { Counts } from "@/lib/admin/types";

// O que o layout do painel compartilha com as abas: quem está logado e o
// número da fila (que a moderação atualiza depois de cada ação)
export const AdminContext = createContext<{ me: string; counts: Counts | null; refreshCounts: () => void }>({
  me: "",
  counts: null,
  refreshCounts: () => {},
});

export const useAdmin = () => useContext(AdminContext);
