"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import Captcha, { TURNSTILE_SITE_KEY } from "./Captcha";
import Sheet from "./Sheet";
import { Button } from "./ui";

type Props = {
  session: Session | null;
  onClose: () => void;
  onDone: (userId: string) => void;
};

const FIELD =
  "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-base outline-none transition focus:border-accent";

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
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const needsCaptcha = Boolean(TURNSTILE_SITE_KEY) && !captcha;

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

  const acceptTerms = async (userId: string) => {
    const { error } = await supabase.rpc("accept_terms");
    if (error) throw error;
    onDone(userId);
  };

  const terms = (
    <label className="flex items-start gap-3 text-sm text-muted">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
        checked={accepted}
        onChange={(e) => setAccepted(e.target.checked)}
      />
      <span>
        Li e aceito os{" "}
        <Link href="/termos" target="_blank" className="text-accent underline underline-offset-2">
          termos de uso
        </Link>
        . Meus posts aparecem sem meu nome e somem do mapa em 12h.
      </span>
    </label>
  );

  const titles = { email: "Entrar para registrar", code: "Confira seu e-mail", terms: "Só mais um passo" };

  return (
    <Sheet eyebrow="Conta" title={titles[step]} onClose={onClose}>
      {step === "email" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { shouldCreateUser: true, captchaToken: captcha ?? undefined },
              });
              setCaptchaReset((n) => n + 1);
              if (error) throw error;
              setStep("code");
            });
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="rotulo">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
          </label>
          {terms}
          <Captcha onToken={setCaptcha} resetKey={captchaReset} />
          <Button type="submit" size="lg" disabled={busy || !accepted || needsCaptcha}>
            {busy ? "Enviando…" : needsCaptcha && accepted ? "Verificando que você é gente…" : "Receber código"}
          </Button>
          <p className="text-xs text-muted">Sem senha: mandamos um código de 6 dígitos para o seu e-mail.</p>
        </form>
      )}

      {step === "code" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
              if (error) throw error;
              await acceptTerms(data.user!.id);
            });
          }}
        >
          <p className="text-sm text-muted">
            Enviamos um código para <span className="text-ink">{email}</span>. Ele vale por poucos minutos.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            placeholder="000000"
            aria-label="Código de 6 dígitos"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${FIELD} num text-center text-3xl tracking-[0.5em]`}
          />
          <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
            {busy ? "Verificando…" : "Entrar"}
          </Button>
          <Button type="button" variant="fantasma" onClick={() => setStep("email")}>
            Usar outro e-mail
          </Button>
        </form>
      )}

      {step === "terms" && session && (
        <div className="flex flex-col gap-4">
          {terms}
          <Button size="lg" disabled={busy || !accepted} onClick={() => run(() => acceptTerms(session.user.id))}>
            Continuar
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </Sheet>
  );
}
