-- Estabelecimentos: comércios verificados pela moderação que podem publicar
-- divulgação. A divulgação é sempre identificada como tal (CDC, art. 36), não
-- rende XP, não recebe "ainda está rolando?", não dispara alerta e fica fora
-- do calor, do Trends e do histórico.

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null unique references auth.users (id) on delete cascade,
  city_id integer not null references public.cities (id),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  segment text check (char_length(segment) <= 40),
  address text not null check (char_length(btrim(address)) between 5 and 120),
  location extensions.geography(Point, 4326) not null,
  whatsapp text check (whatsapp ~ '^\+?[0-9 ()-]{8,20}$'),
  instagram text check (instagram ~ '^@?[A-Za-z0-9_.]{1,30}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  review_note text check (char_length(review_note) <= 280),
  reviewed_at timestamptz,
  last_post_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.businesses enable row level security;

alter table public.posts add column business_id uuid references public.businesses (id) on delete set null;

create or replace function public.category_lifetime(c public.post_category)
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

-- ---------------------------------------------------------------------------
-- O pedido do comerciante. Um por conta; recusado pode pedir de novo.
create function public.request_business(
  p_name text,
  p_segment text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_whatsapp text default null,
  p_instagram text default null
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
  cur public.businesses;
begin
  select id into v_city from public.cities where extensions.st_covers(boundary, pt) limit 1;
  if v_city is null then
    raise exception 'O estabelecimento precisa ficar dentro da cidade' using errcode = '22023';
  end if;
  select * into cur from public.businesses where owner = uid;
  if cur.status in ('approved', 'suspended') then
    raise exception 'Seu estabelecimento já foi analisado. Para mudar os dados, fale com a moderação.' using errcode = '23505';
  end if;

  insert into public.businesses (owner, city_id, name, segment, address, location, whatsapp, instagram)
  values (uid, v_city, btrim(p_name), nullif(btrim(p_segment), ''), btrim(p_address), pt,
          nullif(btrim(p_whatsapp), ''), nullif(btrim(p_instagram), ''))
  on conflict (owner) do update
    set city_id = excluded.city_id, name = excluded.name, segment = excluded.segment,
        address = excluded.address, location = excluded.location, whatsapp = excluded.whatsapp,
        instagram = excluded.instagram, status = 'pending', review_note = null, reviewed_at = null,
        created_at = now()
  returning * into cur;

  perform public.log_access(uid, 'request_business', cur.id);
  return public.business_json(cur);
end;
$$;

create function public.business_json(b public.businesses)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when b.id is null then null else jsonb_build_object(
    'id', b.id, 'name', b.name, 'segment', b.segment, 'address', b.address,
    'lat', extensions.st_y(b.location::extensions.geometry), 'lng', extensions.st_x(b.location::extensions.geometry),
    'whatsapp', b.whatsapp, 'instagram', b.instagram, 'status', b.status, 'review_note', b.review_note,
    'last_post_at', b.last_post_at, 'created_at', b.created_at
  ) end;
$$;
revoke execute on function public.business_json from public, anon, authenticated;

revoke execute on function public.request_business from public, anon;
grant execute on function public.request_business to authenticated;

create function public.my_business()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.business_json(b) from public.businesses b where b.owner = auth.uid();
$$;
revoke execute on function public.my_business from public, anon;
grant execute on function public.my_business to authenticated;

-- Moderação: a fila e a decisão
create function public.admin_businesses(p_status text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(public.business_json(b) || jsonb_build_object(
             'owner_email', (select u.email from auth.users u where u.id = b.owner),
             'posts', (select count(*) from public.posts p where p.business_id = b.id and p.status <> 'pending')
           ) order by b.created_at desc)
    from public.businesses b
    where p_status is null or b.status = p_status
  ), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_businesses from public, anon;
grant execute on function public.admin_businesses to authenticated;

create function public.admin_review_business(p_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  if p_status not in ('approved', 'rejected', 'suspended') then
    raise exception 'Decisão inválida' using errcode = '22023';
  end if;
  update public.businesses
  set status = p_status, review_note = nullif(btrim(p_note), ''), reviewed_at = now()
  where id = p_id;
  if not found then
    raise exception 'Estabelecimento não encontrado' using errcode = 'P0002';
  end if;
  -- Suspenso: a divulgação no ar sai na hora
  if p_status = 'suspended' then
    update public.posts set status = 'hidden'
    where business_id = p_id and status = 'published' and expires_at > now();
  end if;
  perform public.log_access(admin, 'admin_business_' || p_status, p_id);
end;
$$;
revoke execute on function public.admin_review_business from public, anon;
grant execute on function public.admin_review_business to authenticated;

-- ---------------------------------------------------------------------------
-- Postar: divulgação só de estabelecimento aprovado, no próprio endereço
-- (até 150 m) e uma a cada 24 horas
drop function public.create_post(double precision, double precision, public.post_category, text, uuid);

create function public.create_post(
  p_lat double precision,
  p_lng double precision,
  p_category public.post_category,
  p_caption text default null,
  p_request_id uuid default null,
  p_keep_history boolean default false
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
  b public.businesses;
begin
  select id into v_city from public.cities where extensions.st_covers(boundary, pt) limit 1;
  if v_city is null then
    raise exception 'Você precisa estar dentro da cidade para postar' using errcode = '22023';
  end if;

  if (select count(*) from public.posts where user_id = uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Limite de 5 posts por hora atingido' using errcode = '54000';
  end if;

  if p_category = 'estabelecimento' then
    select * into b from public.businesses where owner = uid and status = 'approved';
    if b.id is null then
      raise exception 'Só estabelecimentos verificados publicam divulgação' using errcode = '42501';
    end if;
    if not extensions.st_dwithin(b.location, pt, 150) then
      raise exception 'A divulgação precisa ser feita no endereço do estabelecimento (até 150 m)' using errcode = '22023';
    end if;
    if b.last_post_at > now() - interval '24 hours' then
      raise exception 'Uma divulgação a cada 24 horas' using errcode = '54000';
    end if;
    if p_request_id is not null then
      raise exception 'Divulgação não responde a pedidos' using errcode = '22023';
    end if;
  end if;

  if p_request_id is not null and not exists (
    select 1 from public.requests
    where id = p_request_id and status = 'open' and expires_at > now()
      and extensions.st_dwithin(location, pt, 1000)
  ) then
    raise exception 'Esse pedido já fechou ou você está a mais de 1 km dele' using errcode = '22023';
  end if;

  v_path := v_city || '/' || v_id;
  insert into public.posts (id, user_id, city_id, location, category, caption, photo_path, request_id, business_id)
  values (v_id, uid, v_city, pt, p_category, nullif(btrim(p_caption), ''), v_path, p_request_id, b.id);

  perform public.log_access(uid, 'create_post', v_id);
  return jsonb_build_object('id', v_id, 'photo_path', v_path);
end;
$$;
revoke execute on function public.create_post from public, anon;
grant execute on function public.create_post to authenticated;

-- Publicar: divulgação não rende XP e marca a vez do dia do estabelecimento
create or replace function public.finalize_post(p_id uuid, p_approved boolean, p_moderation jsonb default null)
returns public.post_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.post_status;
  v_request uuid;
  v_user uuid;
  v_business uuid;
  v_asked timestamptz;
begin
  update public.posts
  set status = case when p_approved then 'published'::public.post_status else 'hidden'::public.post_status end,
      moderation = p_moderation,
      created_at = case when p_approved then now() else created_at end,
      expires_at = case when p_approved then now() + public.category_lifetime(category) else expires_at end
  where id = p_id and status = 'pending'
  returning status, request_id, user_id, business_id into result, v_request, v_user, v_business;

  if result is null then
    raise exception 'Post não encontrado ou já publicado' using errcode = 'P0002';
  end if;
  if result = 'published' then
    if v_business is not null then
      update public.businesses set last_post_at = now() where id = v_business;
      return result;
    end if;
    perform public.grant_xp(v_user, 'post', 5, p_id);
    if v_request is not null then
      update public.requests set answer_count = answer_count + 1 where id = v_request returning created_at into v_asked;
      if now() - v_asked <= interval '15 minutes' then
        perform public.grant_xp(v_user, 'resposta_rapida', 15, p_id);
      else
        perform public.grant_xp(v_user, 'resposta', 8, p_id);
      end if;
    end if;
  end if;
  return result;
end;
$$;

-- Divulgação não recebe "ainda está rolando?": quem garante é o estabelecimento
create or replace function public.vote_post(p_id uuid, p_still boolean, p_lat double precision, p_lng double precision)
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
  denier uuid;
begin
  select * into p from public.posts where id = p_id and status = 'published' and expires_at > now();
  if p.id is null then
    raise exception 'Esse post já sumiu' using errcode = 'P0002';
  end if;
  if p.category = 'estabelecimento' then
    raise exception 'Divulgação não recebe confirmação' using errcode = '22023';
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
    perform public.grant_xp(p.user_id, 'post_confirmado', 10, p_id);
    perform public.grant_xp(uid, 'confirmou', 2, p_id);
  else
    update public.posts
    set deny_count = deny_count + 1,
        expires_at = case
          when deny_count + 1 >= 3 and deny_count + 1 > confirm_count then now()
          else greatest(now() + interval '5 minutes', expires_at - interval '1 hour')
        end
    where id = p_id
    returning * into p;
    perform public.grant_xp(uid, 'negou', 1, p_id);
    if p.expires_at <= now() then
      for denier in select user_id from public.post_votes where post_id = p_id and not still loop
        perform public.grant_xp(denier, 'detetive', 5, p_id);
      end loop;
    end if;
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

-- Divulgação não dispara alerta
create or replace function public.push_targets_for_post(p_id uuid)
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
  if p.id is null or p.category = 'estabelecimento' then return; end if;

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

-- O calor é de acontecimento: divulgação não esquenta o mapa
create or replace function public.heat_history(p_city_id integer, p_days integer default 30, p_category public.post_category default null)
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
      and category <> 'estabelecimento'
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

-- O mapa: divulgação mostra o estabelecimento (nome, segmento, contatos) e
-- não o nível nem o apelido de quem postou
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
        'request_id', p.request_id,
        'view_count', p.view_count,
        'share_count', p.share_count,
        'author_level', case when b.id is null then coalesce(pr.level, 1) end,
        'author_nickname', case when b.id is null and pr.show_nickname then pr.nickname end,
        'business_name', b.name,
        'business_segment', b.segment,
        'business_whatsapp', b.whatsapp,
        'business_instagram', b.instagram
      )
    ) order by p.created_at), '[]'::jsonb)
  )
  from public.posts p
  left join public.profiles pr on pr.id = p.user_id
  left join public.businesses b on b.id = p.business_id
  where p.city_id = p_city_id and p.status = 'published' and p.expires_at > now();
$$;
