"use client";

import { useEffect, useState } from "react";

// Página para descobrir por que a localização não funciona num aparelho:
// mostra o que o navegador informa e o erro exato de um pedido feito no toque.
// Não guarda nem envia nada.
type Line = [string, string];

export default function Diagnostico() {
  const [info, setInfo] = useState<Line[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const add = (t: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString("pt-BR")} ${t}`]);

  useEffect(() => {
    (async () => {
      let perm = "sem Permissions API";
      try {
        const st = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
        if (st) perm = st.state;
      } catch (e) {
        perm = `erro ao consultar: ${String(e)}`;
      }
      setInfo([
        ["Navegador", navigator.userAgent],
        ["Conexão segura (HTTPS)", String(window.isSecureContext)],
        ["Dentro de outra página (iframe)", String(window.self !== window.top)],
        ["Geolocalização existe", String("geolocation" in navigator)],
        ["Permissão (Permissions API)", perm],
        ["Página visível", document.visibilityState],
        ["Instalado na tela de início", String(window.matchMedia("(display-mode: standalone)").matches)],
      ]);
    })();
  }, []);

  function ask(high: boolean) {
    const t0 = Date.now();
    add(`pedindo (alta precisão: ${high ? "sim" : "não"})…`);
    navigator.geolocation.getCurrentPosition(
      (p) => add(`OK em ${Date.now() - t0} ms · ±${Math.round(p.coords.accuracy)} m`),
      (e) => add(`ERRO ${e.code} (${["", "PERMISSÃO NEGADA", "POSIÇÃO INDISPONÍVEL", "TEMPO ESGOTADO"][e.code] ?? "?"}) em ${Date.now() - t0} ms: ${e.message || "(sem mensagem)"}`),
      { enableHighAccuracy: high, timeout: 20_000, maximumAge: 0 },
    );
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-6 text-sm">
      <h1 className="font-display text-xl font-bold">Diagnóstico da localização</h1>
      <dl className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
        {info.map(([k, v]) => (
          <div key={k}>
            <dt className="rotulo">{k}</dt>
            <dd className="break-all">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => ask(true)} className="rounded-lg bg-accent px-3 py-3 font-medium text-accent-ink">
          Pedir localização
        </button>
        <button onClick={() => ask(false)} className="rounded-lg border border-line px-3 py-3 font-medium">
          Pedir (baixa precisão)
        </button>
      </div>
      <pre className="min-h-24 whitespace-pre-wrap rounded-xl border border-line bg-bg p-3 font-mono text-xs">{log.join("\n") || "Toque num botão acima."}</pre>
      <p className="text-xs text-muted">Nada daqui é guardado ou enviado. Tire um print desta tela depois de tocar no botão.</p>
    </main>
  );
}
