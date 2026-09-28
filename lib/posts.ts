import type { Category } from "./categories";

export type PostProperties = {
  id: string;
  category: Category;
  caption: string | null;
  photo_path: string;
  created_at: string;
  expires_at: string;
};

export type PostsCollection = GeoJSON.FeatureCollection<GeoJSON.Point, PostProperties>;

export function timeAgo(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  return `há ${Math.floor(min / 60)}h`;
}

export function timeLeft(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.round((new Date(iso).getTime() - now) / 60000));
  if (min < 60) return `some em ${min} min`;
  return `some em ${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
}
