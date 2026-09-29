import "server-only";
import { unstable_cache } from "next/cache";
import { CostExplorerClient, GetCostAndUsageCommand, GetCostForecastCommand, type Expression } from "@aws-sdk/client-cost-explorer";
import { BudgetsClient, DescribeBudgetCommand } from "@aws-sdk/client-budgets";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { awsCredentials } from "./aws";
import type { AwsCosts } from "@/lib/admin/types";

// Custos da AWS para o painel. O Cost Explorer cobra US$ 0,01 por consulta e
// só atualiza algumas vezes por dia, então o resultado fica 6 h no cache do
// Next (vale entre instâncias e deploys).
//
// O que é do De Olho: tudo com a tag projeto=deolhonacidade (S3, CloudFront…)
// e, da conta inteira, Rekognition e SES. Chamadas de API não têm recurso
// para levar tag, e na conta só o De Olho usa esses dois (o NAS não).
const BUDGET = "deolho-mensal";
const FILTER: Expression = {
  Or: [
    { Tags: { Key: "projeto", Values: ["deolhonacidade"], MatchOptions: ["EQUALS"] } },
    { Dimensions: { Key: "SERVICE", Values: ["Amazon Rekognition", "Amazon Simple Email Service"], MatchOptions: ["EQUALS"] } },
  ],
};

// A API de custos só existe em us-east-1
const region = "us-east-1";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d = 1) => new Date(Date.UTC(y, m, d));

async function fetchCosts(): Promise<AwsCosts> {
  const credentials = awsCredentials();
  const ce = new CostExplorerClient({ region, credentials });
  const now = new Date();
  const [y, m] = [now.getUTCFullYear(), now.getUTCMonth()];
  const today = utc(y, m, now.getUTCDate());
  const monthStart = utc(y, m);
  const prevStart = utc(y, m - 1);
  const nextMonth = utc(y, m + 1);

  // Uma consulta só: por dia e por serviço desde o início do mês passado até
  // ontem (o fim é exclusivo). Dela saem o mês passado, o mês atual e os 30 dias.
  const days: { day: string; total: number; services: Record<string, number> }[] = [];
  if (today > prevStart) {
    let token: string | undefined;
    do {
      const r = await ce.send(
        new GetCostAndUsageCommand({
          TimePeriod: { Start: iso(prevStart), End: iso(today) },
          Granularity: "DAILY",
          Metrics: ["UnblendedCost"],
          Filter: FILTER,
          GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
          NextPageToken: token,
        }),
      );
      for (const t of r.ResultsByTime ?? []) {
        const day = t.TimePeriod!.Start!;
        let entry = days.find((d) => d.day === day);
        if (!entry) days.push((entry = { day, total: 0, services: {} }));
        for (const g of t.Groups ?? []) {
          const v = Number(g.Metrics?.UnblendedCost?.Amount ?? 0);
          const svc = g.Keys?.[0] ?? "Outro";
          entry.services[svc] = (entry.services[svc] ?? 0) + v;
          entry.total += v;
        }
      }
      token = r.NextPageToken;
    } while (token);
  }

  const month = days.filter((d) => d.day >= iso(monthStart));
  const byService: Record<string, number> = {};
  for (const d of month) for (const [s, v] of Object.entries(d.services)) byService[s] = (byService[s] ?? 0) + v;
  const monthToDate = month.reduce((s, d) => s + d.total, 0);
  const lastMonth = days.filter((d) => d.day < iso(monthStart)).reduce((s, d) => s + d.total, 0);

  // Os últimos 30 dias, com zero nos dias sem gasto
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const day = iso(new Date(today.getTime() - (30 - i) * 86400000));
    return { day, total: days.find((d) => d.day === day)?.total ?? 0 };
  });

  // Previsão do resto do mês (a AWS recusa quando ainda não tem histórico)
  let forecast: number | null = null;
  try {
    const f = await ce.send(
      new GetCostForecastCommand({
        TimePeriod: { Start: iso(today), End: iso(nextMonth) },
        Metric: "UNBLENDED_COST",
        Granularity: "MONTHLY",
        Filter: FILTER,
      }),
    );
    forecast = monthToDate + Number(f.Total?.Amount ?? 0);
  } catch (e) {
    console.warn("previsão de custo indisponível", (e as Error).name);
  }

  // O limite do orçamento (infra/orcamento.tf). Consultar o Budgets é grátis.
  let budget: AwsCosts["budget"] = null;
  try {
    const { Account } = await new STSClient({ region, credentials }).send(new GetCallerIdentityCommand({}));
    const b = await new BudgetsClient({ region, credentials }).send(new DescribeBudgetCommand({ AccountId: Account!, BudgetName: BUDGET }));
    budget = {
      name: BUDGET,
      limit: Number(b.Budget?.BudgetLimit?.Amount ?? 0),
      actual: Number(b.Budget?.CalculatedSpend?.ActualSpend?.Amount ?? 0),
      forecast: b.Budget?.CalculatedSpend?.ForecastedSpend ? Number(b.Budget.CalculatedSpend.ForecastedSpend.Amount) : null,
    };
  } catch (e) {
    console.warn("orçamento indisponível", (e as Error).name);
  }

  return {
    currency: "USD",
    fetched_at: new Date().toISOString(),
    month: iso(monthStart).slice(0, 7),
    month_to_date: monthToDate,
    last_month: lastMonth,
    forecast,
    budget,
    by_service: Object.entries(byService)
      .map(([service, amount]) => ({ service, amount }))
      .filter((s) => s.amount >= 0.005)
      .sort((a, b) => b.amount - a.amount),
    daily: last30,
  };
}

export const awsCosts = unstable_cache(fetchCosts, ["aws-custos-v1"], { revalidate: 6 * 3600, tags: ["aws-custos"] });
