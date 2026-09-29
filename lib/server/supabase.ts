import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | undefined;

// service_role: ignora RLS. Só no servidor, nunca exposto ao navegador.
export function adminClient() {
  admin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return admin;
}

// Quem está chamando a rota: valida o JWT do Supabase enviado pelo navegador
export async function userFromRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  return error ? null : data.user;
}

// Post pendente do próprio usuário (a única coisa que ele pode enviar/publicar)
export async function ownPendingPost(id: string, userId: string) {
  const { data } = await adminClient()
    .from("posts")
    .select("id, photo_path, status, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.user_id !== userId || data.status !== "pending" || !data.photo_path) return null;
  return data as { id: string; photo_path: string };
}
