#!/usr/bin/env node
// Contraste WCAG 2.1 dos pares do design system, lidos da fonte única
// (design/tokens.mjs). Portado do NAS; lá os valores eram copiados à mão.
// Uso: npm run contraste   (imprime a tabela e sai 1 se algo reprova)
import { tema } from "../design/tokens.mjs";

const canal = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminancia = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
};
export const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Texto 4,5:1; micro-rótulo decorativo 3,0:1; borda 1,4:1 (limiar onde a
// divisória ainda se enxerga)
const pares = (p) => [
  ["corpo sobre fundo", p.ink, p.bg, 4.5],
  ["corpo sobre superfície", p.ink, p.surface, 4.5],
  ["corpo sobre elevação", p.ink, p.elev, 4.5],
  ["secundário sobre fundo", p.muted, p.bg, 4.5],
  ["secundário sobre superfície", p.muted, p.surface, 4.5],
  ["secundário sobre elevação", p.muted, p.elev, 4.5],
  ["acento como texto sobre fundo", p.accent, p.bg, 4.5],
  ["acento como texto sobre superfície", p.accent, p.surface, 4.5],
  ["botão primário", p.accentInk, p.accent, 4.5],
  ["chip ativo", p.accentInk, p.accent, 4.5],
  ["sucesso sobre superfície", p.ok, p.surface, 4.5],
  ["aviso sobre superfície", p.warn, p.surface, 4.5],
  ["perigo sobre superfície", p.danger, p.surface, 4.5],
  ["perigo sobre fundo", p.danger, p.bg, 4.5],
  ["glifo do marco", p.marcoInk, p.marco, 4.5],
  ["marco como texto sobre superfície", p.marcoTexto, p.surface, 4.5],
  ["marco como texto sobre fundo", p.marcoTexto, p.bg, 4.5],
  ["borda sobre superfície", p.line, p.surface, 1.4],
  ["borda sobre fundo", p.line, p.bg, 1.4],
];

// Sala escura: chrome sobre foto. O pior caso é a foto clara sob o degradê
// from-black/85 do visualizador, então medimos contra preto a 85% sobre branco.
const escuroSobreFoto = "#262626";
const sala = (p) => [
  ["legenda sobre foto (degradê)", p.ink, escuroSobreFoto, 4.5],
  ["micro-rótulo sobre foto", p.muted, escuroSobreFoto, 3.0],
  ["selo de perigo sobre foto", p.danger, escuroSobreFoto, 3.0],
  ["selo de aviso sobre foto", p.warn, escuroSobreFoto, 3.0],
  ["contagem do cluster", p.accentInk, p.accent, 4.5],
];

let falhas = 0;
let total = 0;
const tabela = (titulo, linhas) => {
  console.log(`\n── ${titulo} ${"─".repeat(Math.max(0, 50 - titulo.length))}`);
  for (const [rotulo, fg, bg, alvo] of linhas) {
    const c = contraste(fg, bg);
    const ok = c >= alvo;
    total++;
    if (!ok) falhas++;
    console.log(`${ok ? "  ok  " : " FALHA"} ${rotulo.padEnd(36)} ${fg} / ${bg}  ${c.toFixed(2).padStart(5)}:1  (alvo ${alvo})`);
  }
};

tabela("escuro", pares(tema.escuro));
tabela("claro", pares(tema.claro));
tabela("sala escura", sala(tema.escuro));

console.log(`\n${total - falhas}/${total} pares passando`);
process.exit(falhas ? 1 : 0);
