"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { DICT, type Lang } from "./i18n";

// O idioma da LP para os componentes do cliente. O <html lang> vem do layout
// raiz (pt-BR); em /en ele troca aqui.
const LangContext = createContext<Lang>("pt");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  useEffect(() => {
    if (lang === "pt") return;
    const html = document.documentElement;
    const before = html.lang;
    html.lang = "en";
    return () => void (html.lang = before);
  }, [lang]);
  return <LangContext value={lang}>{children}</LangContext>;
}

export const useT = () => DICT[useContext(LangContext)];
