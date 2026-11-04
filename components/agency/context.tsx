"use client";

import { createContext, useContext } from "react";
import type { AgencySummary } from "@/lib/agency/types";

// O que o layout do painel compartilha com as abas: a cidade do agente, o
// nome do órgão (que assina a ficha em PDF) e o resumo dos últimos 30 dias.
export const AgencyContext = createContext<{ summary: AgencySummary | null }>({ summary: null });

export const useAgency = () => useContext(AgencyContext);
