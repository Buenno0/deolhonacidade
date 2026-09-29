"use client";

import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "./ui/icons";
import { IconButton } from "./ui";

// Sobreposição: raio 16px (quanto maior a superfície, maior o raio), borda de
// 1px em --line e nenhuma sombra. Esc fecha.
export default function Sheet({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
      <button aria-label="Fechar" className="absolute inset-0 bg-black/55" onClick={onClose} />
      <section
        role="dialog"
        aria-label={title}
        className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow && <p className="rotulo mb-1">{eyebrow}</p>}
            <h2 className="font-display text-xl font-semibold leading-tight">{title}</h2>
          </div>
          <IconButton label="Fechar" onClick={onClose} className="h-9 w-9">
            <CloseIcon />
          </IconButton>
        </header>
        {children}
      </section>
    </div>
  );
}
