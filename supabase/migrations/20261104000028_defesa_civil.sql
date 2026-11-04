-- Painel da Defesa Civil: a sala de situação do órgão público.
--
-- O app continua igual para o morador. O que muda é que uma conta marcada
-- como agente (profiles.is_agent) passa a enxergar, só da própria cidade e
-- só nas categorias críticas, três coisas que o mapa público não dá:
--
--   1. o que está no ar agora, sem o ruído das outras categorias
--   2. o registro das ocorrências já vencidas, com foto, data e coordenada
--   3. onde os problemas se repetem
--
-- O agente NÃO é moderador: não vê e-mail, conta, custo, fila nem usuário.
-- Cada leitura dele fica no registro de acesso, com o alvo.
--
-- ---------------------------------------------------------------------------
-- A promessa de privacidade continua valendo por padrão
--
-- O README e os termos dizem que a foto é apagada quando o post vence. O item
-- 2 acima guarda a foto por mais tempo, então ele nasce DESLIGADO: a retenção
-- é por cidade (cities.agency_retention_days, default 0) e, em 0, nada é
-- guardado e expire_posts se comporta exatamente como antes. Só ligue depois
-- de acertar os termos de uso e a página de privacidade, e só na cidade que
-- assinou. A foto guardada é a já desfocada (rosto e placa), nunca a original.

-- ---------------------------------------------------------------------------
-- 1. O papel

alter table public.profiles add column is_agent boolean not null default false;
create index profiles_agent_idx on public.profiles (id) where is_agent;

-- Em qual cidade o agente trabalha. Sem isso ele não vê nada: o painel é
-- sempre de uma cidade só, nunca do país.
alter table public.profiles add column agency_city integer references public.cities (id);

-- O agente responde por um órgão. O nome entra no rodapé da ficha em PDF,
-- que é o documento que sai daqui para fora.
alter table public.profiles add column agency_name text check (char_length(agency_name) <= 80);

-- Porta do painel: devolve a cidade do agente. Moderador entra também, para
-- conseguir dar suporte sem precisar de uma segunda conta.
create function public.require_agent()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p public.profiles;
begin
  if uid is null then
    raise exception 'Faça login para continuar' using errcode = '28000';
  end if;
  select * into p from public.profiles where id = uid;
  if p.id is null or p.banned_at is not null or not (p.is_agent or p.is_admin) then
    raise exception 'Acesso restrito aos órgãos conveniados' using errcode = '42501';
  end if;
  if p.agency_city is null then
    raise exception 'Esta conta ainda não está ligada a uma cidade' using errcode = '42501';
  end if;
  return p.agency_city;
end;
$$;
revoke execute on function public.require_agent from public, anon;

-- ---------------------------------------------------------------------------
-- 2. O que é ocorrência
--
-- Defesa Civil não quer feira, evento nem divulgação. Quer o que gera
-- deslocamento de equipe. Essa lista é o recorte do painel inteiro.

create function public.is_incident(c public.post_category)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select c in ('alagamento', 'acidente', 'falta_energia', 'obra', 'transito', 'seguranca');
$$;
grant execute on function public.is_incident to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Retenção da evidência (desligada por padrão)

alter table public.cities add column agency_retention_days integer not null default 0
  check (agency_retention_days between 0 and 1825);

alter table public.posts add column agency_until timestamptz;
create index posts_agency_idx on public.posts (city_id, created_at desc)
  where agency_until is not null;

-- A limpeza, agora com o registro do órgão.
--
-- Diferença para o histórico público: o histórico depende de o autor ter
-- marcado "guardar" e vale 30 dias para todo mundo ver. O registro do órgão
-- não pergunta ao autor (é obrigação de documentação do município), mas só
-- existe nas categorias de ocorrência, só na cidade com retenção ligada, e
-- só o agente daquela cidade enxerga. O que foi escondido, denunciado ou
-- negado pela vizinhança nunca entra: evidência duvidosa não é evidência.
create or replace function public.expire_posts()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  paths text[];
begin
  update public.posts
  set archived_until = created_at + interval '30 days'
  where status = 'published' and expires_at <= now()
    and keep_history and category <> 'estabelecimento'
    and archived_until is null and photo_path is not null
    and report_count < 3
    and not (deny_count >= 3 and deny_count > confirm_count)
    and created_at > now() - interval '30 days';

  -- Registro do órgão: o que vencer publicado, sendo ocorrência, numa cidade
  -- com retenção contratada
  update public.posts p
  set agency_until = p.created_at + make_interval(days => c.agency_retention_days)
  from public.cities c
  where c.id = p.city_id
    and c.agency_retention_days > 0
    and p.status = 'published' and p.expires_at <= now()
    and p.agency_until is null and p.photo_path is not null
    and public.is_incident(p.category)
    and p.report_count < 3
    and not (p.deny_count >= 3 and p.deny_count > p.confirm_count);

  update public.posts set status = 'expired'
  where (status in ('published', 'hidden') and expires_at <= now())
     or (status = 'pending' and created_at < now() - interval '1 hour');

  -- Escondido pela moderação nunca fica guardado, nem para o órgão
  update public.posts set archived_until = null, agency_until = null
  where (archived_until is not null or agency_until is not null) and status = 'hidden';

  update public.requests set status = 'expired'
  where status in ('open', 'hidden') and expires_at <= now();

  perform public.apply_history_cap();

  select coalesce(array_agg(photo_path), '{}') into paths
  from (
    select photo_path from public.posts
    where status = 'expired' and photo_path is not null
      and (archived_until is null or archived_until <= now())
      and (agency_until is null or agency_until <= now())
    limit 1000
  ) due;
  return paths;
end;
$$;

-- Apagar o próprio post, denunciar e esconder também tiram do registro do
-- órgão: a LGPD vale aqui igual. (O que já saiu em PDF assinado é documento
-- do município e não volta, mas a base para de servir a foto.)
create or replace function public.delete_my_post(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Faça login para continuar' using errcode = '28000';
  end if;
  update public.posts
  set status = 'expired', expires_at = least(expires_at, now()),
      archived_until = null, agency_until = null, keep_history = false
  where id = p_id and user_id = uid and (status in ('published', 'hidden', 'pending') or archived_until is not null or agency_until is not null);
  if not found then
    raise exception 'Post não encontrado' using errcode = 'P0002';
  end if;
  perform public.log_access(uid, 'delete_post', p_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Leitura do painel
--
-- Toda função abaixo começa por require_agent() e usa a cidade que ela
-- devolve. O parâmetro de cidade não existe de propósito: não há como um
-- agente pedir os dados de outro município.

-- As propriedades de uma ocorrência, do jeito que o painel lê. Nunca sai
-- user_id daqui.
create function public.agency_props(p public.posts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'category', p.category,
    'caption', p.caption,
    'photo_path', p.photo_path,
    'created_at', p.created_at,
    'expires_at', p.expires_at,
    'live', p.status = 'published' and p.expires_at > now(),
    'confirm_count', p.confirm_count,
    'deny_count', p.deny_count,
    'view_count', p.view_count,
    'last_confirmed_at', p.last_confirmed_at,
    'answers_request', p.request_id is not null,
    'lat', extensions.st_y(p.location::extensions.geometry),
    'lng', extensions.st_x(p.location::extensions.geometry)
  );
$$;
revoke execute on function public.agency_props from public, anon, authenticated;

-- 4.1 Agora: o que está no ar neste minuto, só ocorrência
create function public.agency_live()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_city integer := public.require_agent();
begin
  return jsonb_build_object(
    'city_id', v_city,
    'at', now(),
    'features', coalesce((
      select jsonb_agg(public.agency_props(p) order by p.created_at desc)
      from public.posts p
      where p.city_id = v_city
        and p.status = 'published' and p.expires_at > now()
        and p.photo_path is not null
        and public.is_incident(p.category)
    ), '[]'::jsonb),
    -- Pedidos de foto abertos: o agente vê se já pediu olhos num ponto
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'question', r.question, 'created_at', r.created_at,
        'expires_at', r.expires_at, 'answer_count', r.answer_count,
        'lat', extensions.st_y(r.location::extensions.geometry),
        'lng', extensions.st_x(r.location::extensions.geometry)
      ) order by r.created_at desc)
      from public.requests r
      where r.city_id = v_city and r.status = 'open' and r.expires_at > now()
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.agency_live from public, anon;
grant execute on function public.agency_live to authenticated;

-- 4.2 Resumo do período: os números que vão para o relatório
create function public.agency_summary(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_city integer := public.require_agent();
  tz constant text := 'America/Sao_Paulo';
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
  today date := (now() at time zone tz)::date;
  since timestamptz := ((today - (v_days - 1))::timestamp at time zone tz);
begin
  return jsonb_build_object(
    'days', v_days,
    'since', since,
    'city', (select jsonb_build_object('id', c.id, 'name', c.name, 'uf', c.uf) from public.cities c where c.id = v_city),
    'agency', (select coalesce(agency_name, 'Órgão conveniado') from public.profiles where id = auth.uid()),
    'retention_days', (select agency_retention_days from public.cities where id = v_city),
    'live_now', (
      select count(*) from public.posts p
      where p.city_id = v_city and p.status = 'published' and p.expires_at > now()
        and public.is_incident(p.category)
    ),
    'total', (
      select count(*) from public.posts p
      where p.city_id = v_city and p.created_at >= since
        and public.is_incident(p.category) and public.was_published(p)
    ),
    'confirmed', (
      select count(*) from public.posts p
      where p.city_id = v_city and p.created_at >= since
        and public.is_incident(p.category) and public.was_published(p)
        and p.confirm_count > 0
    ),
    'by_category', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'n', n) order by n desc)
      from (
        select p.category, count(*) as n from public.posts p
        where p.city_id = v_city and p.created_at >= since
          and public.is_incident(p.category) and public.was_published(p)
        group by 1
      ) c
    ), '[]'::jsonb),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'n', coalesce(n.n, 0)) order by d.day)
      from (select (today - g)::date as day from generate_series(0, v_days - 1) g) d
      left join (
        select (p.created_at at time zone tz)::date as day, count(*) as n
        from public.posts p
        where p.city_id = v_city and p.created_at >= since
          and public.is_incident(p.category) and public.was_published(p)
        group by 1
      ) n on n.day = d.day
    ), '[]'::jsonb),
    'by_hour', (
      select jsonb_agg(coalesce(h.n, 0) order by g)
      from generate_series(0, 23) g
      left join (
        select extract(hour from p.created_at at time zone tz)::int as hour, count(*) as n
        from public.posts p
        where p.city_id = v_city and p.created_at >= since
          and public.is_incident(p.category) and public.was_published(p)
        group by 1
      ) h on h.hour = g
    )
  );
end;
$$;
revoke execute on function public.agency_summary from public, anon;
grant execute on function public.agency_summary to authenticated;

-- 4.3 Registro de ocorrências: o que está no ar mais o que ficou guardado.
-- É a lista que vira CSV e de onde sai a ficha em PDF.
create function public.agency_log(
  p_from date default null,
  p_to date default null,
  p_categories public.post_category[] default null,
  p_limit integer default 200,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_city integer := public.require_agent();
  tz constant text := 'America/Sao_Paulo';
  v_to date := coalesce(p_to, (now() at time zone tz)::date);
  v_from date := coalesce(p_from, v_to - 29);
  v_lim integer := least(greatest(coalesce(p_limit, 200), 1), 500);
begin
  if v_from > v_to then
    raise exception 'A data inicial é depois da final' using errcode = '22023';
  end if;
  return (
    with no_periodo as (
      select p.* from public.posts p
      where p.city_id = v_city
        and p.photo_path is not null
        and public.is_incident(p.category)
        and (p_categories is null or p.category = any (p_categories))
        -- no ar agora, ou guardado para o órgão e ainda dentro do prazo
        and ((p.status = 'published' and p.expires_at > now()) or p.agency_until > now())
        and (p.created_at at time zone tz)::date between v_from and v_to
    )
    select jsonb_build_object(
      'from', v_from,
      'to', v_to,
      'total', (select count(*) from no_periodo),
      -- a página sai por id e volta à tabela: agency_props recebe uma linha
      -- de public.posts, não o registro anônimo de uma subconsulta
      'events', coalesce((
        select jsonb_agg(public.agency_props(p) order by p.created_at desc)
        from public.posts p
        where p.id in (
          select id from no_periodo
          order by created_at desc
          limit v_lim offset greatest(coalesce(p_offset, 0), 0)
        )
      ), '[]'::jsonb)
    )
  );
end;
$$;
revoke execute on function public.agency_log from public, anon;
grant execute on function public.agency_log to authenticated;

-- 4.4 A ficha de uma ocorrência. Abrir uma ficha fica no registro de acesso:
-- é o que permite auditar depois quem olhou o quê.
create function public.agency_event(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_city integer := public.require_agent();
  uid uuid := auth.uid();
  p public.posts;
  me public.profiles;
begin
  select * into p from public.posts
  where id = p_id and city_id = v_city and photo_path is not null
    and public.is_incident(category)
    and ((status = 'published' and expires_at > now()) or agency_until > now());
  if p.id is null then
    raise exception 'Ocorrência não encontrada neste município' using errcode = 'P0002';
  end if;
  select * into me from public.profiles where id = uid;
  perform public.log_access(uid, 'agency_view_event', p_id);

  return jsonb_build_object(
    'event', public.agency_props(p) || jsonb_build_object(
      'share_count', p.share_count,
      'report_count', p.report_count,
      'agency_until', p.agency_until,
      -- quantos rostos e placas foram desfocados: a ficha declara isso, para
      -- que o documento diga o que foi alterado na imagem e por quê
      'faces_blurred', coalesce((p.moderation ->> 'faces')::integer, 0),
      'plates_blurred', coalesce((p.moderation ->> 'plates')::integer, 0),
      'checked_by', p.moderation ->> 'provider'
    ),
    'city', (select jsonb_build_object('name', c.name, 'uf', c.uf) from public.cities c where c.id = v_city),
    'issued_by', jsonb_build_object(
      'agency', coalesce(me.agency_name, 'Órgão conveniado'),
      'at', now()
    )
  );
end;
$$;
revoke execute on function public.agency_event from public, anon;
grant execute on function public.agency_event to authenticated;

-- 4.5 Recorrência: onde o mesmo problema volta.
--
-- Agrupa por célula de ~110 m (3 casas decimais). Não é endereço, é trecho:
-- serve para dizer "esta esquina alaga", que é o insumo de Plano Diretor e de
-- priorização de obra.
create function public.agency_recurrence(p_days integer default 90, p_category public.post_category default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_city integer := public.require_agent();
  v_days integer := least(greatest(coalesce(p_days, 90), 7), 730);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'lat', lat, 'lng', lng, 'n', n, 'days', days,
      'first_at', first_at, 'last_at', last_at,
      'categories', categories
    ) order by n desc, last_at desc)
    from (
      select
        round(extensions.st_y(p.location::extensions.geometry)::numeric, 3) as lat,
        round(extensions.st_x(p.location::extensions.geometry)::numeric, 3) as lng,
        count(*) as n,
        count(distinct (p.created_at at time zone 'America/Sao_Paulo')::date) as days,
        min(p.created_at) as first_at,
        max(p.created_at) as last_at,
        jsonb_agg(distinct p.category) as categories
      from public.posts p
      where p.city_id = v_city
        and p.created_at > now() - make_interval(days => v_days)
        and public.is_incident(p.category)
        and public.was_published(p)
        and (p_category is null or p.category = p_category)
      group by 1, 2
      having count(*) >= 2
      order by count(*) desc
      limit 100
    ) t
  ), '[]'::jsonb);
end;
$$;
revoke execute on function public.agency_recurrence from public, anon;
grant execute on function public.agency_recurrence to authenticated;

-- 4.6 Pedir olhos num ponto.
--
-- O recurso mais valioso do painel: em vez de mandar viatura para saber se a
-- água subiu, o agente marca o ponto e quem está perto responde com foto.
-- Reusa o mesmo pedido do app (requests), só que sem o limite de distância do
-- autor: o agente pede de dentro da sala de situação.
create function public.agency_ask(p_lat double precision, p_lng double precision, p_question text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_city integer := public.require_agent();
  uid uuid := auth.uid();
  pt extensions.geography := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  v_id uuid;
begin
  if not exists (select 1 from public.cities where id = v_city and extensions.st_covers(boundary, pt)) then
    raise exception 'O ponto está fora do município' using errcode = '22023';
  end if;
  if (select count(*) from public.requests where user_id = uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Limite de 10 pedidos por hora atingido' using errcode = '54000';
  end if;

  insert into public.requests (user_id, city_id, location, question)
  values (uid, v_city, pt, btrim(p_question))
  returning id into v_id;

  perform public.log_access(uid, 'agency_ask', null);
  return v_id;
end;
$$;
revoke execute on function public.agency_ask from public, anon;
grant execute on function public.agency_ask to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Quem dá o crachá: a moderação

create function public.admin_set_agent(
  p_user_id uuid,
  p_agent boolean,
  p_city integer default null,
  p_agency_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  if p_agent and p_city is null then
    raise exception 'Diga de qual cidade é o agente' using errcode = '22023';
  end if;
  update public.profiles
  set is_agent = p_agent,
      agency_city = case when p_agent then p_city end,
      agency_name = case when p_agent then nullif(btrim(p_agency_name), '') end
  where id = p_user_id;
  if not found then
    raise exception 'Conta não encontrada' using errcode = 'P0002';
  end if;
  perform public.log_access(admin, case when p_agent then 'admin_grant_agent' else 'admin_revoke_agent' end, null, p_user_id);
end;
$$;
revoke execute on function public.admin_set_agent from public, anon;
grant execute on function public.admin_set_agent to authenticated;

-- Ligar a retenção de uma cidade é decisão de contrato, não de tela: fica no
-- registro e exige moderação.
create function public.admin_set_retention(p_city integer, p_days integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  update public.cities set agency_retention_days = greatest(coalesce(p_days, 0), 0) where id = p_city;
  if not found then
    raise exception 'Cidade não encontrada' using errcode = 'P0002';
  end if;
  perform public.log_access(admin, 'admin_set_retention', null);
end;
$$;
revoke execute on function public.admin_set_retention from public, anon;
grant execute on function public.admin_set_retention to authenticated;

-- A ficha do usuário no painel admin passa a mostrar o crachá.
-- create or replace não muda o tipo de retorno de uma função: aqui entram
-- três colunas novas, então ela cai e sobe de novo. Quem a chama
-- (admin_users, admin_user, admin_export_users) tem corpo em texto, que
-- resolve o nome na hora da chamada, e por isso não quebra com o drop.
drop function public.admin_user_rows();
create function public.admin_user_rows()
returns table (
  id uuid,
  email text,
  provider text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  nickname text,
  xp integer,
  level integer,
  streak_days integer,
  is_admin boolean,
  banned_at timestamptz,
  accepted_terms_at timestamptz,
  posts bigint,
  reports_received bigint,
  requests bigint,
  business_status text,
  is_agent boolean,
  agency_city integer,
  agency_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text,
         coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
         u.created_at, u.last_sign_in_at,
         pr.nickname, pr.xp, pr.level, pr.streak_days, pr.is_admin, pr.banned_at, pr.accepted_terms_at,
         coalesce(ps.n, 0), coalesce(ps.reports, 0), coalesce(rq.n, 0),
         b.status,
         pr.is_agent, pr.agency_city, pr.agency_name
  from auth.users u
  join public.profiles pr on pr.id = u.id
  left join lateral (
    select count(*) filter (where public.was_published(p)) as n, sum(p.report_count) as reports
    from public.posts p where p.user_id = u.id
  ) ps on true
  left join lateral (select count(*) as n from public.requests r where r.user_id = u.id) rq on true
  left join public.businesses b on b.owner = u.id;
$$;
revoke execute on function public.admin_user_rows from public, anon, authenticated;
