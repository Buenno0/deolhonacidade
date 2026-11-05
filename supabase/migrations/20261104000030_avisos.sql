-- Avisos do tempo: o que o mapa mostra quando ninguém postou.
--
-- O app tem um laço fechado: sem post não há valor, sem valor não há gente,
-- sem gente não há post. O aviso do INMET quebra esse laço porque não depende
-- de morador nenhum. Ele chega sozinho, diz que vem tempestade hoje, e é
-- exatamente o momento em que alguém tem o que fotografar.
--
-- A fonte é a API pública de avisos do INMET, que entrega os municípios
-- atingidos como lista de códigos IBGE. public.cities.id JÁ é o código IBGE,
-- então o recorte por cidade é exato, sem geometria e sem chute.
--
-- O alerta por área (push_subscriptions) continua existindo e é outra coisa:
-- ele depende de alguém postar. Este aqui não.

create type public.alert_severity as enum ('potencial', 'perigo', 'grande_perigo');

create table public.weather_alerts (
  city_id integer not null references public.cities (id) on delete cascade,
  -- id_aviso do INMET: o mesmo aviso vale para centenas de cidades, e a gente
  -- guarda uma linha por cidade atendida
  id bigint not null,
  -- o INMET reemite o aviso corrigido com a sequência maior
  sequence integer not null default 1,
  kind text not null,
  severity public.alert_severity not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  risks text[] not null default '{}',
  instructions text[] not null default '{}',
  source text not null default 'inmet',
  -- quando o push saiu (uma vez por aviso, nunca a cada coleta)
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (city_id, id)
);
create index weather_alerts_window_idx on public.weather_alerts (city_id, ends_at desc);
alter table public.weather_alerts enable row level security;

-- ---------------------------------------------------------------------------
-- Leitura: pública, como o mapa

-- O que vale mostrar: o que está valendo agora e o que começa nas próximas
-- 48 h. Mais longe que isso é previsão, não aviso, e enche a tela.
create function public.city_alerts(p_city_id integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'kind', a.kind,
    'severity', a.severity,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'live', a.starts_at <= now(),
    'risks', a.risks,
    'instructions', a.instructions,
    'source', a.source
  ) order by
      case a.severity when 'grande_perigo' then 0 when 'perigo' then 1 else 2 end,
      a.starts_at
  ), '[]'::jsonb)
  from public.weather_alerts a
  where a.city_id = p_city_id
    and a.ends_at > now()
    and a.starts_at < now() + interval '48 hours';
$$;
grant execute on function public.city_alerts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Escrita: só o coletor (service_role), pela rota /api/cron/avisos

create function public.upsert_alert(
  p_city_id integer,
  p_id bigint,
  p_sequence integer,
  p_kind text,
  p_severity public.alert_severity,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_risks text[],
  p_instructions text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.weather_alerts
    (city_id, id, sequence, kind, severity, starts_at, ends_at, risks, instructions)
  values
    (p_city_id, p_id, p_sequence, p_kind, p_severity, p_starts_at, p_ends_at,
     coalesce(p_risks, '{}'), coalesce(p_instructions, '{}'))
  on conflict (city_id, id) do update set
    sequence = excluded.sequence,
    kind = excluded.kind,
    severity = excluded.severity,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    risks = excluded.risks,
    instructions = excluded.instructions,
    updated_at = now(),
    -- aviso reemitido com severidade maior merece avisar de novo
    notified_at = case
      when excluded.severity > public.weather_alerts.severity then null
      else public.weather_alerts.notified_at
    end;
end;
$$;
revoke execute on function public.upsert_alert from public, anon, authenticated;
grant execute on function public.upsert_alert to service_role;

-- O que sumiu da API do INMET (cancelado) sai do mapa junto
create function public.prune_alerts(p_city_id integer, p_keep bigint[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from public.weather_alerts
  where city_id = p_city_id
    and ends_at > now()
    and not (id = any (coalesce(p_keep, '{}')));
  get diagnostics n = row_count;
  -- o que já passou não serve para nada depois de 90 dias
  delete from public.weather_alerts where ends_at < now() - interval '90 days';
  return n;
end;
$$;
revoke execute on function public.prune_alerts from public, anon, authenticated;
grant execute on function public.prune_alerts to service_role;

-- ---------------------------------------------------------------------------
-- Push
--
-- Quem recebe: todo mundo com inscrição dentro do município. Não é por raio
-- nem por categoria de propósito — tempestade não tem endereço, e o alerta
-- por área de hoje tem zero inscritos justamente por depender da rede.
--
-- Quando: só 'perigo' e 'grande_perigo', e só quando o aviso já começou ou
-- começa nas próximas 6 h. 'Perigo Potencial' fica no mapa e não acorda
-- ninguém: Itapetininga tem vários por semana, e push demais vira push
-- nenhum. Uma vez por aviso (notified_at).
create function public.push_targets_for_alert(p_city_id integer, p_id bigint)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.weather_alerts;
begin
  update public.weather_alerts set notified_at = now()
  where city_id = p_city_id and id = p_id
    and notified_at is null
    and severity in ('perigo', 'grande_perigo')
    and ends_at > now()
    and starts_at <= now() + interval '6 hours'
  returning * into a;
  if a.id is null then return; end if;

  return query
    select s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s
    join public.cities c on c.id = p_city_id
    where extensions.st_covers(c.boundary, s.location);
end;
$$;
revoke execute on function public.push_targets_for_alert from public, anon, authenticated;
grant execute on function public.push_targets_for_alert to service_role;

-- ---------------------------------------------------------------------------
-- Agendamento
--
-- Mesmo caminho da limpeza de fotos (call_expire_route): o pg_cron chama a
-- rota do app, que é quem fala com o INMET. Reusa os mesmos segredos do
-- Vault, então não há nada novo para configurar no deploy.
--
-- A cada 30 min: o INMET reemite aviso ao longo do dia, e meia hora é o
-- bastante para a tempestade da tarde chegar no mapa antes da chuva.
create function public.call_alerts_route()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url' limit 1);
  v_secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1);
begin
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_get(
    url := rtrim(v_url, '/') || '/api/cron/avisos',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke execute on function public.call_alerts_route from public, anon, authenticated;

select cron.schedule('fetch-weather-alerts', '*/30 * * * *', $$ select public.call_alerts_route(); $$);
