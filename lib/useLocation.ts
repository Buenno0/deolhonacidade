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
  // Ainda sem permissão: o pedido só sai num toque (no iPhone, pedido fora de
  // um toque, ou com a câmera aberta, é negado sem perguntar e a negativa fica
  // guardada até recarregar a página)
  needsTap: boolean;
  // Pede de novo. Chame dentro de um toque: é o que faz o navegador perguntar.
  retry: () => void;
};

// iPhone num navegador que não é o Safari (Chrome, Brave…): alguns seguram o
// pedido de localização sem mostrar a pergunta. Dá para abrir no Safari.
export function iosOtherBrowser() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && (/CriOS|FxiOS|EdgiOS|DuckDuckGo|OPT\//.test(ua) || "brave" in navigator);
}
export const safariUrl = () => `x-safari-${window.location.href}`;

// Negado sem nem perguntar quase sempre é o aparelho: no iPhone, cada
// navegador tem a própria permissão de localização, e sem ela nenhum site pede.
export function deniedHelp() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua);
  const app = /CriOS/.test(ua)
    ? "Chrome"
    : /FxiOS/.test(ua)
      ? "Firefox"
      : /EdgiOS/.test(ua)
        ? "Edge"
        : /DuckDuckGo/.test(ua)
          ? "DuckDuckGo"
          : /OPT\//.test(ua)
            ? "Opera"
            : "brave" in navigator
              ? "Brave"
              : null;
  if (ios && app) return `A localização está bloqueada para o ${app}. No iPhone: Ajustes > ${app} > Localização > Ao Usar o App. Depois, recarregue a página e toque em Tentar de novo.`;
  if (ios)
    return "A localização está bloqueada. No iPhone: Ajustes > Privacidade e Segurança > Serviços de Localização > Sites do Safari > Ao Usar o App. No site, toque em aA > Ajustes do Site > Localização > Perguntar, e recarregue a página.";
  if (/Android/.test(ua))
    return "A localização está bloqueada. Toque no cadeado ao lado do endereço > Permissões > Localização > Permitir, e confira se a localização do aparelho está ligada.";
  return "A localização está bloqueada. Libere para este site no cadeado ao lado do endereço e confira se o sistema permite a localização para o navegador.";
}

const MESSAGES: Record<number, string> = {
  1: "",
  2: "Não foi possível descobrir onde você está. Confira se os Serviços de Localização do aparelho estão ligados.",
};
const STALL_MS = 10_000;
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

export async function permissionState(): Promise<PermissionState | null> {
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
  const [needsTap, setNeedsTap] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Depois de um toque em "Permitir", já pode pedir direto
  const tapped = useRef(false);
  const hasFix = useRef(position !== null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let watch: number | null = null;
    let stopped = false;
    const started = Date.now();
    const tick = setInterval(() => {
      if (watch === null) return; // esperando o toque: não conta tempo
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
          if (!hasFix.current) setError(e.code === 1 ? deniedHelp() : (MESSAGES[e.code] ?? "Não foi possível obter sua localização."));
        },
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
      );
    };
    const onVisible = () => document.visibilityState === "visible" && start();

    permissionState().then((state) => {
      if (stopped) return;
      // Sem permissão ainda (ou sem como saber): espera o toque em "Permitir"
      if (state !== "granted" && !tapped.current) {
        setNeedsTap(true);
        if (state === "denied") setError(deniedHelp());
        return;
      }
      setNeedsTap(false);
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
    setNeedsTap(false);
    tapped.current = true;
    // Dentro do toque: é aqui que o navegador mostra a pergunta de permissão
    primeLocation();
    setAttempt((n) => n + 1);
  }, []);

  return { position, error, elapsed, stalled, needsTap, retry };
}
