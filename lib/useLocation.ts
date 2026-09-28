"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Position = { lat: number; lng: number; accuracy: number; at: number };

export type LocationState = {
  position: Position | null;
  error: string | null;
  // Segundos desde que começou a procurar (para mostrar dicas se demorar)
  elapsed: number;
  retry: () => void;
};

const MESSAGES: Record<number, string> = {
  1: "O navegador bloqueou a localização. Libere para este site e confira se o próprio navegador tem permissão nos ajustes do aparelho (no Mac: Ajustes do Sistema > Privacidade e Segurança > Serviços de Localização).",
  2: "Não foi possível descobrir onde você está. Confira se os Serviços de Localização do aparelho estão ligados (no Mac, o Wi-Fi precisa estar ligado).",
};

// Pede uma posição rápida (Wi-Fi/rede) e, em paralelo, acompanha o GPS,
// ficando sempre com a leitura mais precisa e recente.
export function useLocation(): LocationState {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(() =>
    "geolocation" in navigator ? null : "Este navegador não informa a localização.",
  );
  const [elapsed, setElapsed] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const hasFix = useRef(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);

    const onPosition = (p: GeolocationPosition) => {
      const next = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: Date.now() };
      hasFix.current = true;
      setError(null);
      setPosition((best) =>
        // Troca se é mais precisa, ou se a anterior já tem mais de 30s
        !best || next.accuracy <= best.accuracy || next.at - best.at > 30_000 ? next : best,
      );
    };
    const onError = (e: GeolocationPositionError) => {
      // Timeout não é fatal: o watch continua tentando
      if (e.code === e.TIMEOUT) return;
      if (!hasFix.current) setError(MESSAGES[e.code] ?? "Não foi possível obter sua localização.");
    };

    navigator.geolocation.getCurrentPosition(onPosition, onError, {
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 10_000,
    });
    const watch = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30_000,
    });

    return () => {
      clearInterval(tick);
      navigator.geolocation.clearWatch(watch);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setElapsed(0);
    setAttempt((n) => n + 1);
  }, []);

  return { position, error, elapsed, retry };
}
