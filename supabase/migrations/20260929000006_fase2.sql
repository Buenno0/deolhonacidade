-- Fase 2: duração por categoria, "ainda está rolando?", "alguém aí?",
-- alertas por área, painel admin e mapa de calor.

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Duração por categoria. Nada passa de 12h (a promessa do app); o que muda
-- rápido some antes.
create function public.category_lifetime(c public.post_category)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case c
    when 'transito' then interval '2 hours'
    when 'acidente' then interval '3 hours'
    when 'seguranca' then interval '3 hours'
    when 'alagamento' then interval '6 hours'
    when 'falta_energia' then interval '6 hours'
    else interval '12 hours'
  end;
$$;
grant execute on function public.category_lifetime to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- "Alguém aí?": pedidos de foto num ponto do mapa
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  city_id integer not null references public.cities (id),
  location extensions.geography(Point, 4326) not null,
  question text not null check (char_length(question) between 3 and 140),
  status text not null default 'open' check (status in ('open', 'hidden', 'expired')),
  answer_count integer not null default 0,
  report_count integer not null default 0,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours'
);
create index requests_location_idx on public.requests using gist (location);
create index requests_active_idx on public.requests (city_id, expires_at) where status = 'open';
alter table public.requests enable row level security;

create table public.request_reports (
  request_id uuid not null references public.requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);
alter table public.request_reports enable row level security;

-- ---------------------------------------------------------------------------
-- Posts: resposta a pedido, confirmações e controle do aviso por push
alter table public.posts
  add column request_id uuid references public.requests (id) on delete set null,
  add column confirm_count integer not null default 0,
  add column deny_count integer not null default 0,
  add column last_confirmed_at timestamptz,
  add column notified_at timestamptz;

create table public.post_votes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  still boolean not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_votes enable row level security;

-- ---------------------------------------------------------------------------
-- Alertas por área (Web Push). Só o servidor lê; o navegador grava pela RPC.
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  location extensions.geography(Point, 4326) not null,
  radius_m integer not null check (radius_m between 200 and 5000),
  categories public.post_category[],
  requests boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_subscriptions_location_idx on public.push_subscriptions using gist (location);
alter table public.push_subscriptions enable row level security;

-- ---------------------------------------------------------------------------
-- create_post ganha a resposta a um pedido (a foto tem que ser até 1 km dele)
drop function public.create_post(double precision, double precision, public.post_category, text);

create function public.create_post(
  p_lat double precision,
  p_lng double precision,
  p_category public.post_category,
  p_caption text default null,
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  pt extensions.geography := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  v_city integer;
  v_id uuid := gen_random_uuid();
  v_path text;
begin
  select id into v_city from public.cities where extensions.st_covers(boundary, pt) limit 1;
  if v_city is null then
    raise exception 'Você precisa estar dentro da cidade para postar' using errcode = '22023';
  end if;

  if (select count(*) from public.posts where user_id = uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Limite de 5 posts por hora atingido' using errcode = '54000';
  end if;

  if p_request_id is not null and not exists (
    select 1 from public.requests
    where id = p_request_id and status = 'open' and expires_at > now()
      and extensions.st_dwithin(location, pt, 1000)
  ) then
    raise exception 'Esse pedido já fechou ou você está a mais de 1 km dele' using errcode = '22023';
  end if;

  v_path := v_city || '/' || v_id;
  insert into public.posts (id, user_id, city_id, location, category, caption, photo_path, request_id)
  values (v_id, uid, v_city, pt, p_category, nullif(btrim(p_caption), ''), v_path, p_request_id);

  perform public.log_access(uid, 'create_post', v_id);
  return jsonb_build_object('id', v_id, 'photo_path', v_path);
end;
$$;
revoke execute on function public.create_post from public, anon;
grant execute on function public.create_post to authenticated;

-- finalize_post: a duração agora vem da categoria, e a resposta conta no pedido
create or replace function public.finalize_post(p_id uuid, p_approved boolean, p_moderation jsonb default null)
returns public.post_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.post_status;
  v_request uuid;
begin
  update public.posts
  set status = case when p_approved then 'published'::public.post_status else 'hidden'::public.post_status end,
      moderation = p_moderation,
      created_at = case when p_approved then now() else created_at end,
      expires_at = case when p_approved then now() + public.category_lifetime(category) else expires_at end
  where id = p_id and status = 'pending'
  returning status, request_id into result, v_request;

  if result is null then
    raise exception 'Post não encontrado ou já publicado' using errcode = 'P0002';
  end if;
  if result = 'published' and v_request is not null then
    update public.requests set answer_count = answer_count + 1 where id = v_request;
  end if;
  return result;
end;
$$;

-- Leitura pública: mais campos (confirmações, pedido respondido)
create or replace function public.active_posts(p_city_id integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(jsonb_build_object(
      'type', 'Feature',
      'id', p.id,
      'geometry', extensions.st_asgeojson(p.location)::jsonb,
      'properties', jsonb_build_object(
        'id', p.id,
        'category', p.category,
        'caption', p.caption,
        'photo_path', p.photo_path,
        'created_at', p.created_at,
        'expires_at', p.expires_at,
        'confirm_count', p.confirm_count,
        'deny_count', p.deny_count,
        'last_confirmed_at', p.last_confirmed_at,
        'request_id', p.request_id
      )
    ) order by p.created_at), '[]'::jsonb)
  )
  from public.posts p
  where p.city_id = p_city_id and p.status = 'published' and p.expires_at > now();
$$;

-- Um post pela id, para a página de compartilhamento (vivo ou já sumido)
create function public.public_post(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'category', p.category,
    'caption', p.caption,
    'photo_path', case when p.status = 'published' and p.expires_at > now() then p.photo_path end,
    'created_at', p.created_at,
    'expires_at', p.expires_at,
    'alive', p.status = 'published' and p.expires_at > now(),
    'confirm_count', p.confirm_count,
    'lng', extensions.st_x(p.location::extensions.geometry),
    'lat', extensions.st_y(p.location::extensions.geometry)
  )
  from public.posts p
  where p.id = p_id and p.status in ('published', 'expired');
$$;
grant execute on function public.public_post to anon, authenticated;

-- ---------------------------------------------------------------------------
-- "Ainda está rolando?": quem está a até 1 km confirma ou nega, uma vez.
-- Confirmar garante pelo menos mais 1h (sem passar de 12h da publicação);
-- negar tira 1h; 3 negações a mais que as confirmações encerram o post.
create function public.vote_post(p_id uuid, p_still boolean, p_lat double precision, p_lng double precision)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  pt extensions.geography := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  p public.posts;
  inserted integer;
begin
  select * into p from public.posts where id = p_id and status = 'published' and expires_at > now();
  if p.id is null then
    raise exception 'Esse post já sumiu' using errcode = 'P0002';
  end if;
  if p.user_id = uid then
    raise exception 'Você não pode confirmar o próprio post' using errcode = '42501';
  end if;
  if not extensions.st_dwithin(p.location, pt, 1000) then
    raise exception 'Chegue mais perto (até 1 km) para responder' using errcode = '22023';
  end if;

  insert into public.post_votes (post_id, user_id, still) values (p_id, uid, p_still)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    raise exception 'Você já respondeu sobre este post' using errcode = '23505';
  end if;

  if p_still then
    update public.posts
    set confirm_count = confirm_count + 1,
        last_confirmed_at = now(),
        expires_at = least(created_at + interval '12 hours', greatest(expires_at, now() + interval '1 hour'))
    where id = p_id
    returning * into p;
  else
    update public.posts
    set deny_count = deny_count + 1,
        expires_at = case
          when deny_count + 1 >= 3 and deny_count + 1 > confirm_count then now()
          else greatest(now() + interval '5 minutes', expires_at - interval '1 hour')
        end
    where id = p_id
    returning * into p;
  end if;

  perform public.log_access(uid, case when p_still then 'confirm_post' else 'deny_post' end, p_id);
  return jsonb_build_object(
    'confirm_count', p.confirm_count,
    'deny_count', p.deny_count,
    'expires_at', p.expires_at,
    'last_confirmed_at', p.last_confirmed_at
  );
end;
$$;
revoke execute on function public.vote_post from public, anon;
grant execute on function public.vote_post to authenticated;

-- ---------------------------------------------------------------------------
-- "Alguém aí?"
create function public.create_request(p_lat double precision, p_lng double precision, p_question text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  pt extensions.geography := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  v_city integer;
  v_id uuid;
begin
  select id into v_city from public.cities where extensions.st_covers(boundary, pt) limit 1;
  if v_city is null then
    raise exception 'O ponto precisa estar dentro da cidade' using errcode = '22023';
  end if;
  if (select count(*) from public.requests where user_id = uid and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'Limite de 3 perguntas por hora atingido' using errcode = '54000';
  end if;

  insert into public.requests (user_id, city_id, location, question)
  values (uid, v_city, pt, btrim(p_question))
  returning id into v_id;
  perform public.log_access(uid, 'create_request', v_id);
  return v_id;
end;
$$;
revoke execute on function public.create_request from public, anon;
grant execute on function public.create_request to authenticated;

create function public.active_requests(p_city_id integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(jsonb_build_object(
      'type', 'Feature',
      'id', r.id,
      'geometry', extensions.st_asgeojson(r.location)::jsonb,
      'properties', jsonb_build_object(
        'id', r.id,
        'question', r.question,
        'answer_count', r.answer_count,
        'created_at', r.created_at,
        'expires_at', r.expires_at
      )
    ) order by r.created_at desc), '[]'::jsonb)
  )
  from public.requests r
  where r.city_id = p_city_id and r.status = 'open' and r.expires_at > now();
$$;
grant execute on function public.active_requests to anon, authenticated;

create function public.report_request(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  inserted integer;
begin
  insert into public.request_reports (request_id, user_id) values (p_id, uid) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;
  update public.requests
  set report_count = report_count + 1,
      status = case when report_count + 1 >= 3 then 'hidden' else status end
  where id = p_id;
  perform public.log_access(uid, 'report_request', p_id);
end;
$$;
revoke execute on function public.report_request from public, anon;
grant execute on function public.report_request to authenticated;

-- ---------------------------------------------------------------------------
-- Alertas: o navegador grava a própria inscrição
create function public.save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text,
  p_lat double precision, p_lng double precision, p_radius_m integer,
  p_categories public.post_category[] default null, p_requests boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
begin
  if p_endpoint !~ '^https://' then
    raise exception 'Inscrição inválida' using errcode = '22023';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, location, radius_m, categories, requests)
  values (
    p_endpoint, uid, p_p256dh, p_auth,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    p_radius_m, nullif(p_categories, '{}'), p_requests
  )
  on conflict (endpoint) do update
  set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
      location = excluded.location, radius_m = excluded.radius_m,
      categories = excluded.categories, requests = excluded.requests, updated_at = now();
end;
$$;
revoke execute on function public.save_push_subscription from public, anon;
grant execute on function public.save_push_subscription to authenticated;

create function public.my_push_subscription(p_endpoint text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('radius_m', radius_m, 'categories', categories, 'requests', requests)
  from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke execute on function public.my_push_subscription from public, anon;
grant execute on function public.my_push_subscription to authenticated;

create function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;
revoke execute on function public.delete_push_subscription from public, anon;
grant execute on function public.delete_push_subscription to authenticated;

-- Quem avisar (só o servidor, com a service_role). Cada evento avisa uma vez:
-- o notified_at é marcado aqui dentro, na mesma operação.
create function public.push_targets_for_post(p_id uuid)
returns table (endpoint text, p256dh text, auth text, kind text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.posts;
  r public.requests;
begin
  update public.posts set notified_at = now()
  where id = p_id and status = 'published' and notified_at is null
  returning * into p;
  if p.id is null then return; end if;

  -- quem tem alerta na área e na categoria
  return query
    select s.endpoint, s.p256dh, s.auth, 'area'::text
    from public.push_subscriptions s
    where s.user_id <> p.user_id
      and extensions.st_dwithin(s.location, p.location, s.radius_m)
      and (s.categories is null or p.category = any (s.categories));

  -- quem perguntou, se o post responde a um pedido
  if p.request_id is not null then
    select * into r from public.requests where id = p.request_id;
    return query
      select s.endpoint, s.p256dh, s.auth, 'resposta'::text
      from public.push_subscriptions s
      where s.user_id = r.user_id and s.user_id <> p.user_id;
  end if;
end;
$$;
revoke execute on function public.push_targets_for_post from public, anon, authenticated;
grant execute on function public.push_targets_for_post to service_role;

create function public.push_targets_for_request(p_id uuid)
returns table (endpoint text, p256dh text, auth text, question text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.requests;
begin
  update public.requests set notified_at = now()
  where id = p_id and status = 'open' and notified_at is null
  returning * into r;
  if r.id is null then return; end if;
  return query
    select s.endpoint, s.p256dh, s.auth, r.question
    from public.push_subscriptions s
    where s.requests and s.user_id <> r.user_id
      and extensions.st_dwithin(s.location, r.location, s.radius_m);
end;
$$;
revoke execute on function public.push_targets_for_request from public, anon, authenticated;
grant execute on function public.push_targets_for_request to service_role;

-- ---------------------------------------------------------------------------
-- Mapa de calor do histórico: posts dos últimos N dias numa grade de ~150 m.
-- Só células com 3 ou mais posts saem (ninguém é localizável por um post só),
-- e posts escondidos pela moderação não contam.
create function public.heat_history(p_city_id integer, p_days integer default 30, p_category public.post_category default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with cells as (
    select extensions.st_snaptogrid(location::extensions.geometry, 0.0015) as cell, count(*) as n
    from public.posts
    where city_id = p_city_id
      and status in ('published', 'expired')
      and created_at > now() - make_interval(days => least(greatest(p_days, 1), 90))
      and (p_category is null or category = p_category)
    group by 1
    having count(*) >= 3
  )
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(jsonb_build_object(
      'type', 'Feature',
      'geometry', extensions.st_asgeojson(cell)::jsonb,
      'properties', jsonb_build_object('n', n)
    )), '[]'::jsonb)
  )
  from cells;
$$;
grant execute on function public.heat_history to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Painel admin
create function public.require_admin()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid and is_admin) then
    raise exception 'Acesso restrito à moderação' using errcode = '42501';
  end if;
  return uid;
end;
$$;
revoke execute on function public.require_admin from public, anon;

create function public.admin_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'posts', coalesce((
      select jsonb_agg(row_to_json(q) order by q.created_at desc)
      from (
        select p.id, p.user_id, p.status, p.category, p.caption, p.photo_path, p.created_at, p.expires_at,
               p.report_count, p.deny_count, p.confirm_count, p.moderation,
               (select array_agg(r.reason) filter (where r.reason is not null) from public.reports r where r.post_id = p.id) as reasons,
               (select count(*) from public.posts o where o.user_id = p.user_id) as author_posts,
               (select pr.banned_at is not null from public.profiles pr where pr.id = p.user_id) as author_banned
        from public.posts p
        where p.photo_path is not null
          and (p.status in ('hidden', 'pending') or p.report_count > 0 or p.deny_count > 0)
          and p.created_at > now() - interval '2 days'
        limit 200
      ) q
    ), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(row_to_json(q) order by q.created_at desc)
      from (
        select r.id, r.user_id, r.status, r.question, r.created_at, r.expires_at, r.report_count, r.answer_count,
               (select pr.banned_at is not null from public.profiles pr where pr.id = r.user_id) as author_banned
        from public.requests r
        where (r.status = 'hidden' or r.report_count > 0) and r.created_at > now() - interval '2 days'
        limit 200
      ) q
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.admin_queue from public, anon;
grant execute on function public.admin_queue to authenticated;

create function public.admin_set_post(p_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  update public.posts
  set status = case when p_visible then 'published'::public.post_status else 'hidden'::public.post_status end,
      report_count = case when p_visible then 0 else report_count end
  where id = p_id and photo_path is not null and status in ('published', 'hidden')
    and (not p_visible or expires_at > now());
  if not found then
    raise exception 'Post não encontrado, vencido ou pendente' using errcode = 'P0002';
  end if;
  perform public.log_access(admin, case when p_visible then 'admin_restore_post' else 'admin_hide_post' end, p_id);
end;
$$;
revoke execute on function public.admin_set_post from public, anon;
grant execute on function public.admin_set_post to authenticated;

create function public.admin_set_request(p_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  update public.requests
  set status = case when p_visible then 'open' else 'hidden' end,
      report_count = case when p_visible then 0 else report_count end
  where id = p_id and status in ('open', 'hidden');
  perform public.log_access(admin, case when p_visible then 'admin_restore_request' else 'admin_hide_request' end, p_id);
end;
$$;
revoke execute on function public.admin_set_request from public, anon;
grant execute on function public.admin_set_request to authenticated;

-- Banir esconde tudo o que a conta tem no ar; desbanir não traz de volta
create function public.admin_ban_user(p_user_id uuid, p_ban boolean)
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
  perform public.log_access(admin, case when p_ban then 'admin_ban' else 'admin_unban' end, null);
end;
$$;
revoke execute on function public.admin_ban_user from public, anon;
grant execute on function public.admin_ban_user to authenticated;

create function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;
grant execute on function public.am_i_admin to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: avisar também quando a vida do post muda (voto) e quando um
-- pedido abre ou fecha
drop trigger posts_broadcast on public.posts;

create or replace function public.broadcast_post_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.status is distinct from old.status and (new.status = 'published' or old.status = 'published'))
     or (new.status = 'published' and new.expires_at is distinct from old.expires_at) then
    begin
      perform realtime.send(
        jsonb_build_object('id', new.id, 'status', new.status),
        'post_changed',
        'city:' || new.city_id,
        false
      );
    exception when others then
      raise warning 'realtime.send falhou: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

create trigger posts_broadcast
  after update of status, expires_at on public.posts
  for each row execute function public.broadcast_post_change();

create function public.broadcast_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send(jsonb_build_object('id', new.id), 'request_changed', 'city:' || new.city_id, false);
  exception when others then
    raise warning 'realtime.send falhou: %', sqlerrm;
  end;
  return new;
end;
$$;

create trigger requests_broadcast
  after insert or update of status, answer_count on public.requests
  for each row execute function public.broadcast_request_change();

-- ---------------------------------------------------------------------------
-- Pedidos vencem junto com a limpeza (a rota /api/cron/expire chama expire_posts)
create or replace function public.expire_posts()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  paths text[];
begin
  update public.posts set status = 'expired'
  where (status in ('published', 'hidden') and expires_at <= now())
     or (status = 'pending' and created_at < now() - interval '1 hour');

  update public.requests set status = 'expired'
  where status in ('open', 'hidden') and expires_at <= now();

  select coalesce(array_agg(photo_path), '{}') into paths
  from (
    select photo_path from public.posts
    where status = 'expired' and photo_path is not null
    limit 1000
  ) due;
  return paths;
end;
$$;

-- ---------------------------------------------------------------------------
-- A limpeza das fotos agendada no próprio banco: a cada 10 min o pg_cron
-- chama a rota do app com o segredo. URL e segredo ficam no Vault:
--   select vault.create_secret('https://seu-app.vercel.app', 'app_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
-- Sem os dois segredos, o job não faz nada.
create function public.call_expire_route()
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
    url := rtrim(v_url, '/') || '/api/cron/expire',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  );
end;
$$;
revoke execute on function public.call_expire_route from public, anon, authenticated;

select cron.schedule('expire-photos', '*/10 * * * *', $$ select public.call_expire_route(); $$);
