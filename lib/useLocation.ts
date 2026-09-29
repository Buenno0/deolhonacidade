"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Position = { lat: number; lng: number; accuracy: number; at: number };

export type LocationState = {
  position: Position | null;
  error: string | null;
  // Segundos desde que começou a procurar (para mostrar dicas se demorar)
  elapsed: number;
  // Passou do prazo sem resposta: o app oferece "Permitir localização"
  stalled: boolean;
  // Pede de novo. Chame dentro de um toque: é o que faz o navegador perguntar.
  retry: () => void;
};

const MESSAGES: Record<number, string> = {
  1: "O navegador bloqueou a localização. Libere para este site e confira se o próprio navegador tem permissão nos ajustes do aparelho (no iPhone: Ajustes > Privacidade > Serviços de Localização > Safari).",
  2: "Não foi possível descobrir onde você está. Confira se os Serviços de Localização do aparelho estão ligados.",
};
const STALL_MS = 12_000;
const FRESH_MS = 2 * 60_000;

// A última posição conhecida, compartilhada: o toque em Registrar já pede a
// localização (antes de abrir a câmera) e o formulário aproveita o resultado.
let last: Position | null = null;
const listeners = new Set<(p: Position) => void>();
const toPosition = (p: GeolocationPosition): Position => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
  accuracy: p.coords.accuracy,
  at: Date.now(),
});
function remember(p: Position) {
  if (!last || p.accuracy <= last.accuracy || p.at - last.at > 30_000) last = p;
  for (const l of listeners) l(last);
}

// Chame no próprio toque do usuário (Registrar): no iPhone, pedido feito com a
// página escondida (a câmera aberta) é descartado em silêncio, e a pergunta de
// permissão só aparece de forma confiável dentro de um toque.
export function primeLocation() {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition((p) => remember(toPosition(p)), () => {}, {
    enableHighAccuracy: true,
    maximumAge: 60_000,
    timeout: 20_000,
  });
}

async function permissionState(): Promise<PermissionState | null> {
  try {
    return (await navigator.permissions?.query({ name: "geolocation" as PermissionName }))?.state ?? null;
  } catch {
    return null;
  }
}

// Acompanha o GPS e fica com a leitura mais precisa e recente. Um pedido só
// (dois ao mesmo tempo travam em alguns navegadores), só com a página visível,
// e com prazo: sem resposta em 12 s, o app oferece pedir de novo num toque.
export function useLocation(): LocationState {
  const [position, setPosition] = useState<Position | null>(() => (last && Date.now() - last.at < FRESH_MS ? last : null));
  const [error, setError] = useState<string | null>(() =>
    "geolocation" in navigator ? null : "Este navegador não informa a localização.",
  );
  const [elapsed, setElapsed] = useState(0);
  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const hasFix = useRef(position !== null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let watch: number | null = null;
    let stopped = false;
    const started = Date.now();
    const tick = setInterval(() => {
      const ms = Date.now() - started;
      setElapsed(Math.round(ms / 1000));
      if (!hasFix.current && ms >= STALL_MS) setStalled(true);
    }, 1000);

    const onFix = (p: Position) => {
      hasFix.current = true;
      setError(null);
      setStalled(false);
      setPosition((best) => (!best || p.accuracy <= best.accuracy || p.at - best.at > 30_000 ? p : best));
    };
    listeners.add(onFix);

    const start = () => {
      if (stopped || watch !== null) return;
      watch = navigator.geolocation.watchPosition(
        (p) => remember(toPosition(p)),
        (e) => {
          // Timeout não é fatal: o prazo acima decide quando oferecer ajuda
          if (e.code === e.TIMEOUT) return;
          if (!hasFix.current) setError(MESSAGES[e.code] ?? "Não foi possível obter sua localização.");
        },
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
      );
    };
    const onVisible = () => document.visibilityState === "visible" && start();

    permissionState().then((state) => {
      if (stopped) return;
      if (state === "denied") {
        setError(MESSAGES[1]);
        return;
      }
      // Com a página escondida (câmera aberta), espera ela voltar
      if (document.visibilityState === "visible") start();
      else document.addEventListener("visibilitychange", onVisible);
    });

    return () => {
      stopped = true;
      clearInterval(tick);
      listeners.delete(onFix);
      document.removeEventListener("visibilitychange", onVisible);
      if (watch !== null) navigator.geolocation.clearWatch(watch);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setElapsed(0);
    setStalled(false);
    // Dentro do toque: é aqui que o navegador mostra a pergunta de permissão
    primeLocation();
    setAttempt((n) => n + 1);
  }, []);

  return { position, error, elapsed, stalled, retry };
}
