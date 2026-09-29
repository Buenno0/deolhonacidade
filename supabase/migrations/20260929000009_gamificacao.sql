-- Gamificação: XP, níveis, conquistas (bronze, prata, ouro), sequência de
-- dias e apelido opcional. Regra: ganha quem ajuda (post confirmado, resposta
-- rápida, derrubar post falso), não quem posta muito. Tudo é concedido aqui,
-- dentro das regras do banco; o navegador só lê.

alter table public.profiles
  add column nickname text unique check (nickname ~ '^[a-z0-9_.]{3,20}$'),
  add column show_nickname boolean not null default false,
  add column xp integer not null default 0,
  add column level integer not null default 1,
  add column streak_days integer not null default 0,
  add column streak_last date,
  add column xp_day date,
  add column xp_day_total integer not null default 0;

create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  points integer not null,
  ref uuid,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
alter table public.xp_events enable row level security;

create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge text not null,
  tier smallint not null check (tier between 1 and 3),
  earned_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (user_id, badge, tier)
);
alter table public.user_badges enable row level security;

-- Curioso, Olheiro, Vigia, Sentinela, Guardião da Cidade, Lenda de Itapetininga
create function public.level_for(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_xp >= 8000 then 6
    when p_xp >= 3000 then 5
    when p_xp >= 1200 then 4
    when p_xp >= 400 then 3
    when p_xp >= 100 then 2
    else 1
  end;
$$;

-- Conquistas: confere os números da pessoa e concede os degraus que faltam
create function public.check_badges(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_posts integer;
  v_confirmed integer;
  v_fast integer;
  v_owl integer;
  v_detective integer;
  v_views integer;
  v_streak integer;
begin
  if p_user is null then return; end if;

  select count(*) filter (where status in ('published', 'expired')),
         count(*) filter (where confirm_count > 0),
         count(*) filter (where confirm_count > 0
                            and extract(hour from created_at at time zone 'America/Sao_Paulo') < 5),
         coalesce(max(view_count), 0)
  into v_posts, v_confirmed, v_owl, v_views
  from public.posts where user_id = p_user;

  select count(*) into v_fast
  from public.posts p join public.requests r on r.id = p.request_id
  where p.user_id = p_user and p.status in ('published', 'expired')
    and p.created_at - r.created_at <= interval '15 minutes';

  select count(*) into v_detective
  from public.post_votes v join public.posts p on p.id = v.post_id
  where v.user_id = p_user and not v.still and p.deny_count >= 3 and p.deny_count > p.confirm_count;

  select streak_days into v_streak from public.profiles where id = p_user;

  insert into public.user_badges (user_id, badge, tier)
  select p_user, b.badge, b.tier
  from (values
    ('primeiro_olhar', 1, v_posts >= 1),
    ('olho_clinico', 1, v_confirmed >= 5), ('olho_clinico', 2, v_confirmed >= 25), ('olho_clinico', 3, v_confirmed >= 100),
    ('pronto_socorro', 1, v_fast >= 3), ('pronto_socorro', 2, v_fast >= 10), ('pronto_socorro', 3, v_fast >= 30),
    ('coruja', 1, v_owl >= 1), ('coruja', 2, v_owl >= 5), ('coruja', 3, v_owl >= 15),
    ('detetive', 1, v_detective >= 1), ('detetive', 2, v_detective >= 5), ('detetive', 3, v_detective >= 20),
    ('viral', 1, v_views >= 25), ('viral', 2, v_views >= 100), ('viral', 3, v_views >= 500),
    ('sempre_de_olho', 1, coalesce(v_streak, 0) >= 3), ('sempre_de_olho', 2, coalesce(v_streak, 0) >= 7),
    ('sempre_de_olho', 3, coalesce(v_streak, 0) >= 30)
  ) as b(badge, tier, earned)
  where b.earned
  on conflict do nothing;
end;
$$;
revoke execute on function public.check_badges from public, anon, authenticated;

-- Conceder XP: uma vez por (pessoa, tipo, referência), com teto de 150 XP
-- positivos por dia e a sequência de dias contando qualquer ação útil
create function public.grant_xp(p_user uuid, p_kind text, p_points integer, p_ref uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
  prof public.profiles;
  v_today integer;
  v_points integer;
  inserted integer;
begin
  if p_user is null then return; end if;
  select * into prof from public.profiles where id = p_user for update;
  if prof.id is null then return; end if;

  v_today := case when prof.xp_day = v_day then prof.xp_day_total else 0 end;
  v_points := case when p_points > 0 then least(p_points, greatest(150 - v_today, 0)) else p_points end;

  insert into public.xp_events (user_id, kind, points, ref) values (p_user, p_kind, v_points, p_ref)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;

  update public.profiles
  set xp = greatest(0, xp + v_points),
      level = public.level_for(greatest(0, xp + v_points)),
      xp_day = v_day,
      xp_day_total = v_today + greatest(v_points, 0),
      streak_days = case
        when p_points <= 0 then streak_days
        when streak_last = v_day then streak_days
        when streak_last = v_day - 1 then streak_days + 1
        else 1
      end,
      streak_last = case when p_points > 0 then v_day else streak_last end
  where id = p_user;

  perform public.check_badges(p_user);
end;
$$;
revoke execute on function public.grant_xp from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Onde o XP nasce

-- Publicar: +5; responder a um pedido: +15 em até 15 min, +8 depois
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
  v_asked timestamptz;
begin
  update public.posts
  set status = case when p_approved then 'published'::public.post_status else 'hidden'::public.post_status end,
      moderation = p_moderation,
      created_at = case when p_approved then now() else created_at end,
      expires_at = case when p_approved then now() + public.category_lifetime(category) else expires_at end
  where id = p_id and status = 'pending'
  returning status, request_id, user_id into result, v_request, v_user;

  if result is null then
    raise exception 'Post não encontrado ou já publicado' using errcode = 'P0002';
  end if;
  if result = 'published' then
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

-- Votar: confirmação dá +10 a quem postou (uma vez por post) e +2 a quem
-- confirmou; se as negações encerram o post, quem negou ganha +5
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

-- Post escondido por denúncia: −30 para quem postou
create or replace function public.report_post(p_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  inserted integer;
  p public.posts;
begin
  if not exists (select 1 from public.posts where id = p_id and status = 'published' and expires_at > now()) then
    raise exception 'Post não encontrado' using errcode = 'P0002';
  end if;

  insert into public.reports (post_id, user_id, reason) values (p_id, uid, p_reason)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return;
  end if;

  update public.posts
  set report_count = report_count + 1,
      status = case when report_count + 1 >= 3 then 'hidden'::public.post_status else status end
  where id = p_id
  returning * into p;
  if p.status = 'hidden' then
    perform public.grant_xp(p.user_id, 'post_escondido', -30, p_id);
  end if;

  perform public.log_access(uid, 'report_post', p_id);
end;
$$;

-- Visualizações: ao passar de 25, 100 e 500, confere a conquista "Viral"
create or replace function public.record_interaction(p_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  who text := coalesce(
    auth.uid()::text,
    coalesce(headers ->> 'cf-connecting-ip', split_part(headers ->> 'x-forwarded-for', ',', 1), headers ->> 'x-real-ip', '')
      || '|' || coalesce(headers ->> 'user-agent', '')
  );
  inserted integer;
  v_views integer;
  v_author uuid;
begin
  if p_kind not in ('view', 'share') then
    raise exception 'Interação inválida' using errcode = '22023';
  end if;
  if not exists (select 1 from public.posts where id = p_id and status = 'published' and expires_at > now()) then
    return;
  end if;
  insert into public.post_interactions (post_id, viewer, kind)
  values (p_id, md5(who || '|' || p_id::text), p_kind)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;
  if p_kind = 'view' then
    update public.posts set view_count = view_count + 1 where id = p_id returning view_count, user_id into v_views, v_author;
    if v_views in (25, 100, 500) then
      perform public.check_badges(v_author);
    end if;
  else
    update public.posts set share_count = share_count + 1 where id = p_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leitura

-- O post mostra o nível de quem postou (sempre) e o apelido (só se a pessoa quis)
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
        'author_level', coalesce(pr.level, 1),
        'author_nickname', case when pr.show_nickname then pr.nickname end
      )
    ) order by p.created_at), '[]'::jsonb)
  )
  from public.posts p
  left join public.profiles pr on pr.id = p.user_id
  where p.city_id = p_city_id and p.status = 'published' and p.expires_at > now();
$$;

-- O meu progresso: XP, nível, sequência, conquistas e os números que faltam
create function public.my_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if uid is null then return null; end if;
  select * into prof from public.profiles where id = uid;
  return jsonb_build_object(
    'xp', prof.xp,
    'level', prof.level,
    'streak_days', case when prof.streak_last >= v_day - 1 then prof.streak_days else 0 end,
    'streak_today', prof.streak_last = v_day,
    'xp_today', case when prof.xp_day = v_day then prof.xp_day_total else 0 end,
    'nickname', prof.nickname,
    'show_nickname', prof.show_nickname,
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object('badge', badge, 'tier', tier, 'earned_at', earned_at, 'seen', seen_at is not null) order by earned_at)
      from public.user_badges where user_id = uid
    ), '[]'::jsonb),
    'counts', jsonb_build_object(
      'posts', (select count(*) from public.posts where user_id = uid and status in ('published', 'expired')),
      'confirmed', (select count(*) from public.posts where user_id = uid and confirm_count > 0),
      'max_views', (select coalesce(max(view_count), 0) from public.posts where user_id = uid)
    )
  );
end;
$$;
revoke execute on function public.my_progress from public, anon;
grant execute on function public.my_progress to authenticated;

create function public.mark_badges_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_badges set seen_at = now() where user_id = auth.uid() and seen_at is null;
$$;
revoke execute on function public.mark_badges_seen from public, anon;
grant execute on function public.mark_badges_seen to authenticated;

create function public.set_nickname(p_nickname text, p_show boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  v_nick text := nullif(lower(btrim(p_nickname)), '');
begin
  if v_nick is not null and v_nick !~ '^[a-z0-9_.]{3,20}$' then
    raise exception 'Use de 3 a 20 letras minúsculas, números, ponto ou _' using errcode = '22023';
  end if;
  if v_nick is not null and exists (select 1 from public.profiles where nickname = v_nick and id <> uid) then
    raise exception 'Esse apelido já tem dono' using errcode = '23505';
  end if;
  update public.profiles set nickname = v_nick, show_nickname = p_show and v_nick is not null where id = uid;
end;
$$;
revoke execute on function public.set_nickname from public, anon;
grant execute on function public.set_nickname to authenticated;
