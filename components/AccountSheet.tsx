"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { CATEGORIES, type Category } from "@/lib/categories";
import { photoUrl, thumbUrl } from "@/lib/media";
import { timeAgo, timeLeftShort } from "@/lib/posts";
import Sheet from "./Sheet";
import { Button, Spinner, cx } from "./ui";
import { CategoryIcon, CheckIcon, EyeIcon } from "./ui/icons";

type MyPost = {
  id: string;
  category: Category;
  caption: string | null;
  photo_path: string | null;
  status: "published" | "hidden" | "expired";
  created_at: string;
  expires_at: string;
  view_count: number;
  confirm_count: number;
  deny_count: number;
};

const STATUS = {
  published: { label: "no ar", tone: "text-ok" },
  hidden: { label: "escondido", tone: "text-danger" },
  expired: { label: "sumiu", tone: "text-muted" },
};

type Props = { session: Session; onClose: () => void; onSignedOut: (text: string) => void; onChanged: () => void };

export default function AccountSheet({ session, onClose, onSignedOut, onChanged }: Props) {
  const supabase = getSupabase();
  const [posts, setPosts] = useState<MyPost[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () => supabase.rpc("my_posts").then(({ data }) => setPosts((data as MyPost[]) ?? [])),
    [supabase],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function removePost(id: string) {
    if (!confirm("Apagar este post? Ele sai do mapa na hora.")) return;
    setBusy(id);
    const { error } = await supabase.rpc("delete_my_post", { p_id: id });
    if (error) setError(error.message);
    await load();
    onChanged();
    setBusy(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    onSignedOut("Você saiu da conta");
  }

  async function deleteAccount() {
    setBusy("conta");
    setError(null);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "EXCLUIR" }),
    });
    if (!res.ok) {
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Não foi possível excluir a conta");
      setBusy(null);
      return;
    }
    await supabase.auth.signOut();
    onSignedOut("Conta excluída");
  }

  return (
    <Sheet eyebrow="Conta" title={session.user.email ?? "Minha conta"} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <section>
          <p className="rotulo mb-2">Meus posts · últimos 7 dias</p>
          {posts === null ? (
            <Spinner />
          ) : posts.length === 0 ? (
            <p className="text-sm text-muted">Você ainda não registrou nada.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {posts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-bg p-2 pr-3">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-elev">
                    {p.photo_path && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl(p.photo_path)}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.dataset.fallback) {
                            img.dataset.fallback = "1";
                            img.src = photoUrl(p.photo_path!);
                          }
                        }}
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-xs">
                      <CategoryIcon category={p.category} width="1.1em" height="1.1em" />
                      {CATEGORIES[p.category].label}
                      <span className={cx("rotulo", STATUS[p.status].tone)}>{STATUS[p.status].label}</span>
                    </span>
                    {p.caption && <span className="block truncate text-sm">{p.caption}</span>}
                    <span className="rotulo mt-0.5 flex flex-wrap gap-x-3">
                      <span>{timeAgo(p.created_at)}</span>
                      {p.status === "published" && <span>some em {timeLeftShort(p.expires_at)}</span>}
                      <span className="inline-flex items-center gap-1">
                        <EyeIcon width="1em" height="1em" /> {p.view_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CheckIcon width="1em" height="1em" /> {p.confirm_count}
                      </span>
                    </span>
                  </span>
                  {p.status !== "expired" && (
                    <Button variant="perigo" className="px-2.5 py-1.5 text-xs" disabled={busy !== null} onClick={() => removePost(p.id)}>
                      {busy === p.id ? <Spinner /> : "Apagar"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <Button variant="secundario" onClick={signOut}>
          Sair da conta
        </Button>

        <section className="rounded-xl border border-line p-3">
          {!deleting ? (
            <Button variant="perigo" onClick={() => setDeleting(true)} className="w-full">
              Excluir minha conta
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                Isso tira do mapa tudo o que você publicou, apaga as fotos e os alertas, e não dá para desfazer. Digite{" "}
                <span className="num font-medium text-danger">EXCLUIR</span> para confirmar.
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoCapitalize="characters"
                aria-label="Digite EXCLUIR para confirmar"
                className="rounded-lg border border-line bg-bg px-3 py-2 text-base outline-none focus:border-danger"
              />
              <div className="flex gap-2">
                <Button variant="secundario" className="flex-1" onClick={() => setDeleting(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-danger text-bg"
                  disabled={confirmText.trim().toUpperCase() !== "EXCLUIR" || busy !== null}
                  onClick={deleteAccount}
                >
                  {busy === "conta" && <Spinner />} Excluir de vez
                </Button>
              </div>
            </div>
          )}
        </section>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
