"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { tema } from "@/design/tokens.mjs";

// Portado do NAS (web/src/lib/theme.tsx): o tema novo nasce num círculo a
// partir do botão clicado, 520ms. O script inline do layout aplica o tema
// salvo antes da primeira pintura; aqui só o lemos.

export type Theme = "dark" | "light";

export const THEME_KEY = "deolho-tema";
const DURACAO = 520;

type Ctx = { theme: Theme; toggle: (evento?: MouseEvent) => void };
const ThemeContext = createContext<Ctx>({ theme: "dark", toggle: () => {} });

function atual(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

// O tema mora na classe do <html> (posta pelo script de boot). O React o lê
// por useSyncExternalStore: na hidratação usa o valor do servidor ("dark") e
// logo depois o real, sem erro de hidratação nem árvore refeita.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function aplicar(t: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(t);
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    // navegação privada pode recusar; o tema só não fica salvo
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", t === "light" ? tema.claro.bg : tema.escuro.bg);
  // síncrono: dentro do flushSync da View Transition o React já pinta o novo
  for (const fn of listeners) fn();
}

function esmaecer() {
  document.documentElement.dataset.temaTrocando = "sim";
  window.setTimeout(() => delete document.documentElement.dataset.temaTrocando, DURACAO);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribe, atual, () => "dark");

  const toggle = useCallback((evento?: MouseEvent) => {
    const proximo: Theme = atual() === "dark" ? "light" : "dark";
    const x = evento?.clientX ?? window.innerWidth / 2;
    const y = evento?.clientY ?? window.innerHeight / 2;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (typeof document.startViewTransition !== "function" || reduzido) {
      if (!reduzido) esmaecer();
      aplicar(proximo);
      return;
    }

    const transicao = document.startViewTransition(() => {
      flushSync(() => aplicar(proximo));
    });
    transicao.ready
      .then(() => {
        const raio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
          { duration: DURACAO, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(esmaecer);
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Roda no <head> antes de pintar: escuro por padrão, a escolha salva vence.
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");}catch(e){}var c=t==="light"?"light":"dark";document.documentElement.classList.add(c);})();`;
