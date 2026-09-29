"use client";

import { useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import Captcha, { TURNSTILE_SITE_KEY } from "./Captcha";
import GoogleButton, { GOOGLE_CLIENT_ID } from "./GoogleButton";
import Sheet from "./Sheet";
import { Button } from "./ui";
import { errorMessage } from "@/lib/errors";

type Props = {
  session: Session | null;
  onClose: () => void;
  onDone: (userId: string) => void;
  // O que abrir quando voltar do Google
  then?: string | null;
};

// Login social: liga com NEXT_PUBLIC_AUTH_GOOGLE=1 (o provedor Google precisa
// estar ativo no Supabase). Como a volta do Google recarrega a página, o aceite
// dos termos fica anotado aqui e o Home conclui depois.
export const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1" || Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
// Código por e-mail: só com SMTP próprio no Supabase (o padrão só entrega à
// equipe). Sem Google, fica sempre ligado; com Google, só com NEXT_PUBLIC_AUTH_EMAIL=1.
export const EMAIL_ENABLED = !GOOGLE_ENABLED || process.env.NEXT_PUBLIC_AUTH_EMAIL === "1";
export const PENDING_TERMS_KEY = "deolho-termos-aceitos";
export const PENDING_THEN_KEY = "deolho-depois-do-login";

const FIELD =
  "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-base outline-none transition focus:border-accent";

// Login por código de 6 dígitos no e-mail + aceite dos termos.
// Se já existe sessão (ex.: fechou antes de aceitar), mostra só os termos.
export default function AuthSheet({ session, onClose, onDone, then = null }: Props) {
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
      setError(errorMessage(e, "Algo deu errado"));
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
        . Meus posts aparecem sem meu nome e somem do mapa em até 12h; guardar no histórico é escolha minha.
      </span>
    </label>
  );

  // Sem o botão oficial (sem NEXT_PUBLIC_GOOGLE_CLIENT_ID), cai no redirecionamento
  async function google() {
    await run(async () => {
      try {
        sessionStorage.setItem(PENDING_TERMS_KEY, "1");
        if (then) sessionStorage.setItem(PENDING_THEN_KEY, then);
      } catch {
        // sem armazenamento: os termos são pedidos de novo na volta
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    });
  }

  const titles = { email: "Entrar para registrar", code: "Confira seu e-mail", terms: "Só mais um passo" };

  return (
    <Sheet eyebrow="Conta" title={titles[step]} onClose={onClose}>
      {step === "email" && GOOGLE_ENABLED && (
        <div className={EMAIL_ENABLED ? "mb-5 flex flex-col gap-3" : "flex flex-col gap-4"}>
          {terms}
          {GOOGLE_CLIENT_ID && accepted ? (
            <GoogleButton onSignedIn={(id) => run(() => acceptTerms(id))} onError={setError} />
          ) : (
            <Button type="button" size="lg" variant="secundario" disabled={busy || !accepted} onClick={google} className="w-full">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2z" />
                <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14z" />
                <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10c.9-2.7 3.4-4.6 6.3-4.6z" />
              </svg>
              {accepted ? "Entrar com Google" : "Aceite os termos para entrar"}
            </Button>
          )}
          {!EMAIL_ENABLED && <p className="text-center text-xs text-muted">Sem senha: é só escolher a sua conta do Google.</p>}
          {EMAIL_ENABLED && (
            <p className="flex items-center gap-3 text-xs text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
              ou com código no e-mail
            </p>
          )}
        </div>
      )}

      {step === "email" && EMAIL_ENABLED && (
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
          {!GOOGLE_ENABLED && terms}
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
