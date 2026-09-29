// CSV que o Excel em português abre certo: ponto e vírgula, BOM e aspas
// escapadas. Montado no navegador; nada passa por servidor.
type Cell = string | number | boolean | null | undefined;

const quote = (v: Cell) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv<T extends Record<string, Cell>>(rows: T[], columns: { key: keyof T; label: string }[]) {
  const head = columns.map((c) => quote(c.label)).join(";");
  const body = rows.map((r) => columns.map((c) => quote(r[c.key])).join(";"));
  return "﻿" + [head, ...body].join("\r\n");
}

export function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const today = () => new Date().toISOString().slice(0, 10);
