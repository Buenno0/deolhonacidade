import type { Category } from "./categories";

export const POST_LIFETIME_MS = 12 * 60 * 60 * 1000;

export type PostProperties = {
  id: string;
  category: Category;
  caption: string | null;
  photo_path: string;
  created_at: string;
  expires_at: string;
  confirm_count: number;
  deny_count: number;
  last_confirmed_at: string | null;
  request_id: string | null;
  view_count: number;
  share_count: number;
  author_level?: number;
  author_nickname?: string | null;
  // Divulgação (categoria estabelecimento)
  business_name?: string | null;
  business_segment?: string | null;
  business_whatsapp?: string | null;
  business_instagram?: string | null;
  // Histórico: até quando a foto fica guardada depois de sumir do mapa
  archived_until?: string | null;
};

export type PostsCollection = GeoJSON.FeatureCollection<GeoJSON.Point, PostProperties>;
export type PostFeature = PostsCollection["features"][number];

export function timeAgo(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;
}

// Relógio de missão: quanto falta para sumir, em HH:MM
export function countdown(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 60000));
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

// Fração de vida que resta, de 1 (acabou de nascer) a 0 (vai sumir)
export function remaining(p: Pick<PostProperties, "created_at" | "expires_at">, now = Date.now()) {
  const start = new Date(p.created_at).getTime();
  const end = new Date(p.expires_at).getTime();
  return Math.min(1, Math.max(0, (end - now) / Math.max(1, end - start)));
}

export const isFresh = (iso: string, now = Date.now()) => now - new Date(iso).getTime() < 10 * 60 * 1000;

export function distance([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

export type RequestProperties = {
  id: string;
  question: string;
  answer_count: number;
  created_at: string;
  expires_at: string;
};
export type RequestFeature = GeoJSON.Feature<GeoJSON.Point, RequestProperties>;

export function timeLeftShort(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;
}

// Trends. Engajamento: ver vale 1, confirmar 4, compartilhar 6, e cada
// "acabou" tira 2. "Em alta" divide pelo tempo de vida (gravidade 1.3, como
// no Hacker News): um post de 20 min com 10 visualizações passa na frente de
// um de 8h com 30.
export function engagement(p: PostProperties) {
  return p.view_count + 4 * p.confirm_count + 6 * p.share_count - 2 * p.deny_count;
}

export function hotness(p: PostProperties, now = Date.now()) {
  const hours = Math.max(0, (now - new Date(p.created_at).getTime()) / 36e5);
  return (Math.max(0, engagement(p)) + 1) / Math.pow(hours + 2, 1.3);
}

// Em alta: os 3 primeiros por hotness entre os posts ativos que já tiveram
// algum engajamento de verdade. Divulgação não concorre.
export const TRENDING_TOP = 3;
export const TRENDING_MIN_ENGAGEMENT = 5;
export function trendingRanks(posts: PostFeature[], now = Date.now()) {
  const ranked = posts
    .filter((f) => f.properties.category !== "estabelecimento" && engagement(f.properties) >= TRENDING_MIN_ENGAGEMENT)
    .sort((a, b) => hotness(b.properties, now) - hotness(a.properties, now))
    .slice(0, TRENDING_TOP);
  return new Map(ranked.map((f, i) => [f.properties.id, i + 1]));
}
