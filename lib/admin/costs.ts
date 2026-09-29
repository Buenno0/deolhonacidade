// Busca os custos da AWS na rota do servidor, com o token da sessão
import { getSupabase } from "@/lib/supabase/client";
import type { AwsCosts } from "./types";

export async function loadCosts(): Promise<{ data: AwsCosts } | { error: string }> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "Sessão expirada. Entre de novo." };
  const res = await fetch("/api/admin/custos", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  if (!res) return { error: "Sem conexão." };
  const body = await res.json().catch(() => ({}));
  return res.ok ? { data: body as AwsCosts } : { error: body.error ?? `Erro ${res.status}` };
}
