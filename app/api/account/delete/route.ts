import { allPaths, remove } from "@/lib/server/storage";
import { adminClient, userFromRequest } from "@/lib/server/supabase";

// Excluir a conta (LGPD, art. 18): tira do ar tudo o que a pessoa publicou,
// apaga as fotos, os alertas e o login. Os registros de acesso ficam, sem o
// vínculo com a conta, pelo prazo do Marco Civil.
export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "EXCLUIR") return Response.json({ error: "Confirmação ausente" }, { status: 400 });

  const admin = adminClient();
  const { data: paths, error } = await admin.rpc("prepare_account_deletion", { p_user_id: user.id });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  try {
    await remove(((paths as string[]) ?? []).flatMap(allPaths));
  } catch (e) {
    // a limpeza periódica não pega fotos sem post; registra para apagar à mão
    console.error("fotos da conta excluída não foram apagadas", user.id, e);
  }

  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) return Response.json({ error: delError.message }, { status: 500 });
  return Response.json({ ok: true });
}
