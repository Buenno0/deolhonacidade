"use client";

import { useSyncExternalStore } from "react";

// Stories já vistos neste aparelho (como no Instagram: anel cinza e a
// passagem automática pula). Fica só no aparelho e some sozinho depois de 13 h,
// o máximo que um post vive no mapa.
const KEY = "deolho-vistos";
const TTL = 13 * 60 * 60 * 1000;
const listeners = new Set<() => void>();
let cache: Map<string, number> | null = null;
const EMPTY = new Set<string>();
let snapshot: Set<string> = EMPTY;

function load() {
  if (cache) return cache;
  cache = new Map();
  try {
    const now = Date.now();
    for (const [id, at] of Object.entries(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, number>)) {
      if (now - at < TTL) cache.set(id, at);
    }
  } catch {
    // sem armazenamento: vale só nesta visita
  }
  snapshot = new Set(cache.keys());
  return cache;
}

export function markSeen(id: string) {
  const m = load();
  if (m.has(id)) return;
  m.set(id, Date.now());
  snapshot = new Set(m.keys());
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(m)));
  } catch {
    // sem armazenamento: vale só nesta visita
  }
  for (const l of listeners) l();
}

export function useSeen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      load();
      return snapshot;
    },
    () => EMPTY,
  );
}
