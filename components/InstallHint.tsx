"use client";

import { useEffect, useState } from "react";
import { CloseIcon, ShareIcon } from "./ui/icons";
import { Button, IconButton } from "./ui";

// Convite para instalar o app. Instalado, ele abre sem as barras do
// navegador, em tela cheia. No Android o navegador oferece o botão pronto
// (beforeinstallprompt); no iPhone só dá para explicar o caminho.
type Deferred = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "deolho-instalar-dispensado";
let deferred: Deferred | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as Deferred;
  });
}

export const isInstalled = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);

export function shouldOfferInstall() {
  if (isInstalled()) return false;
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
}

export default function InstallHint({ onClose }: { onClose: () => void }) {
  const [ios] = useState(() => /iPhone|iPad|iPod/.test(navigator.userAgent));
  const [canPrompt, setCanPrompt] = useState(() => deferred !== null);
  useEffect(() => {
    const on = () => setCanPrompt(true);
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);

  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // sem armazenamento: volta a aparecer na próxima visita
    }
    onClose();
  };

  if (!ios && !canPrompt) return null;
  return (
    <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Tenha o De Olho na tela de início</p>
        {ios ? (
          <p className="mt-1 text-sm text-muted">
            Toque em <ShareIcon className="inline align-[-3px]" /> Compartilhar e depois em <span className="text-ink">Adicionar à Tela de Início</span>.
            Abre em tela cheia, sem as barras do navegador.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">Abre em tela cheia, sem as barras do navegador.</p>
            <Button
              className="mt-3"
              onClick={async () => {
                await deferred?.prompt();
                deferred = null;
                close();
              }}
            >
              Instalar
            </Button>
          </>
        )}
      </div>
      <IconButton label="Agora não" onClick={close} className="h-9 w-9 shrink-0">
        <CloseIcon />
      </IconButton>
    </div>
  );
}
