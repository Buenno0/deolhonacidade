-- Painel admin: métricas, usuários, registro de ações. Tudo passa por
-- require_admin(); o navegador nunca vê a service_role. Abrir a ficha de
-- alguém, exportar a lista e mexer em admin fica no registro, com o alvo.

-- ---------------------------------------------------------------------------
-- Registro com alvo: quem foi banido, promovido ou teve a ficha aberta
alter table public.access_logs add column target_user uuid;
create index access_logs_user_idx on public.access_logs (user_id, id desc);
create index access_logs_target_idx on public.access_logs (target_user, id desc) where target_user is not null;
create index access_logs_action_idx on public.access_logs (action, id desc);

drop function public.log_access(uuid, text, uuid);
create function public.log_access(p_user_id uuid, p_action text, p_post_id uuid default null, p_target_user uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
begin
  insert into public.access_logs (user_id, action, post_id, target_user, ip, user_agent)
  values (
    p_user_id,
    p_action,
    p_post_id,
    p_target_user,
    coalesce(
      headers ->> 'cf-connecting-ip',
      split_part(headers ->> 'x-forwarded-for', ',', 1),
      headers ->> 'x-real-ip'
    ),
    headers ->> 'user-agent'
  );
end;
$$;
revoke execute on function public.log_access from public, anon, authenticated;

create or replace function public.admin_ban_user(p_user_id uuid, p_ban boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  if p_user_id = admin then
    raise exception 'Você não pode banir a própria conta' using errcode = '42501';
  end if;
  update public.profiles set banned_at = case when p_ban then now() end where id = p_user_id;
  if p_ban then
    update public.posts set status = 'hidden' where user_id = p_user_id and status in ('published', 'pending');
    update public.requests set status = 'hidden' where user_id = p_user_id and status = 'open';
  end if;
  perform public.log_access(admin, case when p_ban then 'admin_ban' else 'admin_unban' end, null, p_user_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Post "publicado" = passou pela moderação automática (moderation gravado e
-- aprovado). Rascunho abandonado vira expired sem moderation e não conta.
create function public.was_published(p public.posts)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p.moderation is not null and coalesce((p.moderation ->> 'approved')::boolean, true);
$$;
revoke execute on function public.was_published from public, anon, authenticated;

-- O que pede atenção agora (número nas abas do painel)
create function public.admin_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'posts', (
      select count(*) from public.posts p
      where p.photo_path is not null
        and (p.status = 'hidden' or p.report_count > 0 or p.deny_count > 0)
        and p.created_at > now() - interval '2 days'
    ),
    'requests', (
      select count(*) from public.requests r
      where (r.status = 'hidden' or r.report_count > 0) and r.created_at > now() - interval '2 days'
    ),
    'businesses', (select count(*) from public.businesses where status = 'pending')
  );
end;
$$;
revoke execute on function public.admin_counts from public, anon;
grant execute on function public.admin_counts to authenticated;

-- ---------------------------------------------------------------------------
-- Visão geral. Dias no fuso de São Paulo, como o histórico.
create function public.admin_overview(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tz constant text := 'America/Sao_Paulo';
  v_days integer := least(greatest(coalesce(p_days, 30), 1), 365);
  today date := (now() at time zone tz)::date;
  since timestamptz := ((today - (v_days - 1))::timestamp at time zone tz);
  result jsonb;
begin
  perform public.require_admin();

  with days as (
    select (today - g)::date as day from generate_series(0, v_days - 1) g
  ), signups as (
    select (created_at at time zone tz)::date as day, count(*) as n
    from auth.users where created_at >= since group by 1
  ), published as (
    select (created_at at time zone tz)::date as day, count(*) as n
    from public.posts p where p.created_at >= since and public.was_published(p) group by 1
  ), active as (
    select (created_at at time zone tz)::date as day, count(distinct user_id) as n
    from public.access_logs
    where created_at >= since and user_id is not null and action not like 'admin\_%'
    group by 1
  ), votes as (
    select (created_at at time zone tz)::date as day, count(*) as n
    from public.post_votes where created_at >= since group by 1
  ), asks as (
    select (created_at at time zone tz)::date as day, count(*) as n
    from public.requests where created_at >= since group by 1
  )
  select jsonb_agg(jsonb_build_object(
           'day', d.day,
           'signups', coalesce(s.n, 0),
           'posts', coalesce(p.n, 0),
           'active', coalesce(a.n, 0),
           'votes', coalesce(v.n, 0),
           'requests', coalesce(q.n, 0)
         ) order by d.day)
  into result
  from days d
  left join signups s using (day)
  left join published p using (day)
  left join active a using (day)
  left join votes v using (day)
  left join asks q using (day);

  return jsonb_build_object(
    'days', v_days,
    'series', coalesce(result, '[]'::jsonb),
    'totals', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'users_new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'users_new_period', (select count(*) from auth.users where created_at >= since),
      'banned', (select count(*) from public.profiles where banned_at is not null),
      'admins', (select count(*) from public.profiles where is_admin),
      'no_terms', (select count(*) from public.profiles where accepted_terms_at is null),
      'live_now', (select count(*) from public.posts where status = 'published' and expires_at > now()),
      'posts_period', (select count(*) from public.posts p where p.created_at >= since and public.was_published(p)),
      'posts_all', (select count(*) from public.posts p where public.was_published(p)),
      'in_history', (select count(*) from public.posts where archived_until > now()),
      'requests_open', (select count(*) from public.requests where status = 'open' and expires_at > now()),
      'push', (select count(*) from public.push_subscriptions),
      'businesses', (
        select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
        from (select status, count(*) as n from public.businesses group by status) b
      )
    ),
    'active', jsonb_build_object(
      'd1', (select count(distinct user_id) from public.access_logs where created_at > now() - interval '1 day' and user_id is not null and action not like 'admin\_%'),
      'd7', (select count(distinct user_id) from public.access_logs where created_at > now() - interval '7 days' and user_id is not null and action not like 'admin\_%'),
      'd30', (select count(distinct user_id) from public.access_logs where created_at > now() - interval '30 days' and user_id is not null and action not like 'admin\_%')
    ),
    'by_category', coalesce((
      select jsonb_agg(jsonb_build_object('category', category, 'n', n) order by n desc)
      from (
        select p.category, count(*) as n from public.posts p
        where p.created_at >= since and public.was_published(p) group by 1
      ) c
    ), '[]'::jsonb),
    'by_hour', (
      select jsonb_agg(coalesce(h.n, 0) order by g)
      from generate_series(0, 23) g
      left join (
        select extract(hour from p.created_at at time zone tz)::int as hour, count(*) as n
        from public.posts p where p.created_at >= since and public.was_published(p) group by 1
      ) h on h.hour = g
    ),
    'moderation', jsonb_build_object(
      'finalized', (select count(*) from public.posts where created_at >= since and moderation is not null),
      'auto_rejected', (select count(*) from public.posts where created_at >= since and moderation ->> 'approved' = 'false'),
      'hidden_by_admin', (select count(*) from public.access_logs where created_at >= since and action = 'admin_hide_post'),
      'bans', (select count(*) from public.access_logs where created_at >= since and action = 'admin_ban'),
      'post_reports', (select count(*) from public.reports where created_at >= since),
      'request_reports', (select count(*) from public.request_reports where created_at >= since)
    ),
    'engagement', (
      select jsonb_build_object(
        'views', coalesce(sum(view_count), 0),
        'shares', coalesce(sum(share_count), 0),
        'confirms', coalesce(sum(confirm_count), 0),
        'denies', coalesce(sum(deny_count), 0)
      )
      from public.posts p where p.created_at >= since and public.was_published(p)
    ),
    'requests', (
      select jsonb_build_object('total', count(*), 'answered', count(*) filter (where answer_count > 0))
      from public.requests where created_at >= since
    ),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'nickname', t.nickname, 'email', t.email, 'xp', t.xp, 'level', t.level) order by t.xp desc)
      from (
        select pr.id, pr.nickname, u.email, pr.xp, pr.level
        from public.profiles pr join auth.users u on u.id = pr.id
        where pr.xp > 0 and pr.banned_at is null
        order by pr.xp desc limit 5
      ) t
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.admin_overview from public, anon;
grant execute on function public.admin_overview to authenticated;

-- ---------------------------------------------------------------------------
-- Usuários: a linha da lista (e do CSV). Uso interno das funções abaixo.
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
  business_status text
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
         b.status
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

create function public.admin_users(
  p_search text default null,
  p_filter text default null,
  p_sort text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q text := nullif(btrim(p_search), '');
  result jsonb;
begin
  perform public.require_admin();
  with filtered as (
    select r.* from public.admin_user_rows() r
    where (q is null or r.email ilike '%' || q || '%' or r.nickname ilike '%' || q || '%' or r.id::text = q)
      and case coalesce(p_filter, 'todos')
            when 'novos' then r.created_at > now() - interval '7 days'
            when 'banidos' then r.banned_at is not null
            when 'admins' then r.is_admin
            when 'estabelecimento' then r.business_status is not null
            when 'sem_termos' then r.accepted_terms_at is null
            else true
          end
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'users', coalesce((
      select jsonb_agg(to_jsonb(page))
      from (
        select * from filtered
        order by
          case p_sort when 'xp' then filtered.xp end desc nulls last,
          case p_sort when 'posts' then filtered.posts end desc nulls last,
          case p_sort when 'acesso' then filtered.last_sign_in_at end desc nulls last,
          filtered.created_at desc
        limit least(greatest(coalesce(p_limit, 50), 1), 200)
        offset greatest(coalesce(p_offset, 0), 0)
      ) page
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke execute on function public.admin_users from public, anon;
grant execute on function public.admin_users to authenticated;

create function public.admin_export_users()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  perform public.log_access(admin, 'admin_export_users', null);
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.created_at desc)
    from (select * from public.admin_user_rows() order by created_at desc limit 10000) r
  ), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_export_users from public, anon;
grant execute on function public.admin_export_users to authenticated;

-- A ficha: liga a conta aos posts dela. Cada abertura fica registrada.
create function public.admin_user(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
  result jsonb;
begin
  select to_jsonb(r) into result from public.admin_user_rows() r where r.id = p_id;
  if result is null then
    raise exception 'Conta não encontrada' using errcode = 'P0002';
  end if;
  perform public.log_access(admin, 'admin_view_user', null, p_id);

  return jsonb_build_object(
    'user', result || jsonb_build_object(
      'show_nickname', (select show_nickname from public.profiles where id = p_id),
      'streak_last', (select streak_last from public.profiles where id = p_id),
      'votes', (select count(*) from public.post_votes where user_id = p_id),
      'reports_made', (select count(*) from public.reports where user_id = p_id),
      'push', (select count(*) from public.push_subscriptions where user_id = p_id)
    ),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object('badge', badge, 'tier', tier, 'earned_at', earned_at) order by earned_at desc)
      from public.user_badges where user_id = p_id
    ), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at desc)
      from (
        select p.id, p.status, p.category, p.caption, p.photo_path, p.created_at, p.expires_at,
               p.report_count, p.confirm_count, p.deny_count, p.view_count, p.share_count,
               p.keep_history, p.archived_until, p.business_id is not null as is_business,
               p.moderation ->> 'approved' = 'false' as auto_rejected
        from public.posts p
        where p.user_id = p_id and p.moderation is not null
        order by p.created_at desc limit 60
      ) p
    ), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at desc)
      from (
        select r.id, r.status, r.question, r.created_at, r.expires_at, r.answer_count, r.report_count
        from public.requests r where r.user_id = p_id
        order by r.created_at desc limit 30
      ) r
    ), '[]'::jsonb),
    'business', (select public.business_json(b) from public.businesses b where b.owner = p_id),
    'logs', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.id desc)
      from (
        select l.id, l.action, l.post_id, l.user_id, l.target_user, l.ip, l.created_at,
               (select u.email from auth.users u where u.id = l.user_id)::text as user_email,
               (select u.email from auth.users u where u.id = l.target_user)::text as target_email
        from public.access_logs l
        where l.user_id = p_id or l.target_user = p_id
        order by l.id desc limit 50
      ) l
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.admin_user from public, anon;
grant execute on function public.admin_user to authenticated;

-- Dar ou tirar a moderação. Tirar a própria não pode: ninguém fica trancado
-- para fora do painel.
create function public.admin_set_admin(p_user_id uuid, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  if p_user_id = admin and not p_admin then
    raise exception 'Você não pode tirar a própria moderação' using errcode = '42501';
  end if;
  update public.profiles set is_admin = p_admin where id = p_user_id;
  if not found then
    raise exception 'Conta não encontrada' using errcode = 'P0002';
  end if;
  perform public.log_access(admin, case when p_admin then 'admin_grant' else 'admin_revoke' end, null, p_user_id);
end;
$$;
revoke execute on function public.admin_set_admin from public, anon;
grant execute on function public.admin_set_admin to authenticated;

-- ---------------------------------------------------------------------------
-- Registro de ações (Marco Civil + auditoria da moderação), do mais novo
-- para o mais antigo, em páginas por id.
create function public.admin_logs(
  p_action text default null,
  p_user uuid default null,
  p_before bigint default null,
  p_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'logs', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.id desc)
      from (
        select l.id, l.action, l.post_id, l.user_id, l.target_user, l.ip, l.user_agent, l.created_at,
               (select u.email from auth.users u where u.id = l.user_id)::text as user_email,
               (select u.email from auth.users u where u.id = l.target_user)::text as target_email
        from public.access_logs l
        where (p_action is null or l.action = p_action or (p_action = 'admin_*' and l.action like 'admin\_%'))
          and (p_user is null or l.user_id = p_user or l.target_user = p_user)
          and (p_before is null or l.id < p_before)
        order by l.id desc
        limit least(greatest(coalesce(p_limit, 100), 1), 500)
      ) l
    ), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(action order by action) from (select distinct action from public.access_logs) a), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.admin_logs from public, anon;
grant execute on function public.admin_logs to authenticated;
