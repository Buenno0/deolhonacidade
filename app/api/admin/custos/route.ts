import { adminClient, userFromRequest } from "@/lib/server/supabase";
import { awsCosts } from "@/lib/server/costs";

// Custos da AWS para o painel. Só moderação; o navegador nunca vê a chave da AWS.
export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { data: profile } = await adminClient().from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) return Response.json({ error: "Acesso restrito à moderação" }, { status: 403 });

  try {
    return Response.json(await awsCosts());
  } catch (e) {
    const err = e as Error;
    console.error("custos da AWS", err.name, err.message);
    const hint =
      err.name === "AccessDeniedException"
        ? "A chave do app ainda não pode ler custos: rode tofu apply em infra/ (permissões ce:GetCostAndUsage e budgets:ViewBudget)."
        : err.name === "DataUnavailableException"
          ? "O Cost Explorer ainda não tem dados. Se acabou de ser ativado, leva até 24 h."
          : err.name === "CredentialsProviderError"
            ? "Sem credencial da AWS neste ambiente (DEOLHO_AWS_ACCESS_KEY_ID)."
            : "A AWS não respondeu. Tente de novo mais tarde.";
    return Response.json({ error: hint, code: err.name }, { status: 503 });
  }
}
