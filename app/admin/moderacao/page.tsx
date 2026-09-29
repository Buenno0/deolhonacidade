"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BUSINESS_STATUS, type Business } from "@/lib/business";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES, type Category } from "@/lib/categories";
import { photoUrl } from "@/lib/media";
import { timeAgo } from "@/lib/posts";
import { useAdmin } from "@/components/admin/context";
import { Button, EmptyState, Spinner, cx } from "@/components/ui";
import { CategoryIcon } from "@/components/ui/icons";

type QueuePost = {
  id: string;
  user_id: string;
  status: "pending" | "published" | "hidden" | "expired";
  category: Category;
  caption: string | null;
  photo_path: string;
  created_at: string;
  expires_at: string;
  report_count: number;
  deny_count: number;
  confirm_count: number;
  moderation: { provider?: string; approved?: boolean; labels?: { name: string; confidence: number }[] } | null;
  reasons: string[] | null;
  author_posts: number;
  author_banned: boolean;
};
type QueueRequest = {
  id: string;
  user_id: string;
  status: "open" | "hidden" | "expired";
  question: string;
  created_at: string;
  report_count: number;
  answer_count: number;
  author_banned: boolean;
};

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "pendente", tone: "text-muted" },
  published: { label: "no ar", tone: "text-ok" },
  hidden: { label: "escondido", tone: "text-danger" },
  expired: { label: "vencido", tone: "text-muted" },
  open: { label: "aberto", tone: "text-ok" },
};

// Moderação: o que foi denunciado, escondido ou negado nas últimas 48h.
// A porta (is_admin) fica no layout do painel; o banco confere em cada ação.
type AdminBusiness = Business & { owner_email: string | null; posts: number };

export default function Moderacao() {
  const supabase = getSupabase();
  const { refreshCounts } = useAdmin();
  const [state, setState] = useState<"carregando" | "erro" | "ok">("carregando");
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [requests, setRequests] = useState<QueueRequest[]>([]);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_queue");
    if (error) return setState("erro");
    setPosts(data.posts);
    setRequests(data.requests);
    const { data: list } = await supabase.rpc("admin_businesses", { p_status: null });
    // Pendentes primeiro
    setBusinesses(((list as AdminBusiness[]) ?? []).sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending")));
    setState("ok");
  }, [supabase]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  async function act(key: string, fn: string, args: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(key);
    setError(null);
    const { error } = await supabase.rpc(fn, args);
    if (error) setError(error.message);
    await load();
    refreshCounts();
    setBusy(null);
  }

  return (
    <div>
      {state === "carregando" && (
        <div className="mt-16 flex justify-center">
          <Spinner />
        </div>
      )}
      {state === "erro" && <EmptyState title="Não deu para carregar a fila">Recarregue a página.</EmptyState>}

      {state === "ok" && (
        <>
          {error && <p className="mb-4 text-sm text-danger">{error}</p>}

          <section>
            <h2 className="rotulo mb-3">
              Estabelecimentos · {businesses.filter((b) => b.status === "pending").length} em análise
            </h2>
            {businesses.length === 0 ? (
              <EmptyState title="Nenhum pedido de estabelecimento" />
            ) : (
              <ul className="flex flex-col gap-3">
                {businesses.map((b) => (
                  <li key={b.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                        <CategoryIcon category="estabelecimento" /> {b.name}
                      </span>
                      <span className={cx("rotulo", BUSINESS_STATUS[b.status].tone)}>{BUSINESS_STATUS[b.status].label}</span>
                      <span className="rotulo">{timeAgo(b.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted">
                      {[b.segment, b.address].filter(Boolean).join(" · ")}
                    </p>
                    <p className="rotulo flex flex-wrap gap-x-3">
                      {b.owner_email && <span>{b.owner_email}</span>}
                      {b.whatsapp && <span>WhatsApp {b.whatsapp}</span>}
                      {b.instagram && <span>{b.instagram}</span>}
                      <span>{b.posts} divulgações</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent"
                      >
                        ver o ponto
                      </a>
                    </p>
                    {b.review_note && <p className="text-xs text-muted">Nota: {b.review_note}</p>}
                    <div className="flex flex-wrap gap-2">
                      {b.status !== "approved" && (
                        <Button
                          variant="secundario"
                          className="px-3 py-1.5 text-xs"
                          disabled={busy !== null}
                          onClick={() => act(b.id, "admin_review_business", { p_id: b.id, p_status: "approved", p_note: null })}
                        >
                          Aprovar
                        </Button>
                      )}
                      {b.status === "pending" && (
                        <Button
                          variant="perigo"
                          className="px-3 py-1.5 text-xs"
                          disabled={busy !== null}
                          onClick={() => {
                            const note = prompt("Motivo da recusa (a pessoa vê):");
                            if (note !== null) act(b.id, "admin_review_business", { p_id: b.id, p_status: "rejected", p_note: note });
                          }}
                        >
                          Recusar
                        </Button>
                      )}
                      {b.status === "approved" && (
                        <Button
                          variant="perigo"
                          className="px-3 py-1.5 text-xs"
                          disabled={busy !== null}
                          onClick={() => {
                            const note = prompt("Motivo da suspensão (a divulgação no ar sai do mapa):");
                            if (note !== null) act(b.id, "admin_review_business", { p_id: b.id, p_status: "suspended", p_note: note });
                          }}
                        >
                          Suspender
                        </Button>
                      )}
                      {busy === b.id && <Spinner />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="rotulo mb-3">Posts · {posts.length}</h2>
            {posts.length === 0 ? (
              <EmptyState title="Nada para revisar">Nenhum post denunciado, escondido ou negado nas últimas 48h.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-3">
                {posts.map((p) => {
                  const alive = new Date(p.expires_at).getTime() > now;
                  // "no ar" mas já vencido (a limpeza ainda não passou): mostra como vencido
                  const st = STATUS[p.status === "published" && !alive ? "expired" : p.status];
                  const blocked = p.moderation?.approved === false;
                  return (
                    <li key={p.id} className="flex gap-4 rounded-xl border border-line bg-surface p-3">
                      <a href={photoUrl(p.photo_path)} target="_blank" rel="noreferrer" className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-elev">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl(p.photo_path)} alt="" className="h-full w-full object-cover" />
                      </a>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                            <CategoryIcon category={p.category} /> {CATEGORIES[p.category].label}
                          </span>
                          <span className={cx("rotulo", st.tone)}>{st.label}</span>
                          <span className="rotulo">{timeAgo(p.created_at)}</span>
                        </div>
                        {p.caption && <p className="text-sm">{p.caption}</p>}
                        <p className="rotulo flex flex-wrap gap-x-3">
                          <span className={p.report_count ? "text-danger" : ""}>{p.report_count} denúncias</span>
                          <span>{p.deny_count} disseram que acabou</span>
                          <span>{p.confirm_count} confirmaram</span>
                          <Link href={`/admin/usuarios/${p.user_id}`} className="hover:text-accent">
                            autor: {p.author_posts} posts{p.author_banned ? " · banido" : ""}
                          </Link>
                        </p>
                        {p.reasons?.length ? <p className="text-xs text-muted">Motivos: {p.reasons.join(" · ")}</p> : null}
                        {blocked && (
                          <p className="text-xs text-danger">
                            Recusado pela moderação automática: {p.moderation?.labels?.map((l) => `${l.name} ${l.confidence}%`).join(", ")}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-2">
                          {p.status === "hidden" && alive && (
                            <Button variant="secundario" className="px-3 py-1.5 text-xs" disabled={busy !== null} onClick={() => act(p.id, "admin_set_post", { p_id: p.id, p_visible: true })}>
                              Restaurar
                            </Button>
                          )}
                          {p.status === "published" && alive && (
                            <Button variant="secundario" className="px-3 py-1.5 text-xs" disabled={busy !== null} onClick={() => act(p.id, "admin_set_post", { p_id: p.id, p_visible: false })}>
                              Esconder
                            </Button>
                          )}
                          <Button
                            variant="perigo"
                            className="px-3 py-1.5 text-xs"
                            disabled={busy !== null}
                            onClick={() =>
                              act(
                                p.id,
                                "admin_ban_user",
                                { p_user_id: p.user_id, p_ban: !p.author_banned },
                                p.author_banned ? "Desbanir a conta?" : "Banir a conta? Tudo o que ela tem no ar sai do mapa.",
                              )
                            }
                          >
                            {p.author_banned ? "Desbanir autor" : "Banir autor"}
                          </Button>
                          {busy === p.id && <Spinner />}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="rotulo mb-3">Perguntas · {requests.length}</h2>
            {requests.length === 0 ? (
              <EmptyState title="Nenhuma pergunta denunciada" />
            ) : (
              <ul className="flex flex-col gap-3">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                    <p className="text-sm font-medium">{r.question}</p>
                    <p className="rotulo flex flex-wrap gap-x-3">
                      <span className={STATUS[r.status]?.tone}>{STATUS[r.status]?.label}</span>
                      <span>{timeAgo(r.created_at)}</span>
                      <span className="text-danger">{r.report_count} denúncias</span>
                      <span>{r.answer_count} respostas</span>
                      <Link href={`/admin/usuarios/${r.user_id}`} className="hover:text-accent">
                        ver autor{r.author_banned ? " · banido" : ""}
                      </Link>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secundario"
                        className="px-3 py-1.5 text-xs"
                        disabled={busy !== null}
                        onClick={() => act(r.id, "admin_set_request", { p_id: r.id, p_visible: r.status !== "open" })}
                      >
                        {r.status === "open" ? "Esconder" : "Restaurar"}
                      </Button>
                      <Button
                        variant="perigo"
                        className="px-3 py-1.5 text-xs"
                        disabled={busy !== null}
                        onClick={() => act(r.id, "admin_ban_user", { p_user_id: r.user_id, p_ban: !r.author_banned }, r.author_banned ? "Desbanir a conta?" : "Banir a conta?")}
                      >
                        {r.author_banned ? "Desbanir autor" : "Banir autor"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
