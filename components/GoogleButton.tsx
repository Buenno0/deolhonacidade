"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";

// Botão oficial do Google (Google Identity Services). O login acontece num
// popup do Google em cima do próprio site e devolve um token que o Supabase
// confere (signInWithIdToken). Assim a tela do Google não mostra o endereço
// do Supabase, e a pessoa não sai da página.
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

type Gsi = {
  accounts: {
    id: {
      initialize: (opts: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
};
declare global {
  interface Window {
    google?: Gsi;
  }
}

let loading: Promise<void> | null = null;
function loadGsi() {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Não foi possível carregar o login do Google"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

// O Google recebe o hash do nonce; o Supabase recebe o nonce puro e confere
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hex };
}

export default function GoogleButton({ onSignedIn, onError }: { onSignedIn: (userId: string) => void; onError: (m: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef({ onSignedIn, onError });
  useEffect(() => {
    latest.current = { onSignedIn, onError };
  });

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        await loadGsi();
        const { raw, hex } = await makeNonce();
        if (off || !box.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hex,
          use_fedcm_for_button: true,
          context: "signin",
          callback: async ({ credential }: { credential: string }) => {
            const { data, error } = await getSupabase().auth.signInWithIdToken({ provider: "google", token: credential, nonce: raw });
            // A mensagem do Supabase vem em inglês e técnica; o detalhe fica no console
            if (error || !data.user) {
              if (error) console.error("signInWithIdToken", error);
              return latest.current.onError("Não foi possível entrar com o Google. Tente de novo.");
            }
            latest.current.onSignedIn(data.user.id);
          },
        });
        window.google.accounts.id.renderButton(box.current, {
          type: "standard",
          theme: document.documentElement.classList.contains("light") ? "outline" : "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          locale: "pt-BR",
          // O Google aceita de 200 a 400 px; a caixa do sheet é a medida
          width: Math.max(200, Math.min(400, Math.floor(box.current.getBoundingClientRect().width) || 320)),
        });
        setReady(true);
      } catch (e) {
        if (!off) latest.current.onError(errorMessage(e, "Não foi possível carregar o login do Google"));
      }
    })();
    return () => {
      off = true;
    };
  }, []);

  return (
    <div className="flex min-h-[44px] w-full justify-center">
      {/* O iframe do Google tem largura fixa: centralizado na caixa */}
      <div ref={box} className="flex w-full justify-center [&>div]:mx-auto" />
      {!ready && <span className="sr-only">Carregando o login do Google…</span>}
    </div>
  );
}
