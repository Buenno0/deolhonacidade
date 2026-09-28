import { createClient } from "@supabase/supabase-js";

// Limpeza das fotos vencidas. Rode a cada 10 min com um agendador externo
// (GitHub Actions, cron-job.org, Supabase pg_cron + pg_net...) enviando
// "Authorization: Bearer $CRON_SECRET". O mapa já esconde os posts vencidos
// sozinho; aqui é só para apagar as fotos do Storage.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: paths, error } = await admin.rpc("expire_posts");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const list = (paths as string[]) ?? [];
  if (list.length > 0) {
    const { error: removeError } = await admin.storage.from("posts").remove(list);
    if (removeError) return Response.json({ error: removeError.message }, { status: 500 });
    const { error: clearError } = await admin.rpc("clear_photo_paths", { p_paths: list });
    if (clearError) return Response.json({ error: clearError.message }, { status: 500 });
  }
  return Response.json({ photosDeleted: list.length });
}
