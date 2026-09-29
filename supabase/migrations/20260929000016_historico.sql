-- Histórico: quem publica pode escolher "guardar no histórico". Depois de
-- sumir do mapa, a foto fica até 30 dias no histórico da cidade, com teto de
-- 500 por cidade: cada dia garante os seus 10 melhores e o resto das vagas vai
-- para os mais relevantes do mês. Divulgação e o que foi escondido, denunciado
-- ou negado nunca entram.

alter table public.posts
  add column keep_history boolean not null default false,
  add column archived_until timestamptz;
create index posts_archive_idx on public.posts (city_id, created_at) where archived_until is not null;

-- A mesma relevância do Trends (lib/posts.ts, engagement)
create function public.engagement(p public.posts)
returns integer
language sql
immutable
set search_path = ''
as $$
  select p.view_count + 4 * p.confirm_count + 6 * p.share_count - 2 * p.deny_count;
$$;

-- create_post grava a escolha. A assinatura já tem p_keep_history (migration
-- 15); aqui só passa a usá-la.
create or replace function public.create_post(
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
  insert into public.posts (id, user_id, city_id, location, category, caption, photo_path, request_id, business_id, keep_history)
  values (v_id, uid, v_city, pt, p_category, nullif(btrim(p_caption), ''), v_path, p_request_id, b.id,
          coalesce(p_keep_history, false) and p_category <> 'estabelecimento');

  perform public.log_access(uid, 'create_post', v_id);
  return jsonb_build_object('id', v_id, 'photo_path', v_path);
end;
$$;

-- O teto: 500 por cidade, com os 10 melhores de cada dia garantidos
create function public.apply_history_cap()
returns void
language sql
security definer
set search_path = ''
as $$
  with by_day as (
    select p.id, p.city_id, p.created_at, public.engagement(p) as score,
           row_number() over (
             partition by p.city_id, (p.created_at at time zone 'America/Sao_Paulo')::date
             order by public.engagement(p) desc, p.created_at desc
           ) as day_rank
    from public.posts p
    where p.archived_until > now()
  ), ranked as (
    select id,
           row_number() over (
             partition by city_id
             order by (day_rank <= 10) desc, score desc, created_at desc
           ) as city_rank
    from by_day
  )
  update public.posts p set archived_until = null
  from ranked r
  where r.id = p.id and r.city_rank > 500;
$$;
revoke execute on function public.apply_history_cap from public, anon, authenticated;

-- A limpeza: o que venceu publicado, com a escolha feita e sem problema,
-- vai para o histórico e guarda a foto. As outras fotos vencidas saem, e
-- também as do histórico que passaram de 30 dias ou do teto.
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

  update public.posts set status = 'expired'
  where (status in ('published', 'hidden') and expires_at <= now())
     or (status = 'pending' and created_at < now() - interval '1 hour');

  -- Escondido pela moderação nunca fica guardado
  update public.posts set archived_until = null
  where archived_until is not null and status = 'hidden';

  update public.requests set status = 'expired'
  where status in ('open', 'hidden') and expires_at <= now();

  perform public.apply_history_cap();

  select coalesce(array_agg(photo_path), '{}') into paths
  from (
    select photo_path from public.posts
    where status = 'expired' and photo_path is not null
      and (archived_until is null or archived_until <= now())
    limit 1000
  ) due;
  return paths;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leitura: aberta a todos, sem nada de quem postou

-- Os dias com algo guardado (a régua mostra os 30 e apaga os vazios)
create function public.history_days(p_city_id integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d desc), '[]'::jsonb)
  from (
    select (created_at at time zone 'America/Sao_Paulo')::date as d, count(*) as n
    from public.posts
    where city_id = p_city_id and status = 'expired' and photo_path is not null and archived_until > now()
    group by 1
  ) t;
$$;
grant execute on function public.history_days to anon, authenticated;

create function public.history_posts(p_city_id integer, p_day date)
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
        'request_id', null,
        'view_count', p.view_count,
        'share_count', p.share_count,
        'archived_until', p.archived_until
      )
    ) order by p.created_at), '[]'::jsonb)
  )
  from public.posts p
  where p.city_id = p_city_id and p.status = 'expired' and p.photo_path is not null
    and p.archived_until > now()
    and (p.created_at at time zone 'America/Sao_Paulo')::date = p_day;
$$;
grant execute on function public.history_posts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Controle do autor

create function public.remove_from_history(p_id uuid)
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
  update public.posts set archived_until = null, keep_history = false
  where id = p_id and user_id = uid;
  if not found then
    raise exception 'Post não encontrado' using errcode = 'P0002';
  end if;
  perform public.log_access(uid, 'remove_from_history', p_id);
end;
$$;
revoke execute on function public.remove_from_history from public, anon;
grant execute on function public.remove_from_history to authenticated;

-- Apagar um post meu também tira do histórico
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
  set status = 'expired', expires_at = least(expires_at, now()), archived_until = null, keep_history = false
  where id = p_id and user_id = uid and (status in ('published', 'hidden', 'pending') or archived_until is not null);
  if not found then
    raise exception 'Post não encontrado' using errcode = 'P0002';
  end if;
  perform public.log_access(uid, 'delete_post', p_id);
end;
$$;

-- Meus posts: os da última semana e os que estão no histórico
create or replace function public.my_posts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'category', p.category,
    'caption', p.caption,
    'photo_path', p.photo_path,
    'status', case when p.status = 'published' and p.expires_at <= now() then 'expired' else p.status::text end,
    'created_at', p.created_at,
    'expires_at', p.expires_at,
    'view_count', p.view_count,
    'confirm_count', p.confirm_count,
    'deny_count', p.deny_count,
    'keep_history', p.keep_history,
    'archived_until', case when p.archived_until > now() then p.archived_until end
  ) order by p.created_at desc), '[]'::jsonb)
  from public.posts p
  where p.user_id = auth.uid() and p.status <> 'pending'
    and (p.created_at > now() - interval '7 days' or p.archived_until > now());
$$;

-- Denunciar vale também no histórico: com 3 denúncias, sai de lá
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
  live boolean;
begin
  select (status = 'published' and expires_at > now()) into live
  from public.posts
  where id = p_id and ((status = 'published' and expires_at > now()) or (status = 'expired' and archived_until > now()));
  if live is null then
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
      status = case when live and report_count + 1 >= 3 then 'hidden'::public.post_status else status end,
      archived_until = case when report_count + 1 >= 3 then null else archived_until end
  where id = p_id
  returning * into p;
  if p.report_count >= 3 and (p.status = 'hidden' or not live) then
    perform public.grant_xp(p.user_id, 'post_escondido', -30, p_id);
  end if;

  perform public.log_access(uid, 'report_post', p_id);
end;
$$;

-- A moderação também tira do histórico
create or replace function public.admin_set_post(p_id uuid, p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  if not p_visible then
    update public.posts set archived_until = null
    where id = p_id and status = 'expired' and archived_until is not null;
    if found then
      perform public.log_access(admin, 'admin_remove_from_history', p_id);
      return;
    end if;
  end if;
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

-- O link compartilhado continua abrindo enquanto o post está no histórico
create or replace function public.public_post(p_id uuid)
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
    'photo_path', case
      when (p.status = 'published' and p.expires_at > now()) or (p.status = 'expired' and p.archived_until > now())
      then p.photo_path end,
    'created_at', p.created_at,
    'expires_at', p.expires_at,
    'alive', p.status = 'published' and p.expires_at > now(),
    'archived', p.status = 'expired' and p.archived_until > now() and p.photo_path is not null,
    'confirm_count', p.confirm_count,
    'business_name', (select b.name from public.businesses b where b.id = p.business_id),
    'lng', extensions.st_x(p.location::extensions.geometry),
    'lat', extensions.st_y(p.location::extensions.geometry)
  )
  from public.posts p
  where p.id = p_id and p.status in ('published', 'expired');
$$;
