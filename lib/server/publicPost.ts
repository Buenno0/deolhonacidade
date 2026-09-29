import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Category } from "@/lib/categories";

export type PublicPost = {
  id: string;
  category: Category;
  caption: string | null;
  photo_path: string | null;
  created_at: string;
  expires_at: string;
  alive: boolean;
  confirm_count: number;
  lng: number;
  lat: number;
};

// Mesma leitura pública do app (anon key), deduplicada entre a página e a imagem
export const getPublicPost = cache(async (id: string): Promise<PublicPost | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await supabase.rpc("public_post", { p_id: id });
  return (data as PublicPost | null) ?? null;
});
