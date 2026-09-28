"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { CITY } from "@/lib/city";
import type { PostProperties, PostsCollection } from "@/lib/posts";
import AuthSheet from "./AuthSheet";
import NewPostSheet from "./NewPostSheet";
import PostSheet from "./PostSheet";

// MapLibre usa window/WebGL, então só roda no navegador
const CityMap = dynamic(() => import("./map/CityMap"), { ssr: false });

const EMPTY: PostsCollection = { type: "FeatureCollection", features: [] };

async function fetchActivePosts(): Promise<PostsCollection> {
  const { data, error } = await getSupabase().rpc("active_posts", { p_city_id: CITY.id });
  if (error) throw error;
  const collection = data as PostsCollection;
  const now = Date.now();
  // Tira do mapa o que venceu entre um carregamento e outro
  collection.features = collection.features.filter((f) => new Date(f.properties.expires_at).getTime() > now);
  return collection;
}

type Panel = { kind: "post"; post: PostProperties } | { kind: "new" } | { kind: "auth"; then: "new" | null } | null;

export default function Home() {
  const supabase = getSupabase();
  const [posts, setPosts] = useState<PostsCollection>(EMPTY);
  const [session, setSession] = useState<Session | null>(null);
  // id do usuário que já aceitou os termos (evita estado sobrando após logout)
  const [termsUserId, setTermsUserId] = useState<string | null>(null);
  const termsOk = Boolean(session && termsUserId === session.user.id);
  const [panel, setPanel] = useState<Panel>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadPosts = useCallback(
    () =>
      fetchActivePosts().then(setPosts, (error) => console.error("Falha ao carregar posts", error)),
    [],
  );

  useEffect(() => {
    loadPosts();
    const interval = setInterval(loadPosts, 60_000);
    const channel = supabase
      .channel(`city:${CITY.id}`)
      .on("broadcast", { event: "post_changed" }, () => loadPosts())
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [supabase, loadPosts]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("accepted_terms_at")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setTermsUserId(data?.accepted_terms_at ? session.user.id : null));
  }, [supabase, session]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const startPost = () => setPanel(session && termsOk ? { kind: "new" } : { kind: "auth", then: "new" });

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <CityMap posts={posts} focus={focus} onSelect={(post) => setPanel({ kind: "post", post })} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
        <div className="pointer-events-auto inline-flex flex-col rounded-xl bg-white/90 px-3 py-2 shadow backdrop-blur dark:bg-neutral-900/90">
          <span className="text-sm font-semibold">👀 De Olho na Cidade</span>
          <span className="text-xs text-neutral-500">
            {CITY.name}/{CITY.uf} · {posts.features.length} {posts.features.length === 1 ? "post agora" : "posts agora"}
          </span>
        </div>
      </header>

      <button
        onClick={startPost}
        className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-10 -translate-x-1/2 rounded-full bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg active:scale-95"
      >
        📷 Postar
      </button>

      {toast && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow">{toast}</div>
      )}

      {panel?.kind === "post" && (
        <PostSheet
          post={panel.post}
          loggedIn={Boolean(session && termsOk)}
          onClose={() => setPanel(null)}
          onNeedLogin={() => setPanel({ kind: "auth", then: null })}
        />
      )}
      {panel?.kind === "auth" && (
        <AuthSheet
          session={session}
          onClose={() => setPanel(null)}
          onDone={() => {
            if (session) setTermsUserId(session.user.id);
            setPanel(panel.then === "new" ? { kind: "new" } : null);
          }}
        />
      )}
      {panel?.kind === "new" && (
        <NewPostSheet
          onClose={() => setPanel(null)}
          onPosted={(at) => {
            setPanel(null);
            setToast("Postado! Some do mapa em 12h");
            setFocus(at);
            loadPosts();
          }}
        />
      )}
    </main>
  );
}
