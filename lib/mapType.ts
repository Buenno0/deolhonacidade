"use client";

import { useSyncExternalStore } from "react";
import { MAP_TYPES, type MapType } from "./map/style";

// Tipo de mapa escolhido, lembrado por navegador (conveniência pessoal).
const KEY = "deolho-mapa";
const listeners = new Set<() => void>();

function read(): MapType {
  try {
    const v = localStorage.getItem(KEY);
    if (MAP_TYPES.some((t) => t.id === v)) return v as MapType;
  } catch {
    // armazenamento bloqueado: fica o padrão
  }
  return "padrao";
}

export function setMapType(t: MapType) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // não salvou, mas troca nesta visita
  }
  current = t;
  for (const fn of listeners) fn();
}

let current: MapType | null = null;
const get = () => (current ??= read());

export function useMapType(): MapType {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get,
    () => "padrao",
  );
}
