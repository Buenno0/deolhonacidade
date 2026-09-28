"use client";

import type { ReactNode } from "react";

export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <section
        role="dialog"
        aria-label={title}
        className="relative w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl dark:bg-neutral-900"
      >
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Fechar
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
