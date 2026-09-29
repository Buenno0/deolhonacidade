"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES, type Category } from "@/lib/categories";
import { photoUrl } from "@/lib/media";
import { timeAgo } from "@/lib/posts";
import Mark from "@/components/ui/Mark";
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
// Só abre para contas com profiles.is_admin; o banco confere em cada ação.
export default function Admin() {
  const supabase = getSupabase();
  const [state, setState] = useState<"carregando" | "sem-login" | "negado" | "ok">("carregando");
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [requests, setRequests] = useState<QueueRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return setState("sem-login");
    const { data, error } = await supabase.rpc("admin_queue");
    if (error) return setState("negado");
    setPosts(data.posts);
    setRequests(data.requests);
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
    setBusy(null);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="flex items-center gap-3">
        <Mark size={36} className="shrink-0" />
        <div className="flex-1">
          <p className="rotulo">moderação</p>
          <h1 className="font-display text-2xl font-bold">Fila de revisão</h1>
        </div>
        <Link href="/" className="rotulo text-accent">
          ← mapa
        </Link>
      </header>

      {state === "carregando" && (
        <div className="mt-16 flex justify-center">
          <Spinner />
        </div>
      )}
      {state === "sem-login" && (
        <div className="mt-10">
          <EmptyState title="Entre para moderar" action={<Link href="/" className="text-accent underline">Ir ao mapa e entrar</Link>} />
        </div>
      )}
      {state === "negado" && (
        <div className="mt-10">
          <EmptyState title="Acesso restrito">Esta conta não faz parte da moderação.</EmptyState>
        </div>
      )}

      {state === "ok" && (
        <>
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <section className="mt-8">
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
                          <span>autor: {p.author_posts} posts{p.author_banned ? " · banido" : ""}</span>
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
    </main>
  );
}
