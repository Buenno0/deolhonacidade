-- Regras de negócio. Todas são security definer com search_path vazio:
-- as tabelas ficam fechadas por RLS e só estas funções mexem nelas.

create function public.log_access(p_user_id uuid, p_action text, p_post_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
begin
  insert into public.access_logs (user_id, action, post_id, ip, user_agent)
  values (
    p_user_id,
    p_action,
    p_post_id,
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

-- Garante que o usuário está logado, não banido e aceitou os termos
create function public.require_active_user()
returns uuid
language plpgsql
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
  if p.banned_at is not null then
    raise exception 'Sua conta foi suspensa' using errcode = '42501';
  end if;
  if p.accepted_terms_at is null then
    raise exception 'Aceite os termos de uso para continuar' using errcode = '42501';
  end if;
  return uid;
end;
$$;
revoke execute on function public.require_active_user from public, anon;

create function public.accept_terms()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set accepted_terms_at = coalesce(accepted_terms_at, now())
  where id = auth.uid();
$$;
revoke execute on function public.accept_terms from public, anon;
grant execute on function public.accept_terms to authenticated;

-- Passo 1 da postagem: valida local e limite e reserva o caminho da foto
create function public.create_post(
  p_lat double precision,
  p_lng double precision,
  p_category public.post_category,
  p_caption text default null
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

  v_path := v_city || '/' || v_id;
  insert into public.posts (id, user_id, city_id, location, category, caption, photo_path)
  values (v_id, uid, v_city, pt, p_category, nullif(btrim(p_caption), ''), v_path);

  perform public.log_access(uid, 'create_post', v_id);
  return jsonb_build_object('id', v_id, 'photo_path', v_path);
end;
$$;
revoke execute on function public.create_post from public, anon;
grant execute on function public.create_post to authenticated;

-- Usado pela policy do Storage: só deixa subir a foto do próprio post pendente
create function public.can_upload_post_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts
    where photo_path = p_name and user_id = auth.uid() and status = 'pending'
  );
$$;
revoke execute on function public.can_upload_post_photo from public, anon;
grant execute on function public.can_upload_post_photo to authenticated;

-- Passo 2 da postagem: depois do upload, publica e começa a contar as 12h.
-- Quando a moderação automática existir, ela entra aqui (ou numa Edge Function
-- que chama esta etapa) antes de mudar o status.
create function public.publish_post(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  v_path text;
begin
  select photo_path into v_path from public.posts
  where id = p_id and user_id = uid and status = 'pending';
  if v_path is null then
    raise exception 'Post não encontrado' using errcode = 'P0002';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'posts' and name = v_path) then
    raise exception 'A foto ainda não foi enviada' using errcode = 'P0002';
  end if;

  update public.posts
  set status = 'published', created_at = now(), expires_at = now() + interval '12 hours'
  where id = p_id;
end;
$$;
revoke execute on function public.publish_post from public, anon;
grant execute on function public.publish_post to authenticated;

-- Leitura pública: posts ativos da cidade como GeoJSON, sem user_id
create function public.active_posts(p_city_id integer)
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
        'expires_at', p.expires_at
      )
    ) order by p.created_at), '[]'::jsonb)
  )
  from public.posts p
  where p.city_id = p_city_id and p.status = 'published' and p.expires_at > now();
$$;
grant execute on function public.active_posts to anon, authenticated;

create function public.report_post(p_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.require_active_user();
  inserted integer;
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
  where id = p_id;

  perform public.log_access(uid, 'report_post', p_id);
end;
$$;
revoke execute on function public.report_post from public, anon;
grant execute on function public.report_post to authenticated;

-- Limpeza (service_role), em 3 passos para não deixar foto órfã:
-- 1. expire_posts marca os vencidos e devolve as fotos a apagar
-- 2. o job apaga os arquivos pela Storage API (o Supabase não deixa apagar
--    direto de storage.objects por SQL)
-- 3. clear_photo_paths tira o caminho do post. A linha fica, sem a foto,
--    pelos 6 meses do Marco Civil. Se o passo 2 falhar, a próxima rodada tenta de novo.
create function public.expire_posts()
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

  select coalesce(array_agg(photo_path), '{}') into paths
  from (
    select photo_path from public.posts
    where status = 'expired' and photo_path is not null
    limit 1000
  ) due;
  return paths;
end;
$$;
revoke execute on function public.expire_posts from public, anon, authenticated;
grant execute on function public.expire_posts to service_role;

create function public.clear_photo_paths(p_paths text[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.posts set photo_path = null
  where status = 'expired' and photo_path = any (p_paths);
$$;
revoke execute on function public.clear_photo_paths from public, anon, authenticated;
grant execute on function public.clear_photo_paths to service_role;

-- Retenção: logs e metadados ficam 6 meses (Marco Civil) e depois são apagados
select cron.schedule(
  'purge-old-records',
  '15 3 * * *',
  $$
    delete from public.access_logs where created_at < now() - interval '6 months';
    delete from public.posts where created_at < now() - interval '6 months' and photo_path is null;
  $$
);
