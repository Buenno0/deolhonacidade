-- Limite de posts comuns: 5 → 7 por hora por pessoa. Mesma create_post da
-- 20260929000025_seguranca.sql, só com o número novo (rascunho descartado
-- continua sem contar, e o teto de 20 fotos por hora continua valendo).
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
        and not (status = 'expired' and moderation is null)) >= 7 then
    raise exception 'Limite de 7 posts por hora atingido' using errcode = '54000';
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
