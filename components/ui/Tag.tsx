import { CategoryIcon } from "./icons";

// Tags de destaque do story. Agora pulsa para fora, Em alta sobe, Divulgação
// não se mexe (é publicidade identificada, não acontecimento). As classes
// moram em app/globals.css porque o mapa desenha as mesmas tags em HTML puro.
export const SETA_SVG =
  '<svg class="seta" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></g></svg>';

export type TagKind = "agora" | "alta" | "divulgacao";

export function tagHtml(kind: TagKind) {
  if (kind === "agora") return '<span class="tag tag-agora pin-tag"><span class="ping"></span>Agora</span>';
  if (kind === "alta") return `<span class="tag tag-alta pin-tag">${SETA_SVG}Em alta</span>`;
  return '<span class="tag tag-divulgacao pin-tag">Divulgação</span>';
}

export function Tag({ kind, rank }: { kind: TagKind; rank?: number }) {
  if (kind === "agora")
    return (
      <span className="tag tag-agora">
        <span className="ping" aria-hidden="true" />
        Agora
      </span>
    );
  if (kind === "alta")
    return (
      <span className="tag tag-alta">
        <svg className="seta" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <g>
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M15 7h6v6" />
          </g>
        </svg>
        {rank ? `Em alta · ${rank}º` : "Em alta"}
      </span>
    );
  return (
    <span className="tag tag-divulgacao">
      <CategoryIcon category="estabelecimento" className="h-3 w-3" />
      Divulgação
    </span>
  );
}
