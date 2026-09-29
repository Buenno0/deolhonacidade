"use client";

import { getSupabase } from "./supabase/client";

export type NearestCity = { id: number; name: string; uf: string; lng: number; lat: number; zoom: number; km: number };
export type CityCheck = { inside: number | null; nearest: NearestCity };

export async function locateCity(lat: number, lng: number): Promise<CityCheck | null> {
  const { data, error } = await getSupabase().rpc("locate_city", { p_lat: lat, p_lng: lng });
  return error ? null : (data as CityCheck);
}

// Posição sem perguntar nada: só se a pessoa já deu permissão antes.
// Abrir o app não dispara o pedido de localização.
export async function silentPosition(): Promise<GeolocationPosition | null> {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (status?.state !== "granted") return null;
    return await new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }),
    );
  } catch {
    return null;
  }
}

// Avisa quando a pessoa libera a localização no meio da visita (pelos ajustes
// do navegador, sem tocar em nada no app). Devolve a função que para de ouvir.
export function onLocationGranted(run: () => void): () => void {
  let status: PermissionStatus | null = null;
  let stopped = false;
  const handler = () => status?.state === "granted" && run();
  navigator.permissions
    ?.query({ name: "geolocation" as PermissionName })
    .then((s) => {
      if (stopped) return;
      status = s;
      s.addEventListener("change", handler);
    })
    .catch(() => {});
  return () => {
    stopped = true;
    status?.removeEventListener("change", handler);
  };
}

const DISMISSED = "deolho-fora-da-area";
export const wasDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISSED) === "1";
  } catch {
    return false;
  }
};
export const dismiss = () => {
  try {
    sessionStorage.setItem(DISMISSED, "1");
  } catch {
    // sem armazenamento: o aviso só volta a aparecer nesta visita
  }
};
