-- Auditoria de segurança: limites que não furam, dados de post removido que
-- não vazam, inscrição de aviso só para serviços de push e votos e denúncias
-- só de contas com pelo menos um dia.

-- Conta com mais de 24 h: denúncia e "ainda está rolando?" escondem ou
-- encerram posts de outras pessoas, então contas criadas na hora não pesam
create or replace function public.require_trusted_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
begin
  if (select created_at from auth.users where id = uid) > now() - interval '24 hours' then
    raise exception 'Contas novas podem denunciar e responder depois de 24 horas' using errcode = '42501';
  end if;
  return uid;
end;
$$;
revoke execute on function public.require_trusted_user from public, anon, authenticated;

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
  -- Uma criação por vez por pessoa: chamadas em paralelo não furam o limite
  perform pg_advisory_xact_lock(hashtext('create_post:' || uid::text));
  select id into v_city from public.cities where extensions.st_covers(boundary, pt) limit 1;
  if v_city is null then
    raise exception 'Você precisa estar dentro da cidade para postar' using errcode = '22023';
  end if;

  -- Rascunho descartado (a foto enviada antes de publicar, e a pessoa desistiu)
  -- não conta: nunca chegou a ir para a publicação
  if (select count(*) from public.posts
      where user_id = uid and created_at > now() - interval '1 hour'
        and not (status = 'expired' and moderation is null)) >= 5 then
    raise exception 'Limite de 5 posts por hora atingido' using errcode = '54000';
  end if;
  -- Rascunhos também têm teto: criar e descartar em laço subiria fotos sem fim
  if (select count(*) from public.posts where user_id = uid and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Muitas fotos em pouco tempo. Tente de novo mais tarde.' using errcode = '54000';
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

create or replace function public.report_post(p_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_trusted_user();
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

create or replace function public.vote_post(p_id uuid, p_still boolean, p_lat double precision, p_lng double precision)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_trusted_user();
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
  -- Sem login não conta: o visitante trocaria de navegador (ou de User-Agent)
  -- e inflaria vistas e compartilhamentos, que pesam no Em alta e no histórico
  if auth.uid() is null then
    return;
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
    update public.posts set share_count = share_count + 1 where id = p_id returning user_id into v_author;
    if auth.uid() is not null and auth.uid() <> v_author then
      perform public.grant_xp(auth.uid(), 'compartilhou', 1, p_id);
    end if;
  end if;
end;
$$;

-- O link compartilhado só mostra o que está no ar ou no histórico: legenda e
-- local de post escondido, recusado ou apagado pelo autor não saem mais
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
    'photo_path', p.photo_path,
    'created_at', p.created_at,
    'expires_at', p.expires_at,
    'alive', p.status = 'published' and p.expires_at > now(),
    'archived', p.status = 'expired' and p.photo_path is not null,
    'confirm_count', p.confirm_count,
    'business_name', (select b.name from public.businesses b where b.id = p.business_id),
    'lng', extensions.st_x(p.location::extensions.geometry),
    'lat', extensions.st_y(p.location::extensions.geometry)
  )
  from public.posts p
  where p.id = p_id
    and ((p.status = 'published' and p.expires_at > now()) or (p.status = 'expired' and p.archived_until > now()));
$$;

-- Aviso só para os serviços de push dos navegadores (senão o servidor faria
-- pedidos para qualquer endereço), até 5 aparelhos por pessoa, e um endereço
-- de outra pessoa não troca de dono
create or replace function public.save_push_subscription(
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
  owner uuid;
begin
  if length(p_endpoint) > 1024 or length(p_p256dh) > 200 or length(p_auth) > 100
     or p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/' then
    raise exception 'Inscrição inválida' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('push:' || uid::text));
  select user_id into owner from public.push_subscriptions where endpoint = p_endpoint;
  if owner is not null and owner <> uid then
    raise exception 'Inscrição inválida' using errcode = '22023';
  end if;
  if owner is null and (select count(*) from public.push_subscriptions where user_id = uid) >= 5 then
    raise exception 'Limite de 5 aparelhos com aviso' using errcode = '54000';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, location, radius_m, categories, requests)
  values (
    p_endpoint, uid, p_p256dh, p_auth,
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    p_radius_m, nullif(p_categories, '{}'), p_requests
  )
  on conflict (endpoint) do update
  set p256dh = excluded.p256dh, auth = excluded.auth,
      location = excluded.location, radius_m = excluded.radius_m,
      categories = excluded.categories, requests = excluded.requests, updated_at = now()
  where public.push_subscriptions.user_id = excluded.user_id;
end;
$$;
