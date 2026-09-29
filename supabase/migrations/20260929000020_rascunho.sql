-- Envio antecipado: a foto sobe assim que é tirada, como rascunho (post
-- pendente). Na hora de publicar, o app confirma categoria, legenda, histórico
-- e a posição mais recente com update_draft, e só então chama a publicação.
-- Rascunho descartado vira "expired" sem moderação: não conta no limite e a
-- limpeza apaga a foto.

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

  -- Rascunho descartado (a foto enviada antes de publicar, e a pessoa desistiu)
  -- não conta: nunca chegou a ir para a publicação
  if (select count(*) from public.posts
      where user_id = uid and created_at > now() - interval '1 hour'
        and not (status = 'expired' and moderation is null)) >= 5 then
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

create function public.update_draft(
  p_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_category public.post_category,
  p_caption text default null,
  p_keep_history boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  pt extensions.geography := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  d public.posts;
  v_city integer;
  b public.businesses;
begin
  select * into d from public.posts where id = p_id and user_id = uid and status = 'pending' and moderation is null;
  if d.id is null then
    raise exception 'Rascunho não encontrado' using errcode = 'P0002';
  end if;
  select id into v_city from public.cities where extensions.st_covers(boundary, pt) limit 1;
  if v_city is null or v_city <> d.city_id then
    raise exception 'Você precisa estar dentro da cidade para postar' using errcode = '22023';
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
    if d.request_id is not null then
      raise exception 'Divulgação não responde a pedidos' using errcode = '22023';
    end if;
  end if;

  if d.request_id is not null and not exists (
    select 1 from public.requests
    where id = d.request_id and status = 'open' and expires_at > now()
      and extensions.st_dwithin(location, pt, 1000)
  ) then
    raise exception 'Esse pedido já fechou ou você está a mais de 1 km dele' using errcode = '22023';
  end if;

  update public.posts
  set location = pt,
      category = p_category,
      caption = nullif(btrim(p_caption), ''),
      business_id = b.id,
      keep_history = coalesce(p_keep_history, false) and p_category <> 'estabelecimento'
  where id = p_id;
end;
$$;
revoke execute on function public.update_draft from public, anon;
grant execute on function public.update_draft to authenticated;

-- O resultado para quem postou: o status e o que foi protegido
create function public.my_post_result(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'status', status,
    'faces', coalesce((moderation ->> 'faces')::integer, 0),
    'plates', coalesce((moderation ->> 'plates')::integer, 0)
  )
  from public.posts where id = p_id and user_id = auth.uid();
$$;
revoke execute on function public.my_post_result from public, anon;
grant execute on function public.my_post_result to authenticated;
