"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Medal from "@/components/Medal";
import { BAIRROS } from "@/lib/bairros";

// "Seja o primeiro Olheiro do seu bairro": voto anônimo (um por aparelho e
// bairro) e o ranking dos bairros mais pedidos. Com pouca gente, o ranking
// mostra só a proporção, sem número (não fica um "1" sozinho na vitrine).
type Count = { bairro: string; n: number };
const SHOW_NUMBERS_FROM = 20;

export default function FirstInNeighborhood() {
  const [bairro, setBairro] = useState("");
  const [counts, setCounts] = useState<Count[]>([]);
  const [result, setResult] = useState<{ bairro: string; posicao: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // O cliente do Supabase (~50 KB) só vem quando a seção chega perto da tela
  const box = useRef<HTMLDivElement>(null);
  const supabase = () => import("@/lib/supabase/client").then((m) => m.getSupabase());
  const load = () =>
    supabase()
      .then((sb) => sb.rpc("neighborhood_counts"))
      .then(({ data }) => setCounts((data as Count[] | null) ?? []));
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (io.disconnect(), load()), { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valid = (BAIRROS as readonly string[]).includes(bairro);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return setError("Escolha um bairro da lista.");
    setBusy(true);
    setError(null);
    const { data, error } = await (await supabase()).rpc("register_neighborhood", { p_bairro: bairro });
    setBusy(false);
    if (error) return setError("Não deu certo agora. Tenta de novo?");
    setResult({ bairro, posicao: (data as { posicao: number }).posicao });
    load();
  };

  const total = counts.reduce((a, c) => a + c.n, 0);
  const max = Math.max(1, ...counts.map((c) => c.n));

  return (
    <div ref={box} className="flex flex-wrap items-start gap-10">
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
        {result ? (
          <div className="conquista-entra sala-escura flex items-center gap-5" role="status">
            <div className="relative">
              {Array.from({ length: 12 }, (_, k) => (
                <span
                  key={k}
                  className="faisca absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                  style={{ background: k % 3 ? "var(--accent)" : "var(--ink)", "--ang": `${30 * k}deg`, "--dist": `${60 + (k % 3) * 14}px`, animationDelay: `${420 + (k % 4) * 40}ms` } as CSSProperties}
                />
              ))}
              <Medal label={`${result.posicao}º`} tier={result.posicao <= 10 ? 3 : 2} size={96} animate />
            </div>
            <div>
              <p className="lp-rot m-0" style={{ color: "var(--accent)" }}>Olheiro fundador</p>
              <p className="lp-disp m-0 text-2xl leading-tight">
                Você é o {result.posicao}º de {result.bairro}.
              </p>
              <p className="lp-muted m-0 mt-1 text-sm">Chama os vizinhos: quanto mais gente, mais rápido o bairro aparece no mapa.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm text-muted">
              Seu bairro
              <input
                list="lp-bairros"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Comece a digitar: Vila, Jardim, Centro…"
                autoComplete="off"
                className="min-h-12 w-full rounded-lg border border-line bg-bg px-3.5 text-base text-ink outline-none transition focus:border-accent"
              />
              <datalist id="lp-bairros">
                {BAIRROS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </label>
            <button type="submit" disabled={busy} className="lp-btn lp-btn-p cursor-pointer border-0 disabled:opacity-60">
              {busy ? "Guardando…" : "Quero ser o primeiro Olheiro daqui"}
            </button>
            {error && <span className="text-sm" style={{ color: "var(--danger)" }}>{error}</span>}
            <span className="lp-muted text-xs">Sem cadastro e sem nome. Um voto por aparelho.</span>
          </form>
        )}
      </div>

      <div className="lp-card lp-card-bg flex min-w-0 flex-[1_1_320px] flex-col gap-3">
        <span className="lp-rot">Bairros mais pedidos</span>
        {counts.length === 0 ? (
          <p className="lp-muted m-0 text-sm">Nenhum bairro ainda. O seu pode ser o primeiro da lista.</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {counts.slice(0, 6).map((c, i) => (
              <li key={c.bairro} className="flex flex-col gap-1">
                <span className="flex justify-between text-sm">
                  <span>
                    <span className="lp-num lp-muted mr-2">{i + 1}</span>
                    {c.bairro}
                  </span>
                  {total >= SHOW_NUMBERS_FROM && <span className="lp-num lp-muted">{c.n}</span>}
                </span>
                <span className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--elev)" }}>
                  <span
                    className="lp-barra-cresce block h-full rounded-full"
                    style={{ width: `${(c.n / max) * 100}%`, background: c.bairro === result?.bairro ? "var(--accent)" : "var(--muted)", animationDelay: `${i * 0.08}s` }}
                  />
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
