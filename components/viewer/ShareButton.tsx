"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { CITY } from "@/lib/city";
import { recordInteraction } from "@/lib/interactions";
import { timeLeftShort, type PostProperties } from "@/lib/posts";
import { Button } from "../ui";
import { ChatIcon, CheckIcon, LinkIcon, ShareIcon } from "../ui/icons";

// Compartilhar: no celular abre a folha nativa (WhatsApp incluso); no
// computador mostra WhatsApp e Copiar link. O link /p/<id> tem prévia com a foto.
export default function ShareButton({ post, onShared, archive = false }: { post: PostProperties; onShared?: () => void; archive?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/p/${post.id}`;
  const label = post.category === "estabelecimento" && post.business_name ? post.business_name : CATEGORIES[post.category].label;
  const when = archive ? "do histórico da cidade" : `some em ${timeLeftShort(post.expires_at)}`;
  const text = `${label} em ${CITY.name}${post.caption ? `: ${post.caption}` : ""} (${when})`;

  async function share() {
    if (!archive) {
      recordInteraction(post.id, "share");
      // dá tempo do banco contar antes de conferir conquistas
      setTimeout(() => onShared?.(), 800);
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: "De Olho na Cidade", text, url });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    setOpen((o) => !o);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie o link:", url);
    }
  }

  return (
    <div className="relative">
      <Button variant="fantasma" onClick={share} className="px-3 py-1.5 text-xs text-ink">
        <ShareIcon /> Compartilhar
      </Button>
      {open && (
        <div className="absolute bottom-10 left-0 z-10 flex w-52 flex-col rounded-xl border border-white/15 bg-black/85 p-1.5 backdrop-blur">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-white/10"
          >
            <ChatIcon /> WhatsApp
          </a>
          <button onClick={copy} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-white/10">
            {copied ? <CheckIcon className="text-ok" /> : <LinkIcon />} {copied ? "Link copiado" : "Copiar link"}
          </button>
        </div>
      )}
    </div>
  );
}
