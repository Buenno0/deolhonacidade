import { allPaths, remove } from "@/lib/server/storage";
import { adminClient } from "@/lib/server/supabase";

// Limpeza das fotos vencidas. Rode a cada 10 min com um agendador externo
// (GitHub Actions, cron-job.org, EventBridge...) enviando
// "Authorization: Bearer $CRON_SECRET". O mapa já esconde os posts vencidos
// sozinho; aqui é só para apagar foto e miniatura de onde elas moram.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = adminClient();
  const { data: paths, error } = await admin.rpc("expire_posts");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const list = (paths as string[]) ?? [];
  if (list.length > 0) {
    try {
      await remove(list.flatMap(allPaths));
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
    const { error: clearError } = await admin.rpc("clear_photo_paths", { p_paths: list });
    if (clearError) return Response.json({ error: clearError.message }, { status: 500 });
  }
  return Response.json({ photosDeleted: list.length });
}
