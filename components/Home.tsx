"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { waitPublished } from "@/lib/posting";
import { markSeen, useSeen } from "@/lib/seen";
import { locationWorkedBefore, permissionState } from "@/lib/useLocation";
import { CITY } from "@/lib/city";
import { ALL_CATEGORY_KEYS, CATEGORIES, type Category } from "@/lib/categories";
import { formatDistance, trendingRanks, type PostFeature, type PostsCollection, type RequestFeature } from "@/lib/posts";
import type { Business } from "@/lib/business";
import BusinessSheet from "./BusinessSheet";
import { HistoryList, HistoryRuler, cityDay, shortDay } from "./HistoryView";
import { useTheme } from "@/lib/theme";
import { useMapType } from "@/lib/mapType";
import AccountSheet from "./AccountSheet";
import AchievementOverlay, { type Celebration } from "./AchievementOverlay";
import type { Progress } from "@/lib/progress";
import AlertsSheet from "./AlertsSheet";
import AskPanel from "./AskPanel";
import AuthSheet, { PENDING_TERMS_KEY, PENDING_THEN_KEY } from "./AuthSheet";
import LiveStrip from "./LiveStrip";
import MapTypePicker, { type HeatMode } from "./MapTypePicker";
import LandmarkSheet from "./LandmarkSheet";
import NewPostSheet from "./NewPostSheet";
import type { Landmark } from "@/lib/landmarks";
import OutOfArea from "./OutOfArea";
import InstallHint, { shouldOfferInstall } from "./InstallHint";
import { dismiss, locateCity, onLocationGranted, silentPosition, wasDismissed, type NearestCity } from "@/lib/cityCheck";
import PostViewer from "./PostViewer";
import RequestSheet from "./RequestSheet";
import TrendsView from "./TrendsView";
import Mark from "./ui/Mark";
import BetaTag from "./ui/BetaTag";
import { Button, Chip, EmptyState, IconButton, Spinner, cx } from "./ui";
import {
  ArchiveIcon,
  BellIcon,
  CameraIcon,
  CategoryIcon,
  FlagIcon,
  LocateIcon,
  MapIcon,
  MoonIcon,
  QuestionIcon,
  SunIcon,
  TrendIcon,
  UserIcon,
} from "./ui/icons";

// MapLibre usa window/WebGL, então só roda no navegador
const CityMap = dynamic(() => import("./map/CityMap"), { ssr: false });

type AfterLogin = "new" | "ask" | "alerts" | "account" | null;
type Panel =
  | { kind: "viewer"; ids: string[] | null; startId: string }
  | { kind: "new"; request: { id: string; question: string } | null; photo?: File | null }
  | { kind: "auth"; then: AfterLogin }
  | { kind: "request"; id: string }
  | { kind: "alerts" }
  | { kind: "account" }
  | { kind: "landmark"; id: string }
  | { kind: "business" }
  | null;

type Tab = "mapa" | "trends" | "historico";

type Toast = { text: string; postId?: string };

async function fetchActivePosts(): Promise<PostFeature[]> {
  const { data, error } = await getSupabase().rpc("active_posts", { p_city_id: CITY.id });
  if (error) throw error;
  const now = Date.now();
  return (data as PostsCollection).features
    .filter((f) => new Date(f.properties.expires_at).getTime() > now)
    .sort((a, b) => b.properties.created_at.localeCompare(a.properties.created_at));
}

async function fetchHistory(day: string): Promise<PostFeature[]> {
  const { data, error } = await getSupabase().rpc("history_posts", { p_city_id: CITY.id, p_day: day });
  if (error) throw error;
  return (data as PostsCollection).features;
}

async function fetchRequests(): Promise<RequestFeature[]> {
  const { data, error } = await getSupabase().rpc("active_requests", { p_city_id: CITY.id });
  if (error) throw error;
  return (data as GeoJSON.FeatureCollection<GeoJSON.Point>).features as RequestFeature[];
}

export default function Home() {
  const supabase = getSupabase();
  const { theme, toggle } = useTheme();
  const mapType = useMapType();
  const params = useSearchParams();
  const [posts, setPosts] = useState<PostFeature[] | null>(null);
  const [requests, setRequests] = useState<RequestFeature[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [filter, setFilter] = useState<Category | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [termsUserId, setTermsUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const termsOk = Boolean(session && termsUserId === session.user.id);
  const [panel, setPanel] = useState<Panel>(null);
  const [asking, setAsking] = useState(false);
  const [tab, setTab] = useState<Tab>(params.get("historico") ? "historico" : "mapa");
  const [today] = useState(() => cityDay(new Date()));
  const [historyCounts, setHistoryCounts] = useState<Record<string, number> | null>(null);
  const [historyDay, setHistoryDay] = useState<string | null>(() => {
    const d = params.get("historico");
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  });
  const [historyPosts, setHistoryPosts] = useState<PostFeature[] | null>(null);
  const [historyList, setHistoryList] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [heatMode, setHeatMode] = useState<HeatMode>("off");
  const [heatHistory, setHeatHistory] = useState<GeoJSON.FeatureCollection | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  // O que já foi festejado nesta visita (duas buscas seguidas não repetem a festa)
  const celebrated = useRef(new Set<string>());
  const [installHint, setInstallHint] = useState(false);
  const seen = useSeen();
  // Posts meus ainda sendo protegidos: aparecem na hora, com a prévia desfocada
  const [pending, setPending] = useState<Record<string, PostFeature>>({});
  const dropPending = (id: string) =>
    setPending((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  const [outside, setOutside] = useState<{ nearest: NearestCity; from: [number, number] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ownPosts = useRef(new Set<string>());
  const knownIds = useRef<Set<string> | null>(null);
  const center = useRef<[number, number] | null>(null);
  // Link direto (/?post=… vindo da página de compartilhar, /?pedido=… do alerta)
  const deepLink = useRef({ post: params.get("post"), pedido: params.get("pedido"), historico: params.get("historico") });

  const clearDeepLink = () => window.history.replaceState(null, "", "/");

  const loadPosts = useCallback(
    () =>
      fetchActivePosts().then(
        (list) => {
          setError(null);
          setPosts(list);
          // Post novo de outra pessoa: avisa, com atalho para ver
          const known = knownIds.current;
          if (known) {
            const fresh = list.find((f) => !known.has(f.properties.id) && !ownPosts.current.has(f.properties.id));
            if (fresh) setToast({ text: `Novo: ${CATEGORIES[fresh.properties.category].label}`, postId: fresh.properties.id });
          }
          knownIds.current = new Set(list.map((f) => f.properties.id));
          const wanted = deepLink.current.historico ? null : deepLink.current.post;
          if (wanted) {
            deepLink.current.post = null;
            clearDeepLink();
            const f = list.find((x) => x.properties.id === wanted);
            if (f) setPanel({ kind: "viewer", ids: null, startId: wanted });
            else setToast({ text: "Esse registro já sumiu do mapa" });
          }
        },
        (e) => {
          console.error("Falha ao carregar posts", e);
          setError("Não foi possível carregar o mapa agora.");
        },
      ),
    [],
  );

  const loadRequests = useCallback(
    () =>
      fetchRequests().then(
        (list) => {
          setRequests(list);
          const wanted = deepLink.current.pedido;
          if (wanted) {
            deepLink.current.pedido = null;
            clearDeepLink();
            const r = list.find((x) => x.properties.id === wanted);
            if (r) {
              setPanel({ kind: "request", id: wanted });
              setFocus(r.geometry.coordinates as [number, number]);
            } else setToast({ text: "Esse pedido já fechou" });
          }
        },
        (e) => console.error("Falha ao carregar pedidos", e),
      ),
    [],
  );

  // Histórico: os dias com algo guardado, e os posts do dia escolhido
  useEffect(() => {
    if (tab !== "historico" || historyCounts) return;
    supabase.rpc("history_days", { p_city_id: CITY.id }).then(({ data }) => {
      const list = (data as { day: string; n: number }[]) ?? [];
      setHistoryCounts(Object.fromEntries(list.map((d) => [d.day, d.n])));
      setHistoryDay((cur) => cur ?? list[0]?.day ?? null);
    });
  }, [supabase, tab, historyCounts]);

  useEffect(() => {
    if (tab !== "historico" || !historyDay) return;
    let off = false;
    fetchHistory(historyDay).then(
      (list) => {
        if (off) return;
        setHistoryPosts(list);
        // Leva o mapa até o registro mais recente do dia
        const last = list[list.length - 1];
        if (last) setFocus(last.geometry.coordinates as [number, number]);
        const wanted = deepLink.current.historico ? deepLink.current.post : null;
        if (deepLink.current.historico) {
          deepLink.current = { ...deepLink.current, historico: null, post: null };
          // O dia fica no endereço (dá para compartilhar); o post sai
          window.history.replaceState(null, "", `/?historico=${historyDay}`);
        }
        if (wanted) {
          if (list.some((f) => f.properties.id === wanted)) setPanel({ kind: "viewer", ids: null, startId: wanted });
          else setToast({ text: "Esse registro saiu do histórico" });
        }
      },
      () => !off && setToast({ text: "Não foi possível carregar o histórico" }),
    );
    return () => {
      off = true;
    };
  }, [tab, historyDay]);

  // Marcos: fixos, carregados uma vez
  useEffect(() => {
    supabase.rpc("city_landmarks", { p_city_id: CITY.id }).then(({ data }) => setLandmarks((data as Landmark[]) ?? []));
  }, [supabase]);

  useEffect(() => {
    loadPosts();
    loadRequests();
    const interval = setInterval(() => {
      loadPosts();
      loadRequests();
    }, 60_000);
    const channel = supabase
      .channel(`city:${CITY.id}`)
      .on("broadcast", { event: "post_changed" }, () => loadPosts())
      .on("broadcast", { event: "request_changed" }, () => loadRequests())
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [supabase, loadPosts, loadRequests]);

  // Progresso (XP, nível, conquistas). Conquista nova ou nível novo viram festa.
  const refreshProgress = useCallback(
    (userId: string) =>
      supabase.rpc("my_progress").then(({ data }) => {
        if (!data) return;
        const p = data as Progress;
        setProgress(p);
        const fresh = (key: string) => !celebrated.current.has(key) && Boolean(celebrated.current.add(key));
        const queue: Celebration[] = p.badges
          .filter((b) => !b.seen && fresh(`${b.badge}:${b.tier}`))
          .map((b) => ({ kind: "badge", badge: b.badge, tier: b.tier }));
        const key = `deolho-nivel-${userId}`;
        let stored: number | null = null;
        try {
          stored = Number(localStorage.getItem(key)) || null;
          localStorage.setItem(key, String(p.level));
        } catch {
          // sem armazenamento: não comemora nível, só conquista
        }
        if (stored && p.level > stored && fresh(`nivel:${p.level}`)) queue.push({ kind: "level", level: p.level });
        if (queue.length) {
          setCelebrations((q) => [...q, ...queue]);
          // O builder do supabase-js só executa com then/await
          supabase.rpc("mark_badges_seen").then(() => {});
        }
      }),
    [supabase],
  );
  const refreshMine = () => session && refreshProgress(session.user.id);

  useEffect(() => {
    if (!session) return;
    Promise.resolve().then(() => refreshProgress(session.user.id));
  }, [session, refreshProgress]);

  // Abriu o app longe da cidade? Só confere se a localização já foi liberada antes
  // e também se ela liberar a localização no meio da visita
  useEffect(() => {
    const check = () => {
      if (wasDismissed()) return;
      silentPosition().then(async (p) => {
        if (!p) return;
        const at: [number, number] = [p.coords.longitude, p.coords.latitude];
        const r = await locateCity(at[1], at[0]);
        if (r && r.inside === null) setOutside({ nearest: r.nearest, from: at });
        else if (r) setUserPos(at);
      });
    };
    check();
    return onLocationGranted(check);
  }, []);

  // Onde a pessoa está, e o que fazer se for fora de uma cidade atendida
  const handlePosition = useCallback(async (at: [number, number], fly: boolean) => {
    const r = await locateCity(at[1], at[0]);
    if (r && r.inside === null) {
      setOutside({ nearest: r.nearest, from: at });
      return false;
    }
    setUserPos(at);
    if (fly) setFocus(at);
    return true;
  }, []);

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
      .then(async ({ data }) => {
        // Voltando do Google: os termos foram aceitos antes de sair
        let pending = false;
        let then: string | null = null;
        try {
          pending = sessionStorage.getItem(PENDING_TERMS_KEY) === "1";
          then = sessionStorage.getItem(PENDING_THEN_KEY);
          sessionStorage.removeItem(PENDING_TERMS_KEY);
          sessionStorage.removeItem(PENDING_THEN_KEY);
        } catch {
          // sem armazenamento: os termos aparecem na próxima ação
        }
        if (!data?.accepted_terms_at && pending) {
          const { error } = await supabase.rpc("accept_terms");
          if (!error) {
            setTermsUserId(session.user.id);
            if (then === "new") setPanel({ kind: "new", request: null });
            else if (then === "alerts") setPanel({ kind: "alerts" });
            else if (then === "account") setPanel({ kind: "account" });
            else if (then === "ask") setAsking(true);
            return;
          }
        }
        setTermsUserId(data?.accepted_terms_at ? session.user.id : null);
      });
    supabase.rpc("am_i_admin").then(({ data }) => setIsAdmin(Boolean(data)));
    supabase.rpc("my_business").then(({ data }) => setBusiness((data as Business | null) ?? null));
  }, [supabase, session]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  function chooseHeat(mode: HeatMode) {
    setHeatMode(mode);
    if (mode === "historico" && !heatHistory) {
      supabase.rpc("heat_history", { p_city_id: CITY.id, p_days: 30 }).then(({ data, error }) => {
        if (error) return setToast({ text: "Não foi possível carregar o histórico" });
        const fc = data as GeoJSON.FeatureCollection;
        setHeatHistory(fc);
        if (fc.features.length === 0) setToast({ text: "Ainda não há histórico suficiente (mínimo de 3 registros por lugar)" });
      });
    }
  }

  const visible = useMemo(() => {
    const list = (posts ?? []).map((f) =>
      // o servidor já mandou o meu post: carrega a prévia até a foto revelar
      pending[f.properties.id] ? { ...f, properties: { ...f.properties, preview: pending[f.properties.id].properties.preview } } : f,
    );
    const have = new Set(list.map((f) => f.properties.id));
    const mineNow = Object.values(pending).filter((f) => !have.has(f.properties.id));
    return [...mineNow, ...list].filter((f) => !filter || f.properties.category === filter);
  }, [posts, filter, pending]);
  // O que já pode ser visto: sem os que o servidor ainda está desfocando
  const ready = useMemo(() => visible.filter((f) => !f.properties.processing), [visible]);
  const counts = useMemo(() => {
    const c: Partial<Record<Category, number>> = {};
    for (const f of posts ?? []) c[f.properties.category] = (c[f.properties.category] ?? 0) + 1;
    return c;
  }, [posts]);
  // O número no balão conta só respostas visíveis (o banco não desconta as escondidas)
  const requestsShown = useMemo(
    () =>
      requests.map((r) => ({
        ...r,
        properties: {
          ...r.properties,
          answer_count: (posts ?? []).filter((f) => f.properties.request_id === r.properties.id).length,
        },
      })),
    [requests, posts],
  );
  const ranks = useMemo(() => trendingRanks(posts ?? []), [posts]);
  const inHistory = tab === "historico";
  const heat = useMemo(
    () => ({ now: heatMode === "agora", history: heatMode === "historico" ? heatHistory : null }),
    [heatMode, heatHistory],
  );

  const needLogin = (then: AfterLogin) => setPanel({ kind: "auth", then });
  const requireLogin = (then: Exclude<AfterLogin, null>, run: () => void) => (session && termsOk ? run() : needLogin(then));
  // Câmera primeiro: o toque em Registrar já abre a câmera (o navegador só
  // deixa abrir dentro do próprio toque); a foto chega pronta no formulário
  const camera = useRef<HTMLInputElement>(null);
  const geoGranted = useRef(false);
  useEffect(() => {
    let status: PermissionStatus | null = null;
    const read = () => (geoGranted.current = status?.state === "granted");
    permissionState().then((st) => (geoGranted.current = st === "granted"));
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((st) => {
        status = st;
        st.addEventListener("change", read);
      })
      .catch(() => {});
    return () => status?.removeEventListener("change", read);
  }, []);
  const startPost = () =>
    requireLogin("new", () => {
      // Câmera direto só com a localização já liberada. Sem ela, o formulário
      // abre primeiro e pede a localização num toque (com a câmera aberta, o
      // iPhone nega sem perguntar e guarda a negativa até recarregar)
      if ((geoGranted.current || locationWorkedBefore()) && camera.current) {
        camera.current.value = "";
        camera.current.click();
      } else setPanel({ kind: "new", request: null });
    });
  const startAsk = () =>
    requireLogin("ask", () => {
      setPanel(null);
      setAsking(true);
    });
  const openAlerts = () => requireLogin("alerts", () => setPanel({ kind: "alerts" }));
  const openAccount = () => requireLogin("account", () => setPanel({ kind: "account" }));
  const pickTab = (t: Tab) => {
    if (t !== "historico" && window.location.search.includes("historico")) clearDeepLink();
    setTab(t);
    setPanel(null);
    setActiveId(null);
  };
  const openViewer = (startId: string, ids: string[] | null = null) => setPanel({ kind: "viewer", ids, startId });

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => handlePosition([p.coords.longitude, p.coords.latitude], true),
      () => setToast({ text: "Não foi possível obter sua localização" }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  const pool = inHistory ? (historyPosts ?? []) : (posts ?? []);
  const shown = inHistory ? pool : ready;
  const viewerPosts =
    panel?.kind === "viewer"
      ? panel.ids
        ? panel.ids
            .map((id) => pool.find((f) => f.properties.id === id))
            .filter((f): f is PostFeature => Boolean(f) && !f!.properties.processing)
        : shown.some((f) => f.properties.id === panel.startId)
          ? shown
          : pool.filter((f) => !f.properties.processing) // o post pedido está fora do filtro: mostra todos
      : [];
  const openRequest = panel?.kind === "request" ? requests.find((r) => r.properties.id === panel.id) : undefined;
  const answersOf = (requestId: string) => (posts ?? []).filter((f) => f.properties.request_id === requestId);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg">
      <CityMap
        posts={inHistory ? pool : visible}
        seen={seen}
        archive={inHistory}
        theme={theme}
        mapType={mapType}
        focus={focus}
        activeId={activeId}
        userPos={userPos}
        requests={inHistory ? [] : requestsShown}
        heat={heat}
        onSelect={(id) =>
          posts?.find((f) => f.properties.id === id)?.properties.processing
            ? setToast({ text: "Protegendo rostos e placas… seu post aparece em instantes" })
            : openViewer(id)
        }
        onSelectMany={(ids) => openViewer(ids[0], ids)}
        onSelectRequest={(id) => setPanel({ kind: "request", id })}
        landmarks={landmarks}
        activeLandmark={panel?.kind === "landmark" ? panel.id : null}
        onSelectLandmark={(id) => {
          const l = landmarks.find((x) => x.id === id);
          if (l) setFocus([l.lng, l.lat]);
          setPanel({ kind: "landmark", id });
        }}
        onMove={(c) => (center.current = c)}
      />

      {/* Topo: marca, cidade, status ao vivo e filtros */}
      {/* Sem pointer-events-none aqui: no iPhone, rolagem horizontal dentro de um
          elemento com esse ancestral não rola (a barra de filtros travava) */}
      <header className="absolute inset-x-0 top-0 z-10 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-line bg-surface/90 py-2 pl-3 pr-2 backdrop-blur">
          <Mark size={40} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-display text-base font-bold leading-tight">
              De Olho <BetaTag />
            </p>
            <p className="rotulo truncate">
              {CITY.name} · {CITY.uf}
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1"
            aria-live="polite"
            aria-label={`${posts?.length ?? 0} posts ao vivo`}
          >
            {posts === null ? (
              <Spinner className="text-xs" />
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
              </span>
            )}
            <span className="rotulo hidden text-ink sm:inline">ao vivo</span>
            <span className="num text-xs text-ink">{String(posts?.length ?? 0).padStart(2, "0")}</span>
          </div>
          <IconButton label={theme === "dark" ? "Tema claro" : "Tema escuro"} onClick={toggle}>
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </IconButton>
        </div>

        {!asking && (
          <nav
            aria-label="Filtrar por categoria"
            className="no-scrollbar mx-auto mt-2 flex max-w-lg touch-pan-x items-center gap-2 overflow-x-auto overscroll-x-contain pb-1"
          >
            {/* Mapa | Trends | Histórico */}
            <div role="tablist" className="flex shrink-0 rounded-full border border-line bg-surface/90 p-0.5 backdrop-blur">
              {(
                [
                  ["mapa", "Mapa", MapIcon],
                  ["trends", "Trends", TrendIcon],
                  ["historico", "Histórico", ArchiveIcon],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => pickTab(id)}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition",
                    tab === id ? "bg-accent font-medium text-accent-ink" : "text-muted hover:text-ink",
                  )}
                >
                  <Icon width="1.1em" height="1.1em" /> {label}
                </button>
              ))}
            </div>
            {tab === "mapa" && (
              <Chip active={filter === null} onClick={() => setFilter(null)} className="shrink-0">
                Tudo
              </Chip>
            )}
            {inHistory && historyDay && (
              <span className="tag shrink-0 border border-line bg-surface/90 text-ink">Histórico · {shortDay(historyDay)}</span>
            )}
            {inHistory && historyPosts && historyPosts.length > 0 && (
              <Chip active={historyList} onClick={() => setHistoryList((v) => !v)} className="shrink-0">
                {historyList ? "Ver no mapa" : "Lista"}
              </Chip>
            )}
            {tab === "mapa" && ALL_CATEGORY_KEYS.filter((k) => counts[k]).map((k) => (
              <Chip key={k} active={filter === k} onClick={() => setFilter(filter === k ? null : k)} className="shrink-0">
                <CategoryIcon category={k} />
                {CATEGORIES[k].label}
                <span className="num opacity-70">{counts[k]}</span>
              </Chip>
            ))}
          </nav>
        )}
      </header>

      {tab === "trends" && (
        <section
          aria-label="Trends"
          className="absolute inset-0 z-[9] overflow-y-auto bg-bg px-4 pb-32 pt-[calc(max(0.75rem,env(safe-area-inset-top))+7.5rem)]"
        >
          <div className="mx-auto max-w-lg">
            <TrendsView posts={posts ?? []} onOpen={(id, ids) => openViewer(id, ids)} />
          </div>
        </section>
      )}

      {inHistory && historyList && historyPosts && (
        <section
          aria-label="Histórico do dia"
          className="absolute inset-0 z-[9] overflow-y-auto bg-bg px-4 pb-40 pt-[calc(max(0.75rem,env(safe-area-inset-top))+7.5rem)]"
        >
          <div className="mx-auto max-w-lg">
            <HistoryList posts={historyPosts} onOpen={(id, ids) => openViewer(id, ids)} />
          </div>
        </section>
      )}

      <div className={cx("absolute right-3 top-40 z-20 flex flex-col gap-2", (tab === "trends" || (inHistory && historyList)) && "hidden")}>
        <IconButton label="Minha localização" onClick={locate} className="h-11 w-11">
          <LocateIcon />
        </IconButton>
        <MapTypePicker theme={theme} heat={heatMode} onHeat={chooseHeat} />
        <IconButton label="Alertas perto de você" onClick={openAlerts} className="h-11 w-11">
          <BellIcon />
        </IconButton>
        <IconButton label="Minha conta" onClick={openAccount} className="h-11 w-11">
          <UserIcon />
        </IconButton>
        {isAdmin && (
          <Link
            href="/admin"
            aria-label="Moderação"
            title="Moderação"
            className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-muted hover:text-ink"
          >
            <FlagIcon />
          </Link>
        )}
      </div>

      {inHistory && historyCounts && Object.keys(historyCounts).length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-6">
          <div className="pointer-events-auto mx-auto max-w-xs">
            <EmptyState title="O histórico começa agora">
              Quem publica escolhe guardar a foto por 30 dias. Os registros guardados aparecem aqui, dia a dia, depois que somem do mapa.
            </EmptyState>
          </div>
        </div>
      )}

      {/* Estado vazio / erro, no meio do mapa */}
      {!asking && tab === "mapa" && (error || (posts !== null && visible.length === 0 && requests.length === 0 && heatMode === "off")) && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-6">
          <div className="pointer-events-auto mx-auto max-w-xs">
            {error ? (
              <EmptyState title="Sem sinal" action={<Button variant="secundario" onClick={loadPosts}>Tentar de novo</Button>}>
                {error}
              </EmptyState>
            ) : filter ? (
              <EmptyState
                title={`Nada de ${CATEGORIES[filter].label.toLowerCase()} agora`}
                action={<Button variant="secundario" onClick={() => setFilter(null)}>Ver tudo</Button>}
              />
            ) : (
              <EmptyState
                title="Tudo calmo por aqui"
                action={
                  <Button variant="secundario" onClick={startAsk}>
                    <QuestionIcon /> Perguntar o que está rolando
                  </Button>
                }
              >
                Nenhum registro agora. Viu algo acontecendo? Registre. Quer saber de algum lugar? Pergunte.
              </EmptyState>
            )}
          </div>
        </div>
      )}

      {asking ? (
        <>
          {/* A mira: o pedido vai para o centro do mapa */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
            <div className="pedido" style={{ animation: "none" }}>
              <QuestionIcon width="20" height="20" />
            </div>
          </div>
          <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <AskPanel
              getCenter={() => center.current}
              onCancel={() => setAsking(false)}
              onCreated={(id, at) => {
                setAsking(false);
                setToast({ text: "Pergunta no mapa por 2h · avisamos quem está perto" });
                refreshMine();
                setFocus(at);
                loadRequests();
                setPanel({ kind: "request", id });
              }}
            />
          </footer>
        </>
      ) : inHistory ? (
        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-bg via-bg/70 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
          <div className="pointer-events-auto mx-auto max-w-lg">
            <p className="rotulo mb-2">Últimos 30 dias · só o que quem postou escolheu guardar</p>
            <HistoryRuler
              counts={historyCounts ?? {}}
              day={historyDay}
              today={today}
              onPick={(d) => {
                setHistoryPosts(null);
                setHistoryDay(d);
              }}
            />
          </div>
        </footer>
      ) : (
        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-bg via-bg/70 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10">
          <div className="pointer-events-auto mx-auto max-w-lg">
            {tab === "mapa" && <LiveStrip posts={ready.slice(0, 20)} seen={seen} onOpen={(id) => openViewer(id)} />}
            <div className="mt-3 flex gap-2">
              <Button size="lg" variant="secundario" onClick={startAsk} aria-label="Perguntar: alguém aí?" className="px-4">
                <QuestionIcon />
                <span className="hidden sm:inline">Alguém aí?</span>
              </Button>
              <Button size="lg" onClick={startPost} className="flex-1 whitespace-nowrap">
                <CameraIcon />
                Registrar<span className="hidden sm:inline"> o que está rolando</span>
              </Button>
            </div>
          </div>
        </footer>
      )}

      {installHint && !panel && !outside && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <InstallHint onClose={() => setInstallHint(false)} />
        </div>
      )}
      {outside && !panel && (
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <OutOfArea
            nearest={outside.nearest}
            from={outside.from}
            onClose={() => {
              dismiss();
              setOutside(null);
            }}
            onGo={() => {
              dismiss();
              pickTab("mapa");
              setFocus([outside.nearest.lng, outside.nearest.lat]);
              setOutside(null);
            }}
          />
        </div>
      )}

      {toast && (
        <div className="absolute inset-x-0 top-36 z-30 flex justify-center px-4">
          <button
            onClick={() => {
              if (toast.postId) openViewer(toast.postId);
              setToast(null);
            }}
            className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
            {toast.text}
            {toast.postId && <span className="rotulo text-accent">ver</span>}
          </button>
        </div>
      )}

      {panel?.kind === "viewer" && viewerPosts.length > 0 && (
        <PostViewer
          posts={viewerPosts}
          startId={panel.startId}
          userPos={userPos}
          loggedIn={termsOk}
          ranks={ranks}
          archive={inHistory}
          seen={seen}
          onActive={(f) => {
            markSeen(f.properties.id);
            setActiveId(f.properties.id);
            setFocus(f.geometry.coordinates as [number, number]);
          }}
          onClose={() => {
            setPanel(null);
            setActiveId(null);
          }}
          onNeedLogin={() => needLogin(null)}
          onChanged={() => {
            if (!inHistory) loadPosts();
            refreshMine();
          }}
        />
      )}
      {panel?.kind === "request" && openRequest && (
        <RequestSheet
          request={openRequest.properties}
          answers={answersOf(openRequest.properties.id)}
          loggedIn={termsOk}
          onClose={() => setPanel(null)}
          onNeedLogin={() => needLogin(null)}
          onAnswer={() => setPanel({ kind: "new", request: { id: openRequest.properties.id, question: openRequest.properties.question } })}
          onOpenAnswer={(postId) => openViewer(postId, answersOf(openRequest.properties.id).map((f) => f.properties.id))}
        />
      )}
      {panel?.kind === "landmark" &&
        (() => {
          const l = landmarks.find((x) => x.id === panel.id);
          return l ? (
            <LandmarkSheet
              landmark={l}
              posts={posts ?? []}
              onClose={() => setPanel(null)}
              onOpenPost={(id, ids) => openViewer(id, ids)}
              onPostHere={startPost}
              onAskHere={() => {
                setFocus([l.lng, l.lat]);
                startAsk();
              }}
            />
          ) : null;
        })()}
      {panel?.kind === "alerts" && (
        <AlertsSheet
          getMapCenter={() => center.current}
          onClose={() => setPanel(null)}
          onSaved={(text) => {
            setPanel(null);
            setToast({ text });
          }}
        />
      )}
      {panel?.kind === "account" && session && (
        <AccountSheet
          session={session}
          progress={progress}
          onProgressChanged={refreshMine}
          business={business}
          onOpenBusiness={() => setPanel({ kind: "business" })}
          onClose={() => setPanel(null)}
          onChanged={loadPosts}
          onSignedOut={(text) => {
            setPanel(null);
            setSession(null);
            setProgress(null);
            setTermsUserId(null);
            setIsAdmin(false);
            setBusiness(null);
            setToast({ text });
            loadPosts();
          }}
        />
      )}
      {panel?.kind === "auth" && (
        <AuthSheet
          session={session}
          then={panel.then}
          onClose={() => setPanel(null)}
          onDone={(userId) => {
            setTermsUserId(userId);
            const then = panel.then;
            if (then === "new") setPanel({ kind: "new", request: null });
            else if (then === "alerts") setPanel({ kind: "alerts" });
            else if (then === "account") setPanel({ kind: "account" });
            else if (then === "ask") {
              setPanel(null);
              setAsking(true);
            } else setPanel(null);
          }}
        />
      )}
      {panel?.kind === "business" && (
        <BusinessSheet
          business={business}
          onClose={() => setPanel({ kind: "account" })}
          onSaved={(b) => {
            setBusiness(b);
            setPanel({ kind: "account" });
            setToast({ text: "Pedido enviado · a moderação vai conferir" });
          }}
        />
      )}
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPanel({ kind: "new", request: null, photo: f });
        }}
      />
      {panel?.kind === "new" && (
        <NewPostSheet
          initialPhoto={panel.photo ?? null}
          request={panel.request}
          business={business?.status === "approved" ? business : null}
          onClose={() => setPanel(null)}
          onOutOfArea={(at) => {
            setPanel(null);
            handlePosition(at, false);
          }}
          onPosted={(id, at, accuracy, processing, blurred, category) => {
            ownPosts.current.add(id);
            setPanel(null);
            // Depois do primeiro post, o convite para instalar
            if (shouldOfferInstall()) setTimeout(() => setInstallHint(true), 4000);
            const near = accuracy > 100 ? ` · ±${formatDistance(accuracy)}` : "";
            if (processing) {
              // O pin pousa na hora com a prévia desfocada (feita no aparelho),
              // enquanto o servidor protege rostos e placas
              const now = new Date();
              setPending((m) => ({
                ...m,
                [id]: {
                  type: "Feature",
                  geometry: { type: "Point", coordinates: at },
                  properties: {
                    id,
                    category,
                    caption: null,
                    photo_path: "",
                    created_at: now.toISOString(),
                    expires_at: new Date(now.getTime() + 12 * 3600e3).toISOString(),
                    confirm_count: 0,
                    deny_count: 0,
                    last_confirmed_at: null,
                    request_id: null,
                    view_count: 0,
                    share_count: 0,
                    mine: true,
                    processing: true,
                    preview: blurred,
                  },
                },
              }));
              setToast({ text: `Protegendo rostos e placas…${near}` });
              waitPublished(id).then((r) => {
                loadPosts();
                refreshMine();
                // a prévia sai depois que a foto de verdade já revelou no pin
                setTimeout(() => dropPending(id), 1500);
                const shielded = r.faces + r.plates;
                const what = [
                  r.faces ? `${r.faces} ${r.faces === 1 ? "rosto" : "rostos"}` : "",
                  r.plates ? `${r.plates} ${r.plates === 1 ? "placa" : "placas"}` : "",
                ]
                  .filter(Boolean)
                  .join(" e ");
                if (r.status === "published")
                  setToast({ text: shielded ? `No ar · ${what} ${shielded === 1 ? "protegido" : "protegidos"}` : "No ar", postId: id });
                else if (r.status === "hidden") {
                  dropPending(id);
                  setToast({ text: "A foto não foi publicada: a verificação automática encontrou conteúdo impróprio" });
                } else setToast({ text: "A verificação está demorando. Seu post aparece assim que terminar." });
              });
            } else setToast({ text: `Publicado${near}`, postId: id });
            setUserPos(at);
            setFocus(at);
            loadPosts();
            loadRequests();
            refreshMine();
          }}
        />
      )}
      {celebrations.length > 0 && (
        <AchievementOverlay
          item={celebrations[0]}
          remaining={celebrations.length - 1}
          onNext={() => setCelebrations((q) => q.slice(1))}
          onSeeAll={() => {
            setCelebrations([]);
            setPanel({ kind: "account" });
          }}
        />
      )}
    </main>
  );
}
