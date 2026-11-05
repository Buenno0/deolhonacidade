import { adminClient } from "@/lib/server/supabase";
import { alertsForCity, fetchAlerts } from "@/lib/server/inmet";
import { notifyAlert } from "@/lib/server/push";

// Coleta dos avisos do tempo. Rode a cada 30 min com o mesmo agendador da
// limpeza, mandando "Authorization: Bearer $CRON_SECRET".
//
// A cada volta: busca os avisos ativos do INMET, guarda os que valem para
// cada cidade atendida, apaga os que o INMET cancelou e manda o push dos
// graves. Quem decide o que merece push é o banco, não esta rota.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = adminClient();
  const { data: cities, error: citiesError } = await admin.from("cities").select("id, name");
  if (citiesError) return Response.json({ error: citiesError.message }, { status: 500 });

  let alerts;
  try {
    alerts = await fetchAlerts();
  } catch (e) {
    // O INMET fora do ar não é erro nosso: o que já está guardado continua no
    // mapa até vencer sozinho.
    return Response.json({ error: e instanceof Error ? e.message : String(e), source: "inmet" }, { status: 502 });
  }

  const resumo: Record<string, { guardados: number; apagados: number; avisados: number }> = {};

  for (const city of cities ?? []) {
    const daCidade = alertsForCity(alerts, city.id);

    for (const a of daCidade) {
      const { error } = await admin.rpc("upsert_alert", {
        p_city_id: city.id,
        p_id: a.id,
        p_sequence: a.sequence,
        p_kind: a.kind,
        p_severity: a.severity,
        p_starts_at: a.startsAt,
        p_ends_at: a.endsAt,
        p_risks: a.risks,
        p_instructions: a.instructions,
      });
      if (error) return Response.json({ error: error.message, city: city.id, alert: a.id }, { status: 500 });
    }

    const { data: apagados, error: pruneError } = await admin.rpc("prune_alerts", {
      p_city_id: city.id,
      p_keep: daCidade.map((a) => a.id),
    });
    if (pruneError) return Response.json({ error: pruneError.message, city: city.id }, { status: 500 });

    // O push sai depois de tudo guardado: se a coleta falhar no meio, ninguém
    // recebe aviso de uma linha que não ficou no banco.
    let avisados = 0;
    for (const a of daCidade) {
      if (a.severity === "potencial") continue;
      const { sent } = await notifyAlert({
        cityId: city.id,
        id: a.id,
        kind: a.kind,
        severity: a.severity,
        live: new Date(a.startsAt) <= new Date(),
      });
      avisados += sent;
    }

    resumo[city.name] = { guardados: daCidade.length, apagados: (apagados as number) ?? 0, avisados };
  }

  return Response.json({ avisosAtivos: alerts.length, cidades: resumo });
}
