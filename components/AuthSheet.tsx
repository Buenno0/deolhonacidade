"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import Sheet from "./Sheet";

type Props = {
  session: Session | null;
  onClose: () => void;
  onDone: () => void;
};

// Login por código de 6 dígitos no e-mail + aceite dos termos.
// Se já existe sessão (ex.: fechou antes de aceitar), mostra só os termos.
export default function AuthSheet({ session, onClose, onDone }: Props) {
  const supabase = getSupabase();
  const [step, setStep] = useState<"email" | "code" | "terms">(session ? "terms" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado");
    } finally {
      setBusy(false);
    }
  }

  const acceptTerms = async () => {
    const { error } = await supabase.rpc("accept_terms");
    if (error) throw error;
    onDone();
  };

  const terms = (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
      <span>
        Li e aceito os{" "}
        <Link href="/termos" target="_blank" className="underline">
          termos de uso
        </Link>
        . Meus posts aparecem sem meu nome e somem do mapa em 12h.
      </span>
    </label>
  );

  return (
    <Sheet title="Entrar para postar" onClose={onClose}>
      {step === "email" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
              if (error) throw error;
              setStep("code");
            });
          }}
        >
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          />
          {terms}
          <button disabled={busy || !accepted} className="rounded-lg bg-blue-600 py-2.5 font-medium text-white disabled:opacity-50">
            {busy ? "Enviando…" : "Receber código"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
              if (error) throw error;
              await acceptTerms();
            });
          }}
        >
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Enviamos um código de 6 dígitos para {email}.</p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-center text-2xl tracking-[0.4em] dark:border-neutral-700 dark:bg-neutral-800"
          />
          <button disabled={busy || code.length !== 6} className="rounded-lg bg-blue-600 py-2.5 font-medium text-white disabled:opacity-50">
            {busy ? "Verificando…" : "Entrar"}
          </button>
        </form>
      )}

      {step === "terms" && (
        <div className="flex flex-col gap-3">
          {terms}
          <button
            disabled={busy || !accepted}
            onClick={() => run(acceptTerms)}
            className="rounded-lg bg-blue-600 py-2.5 font-medium text-white disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Sheet>
  );
}
