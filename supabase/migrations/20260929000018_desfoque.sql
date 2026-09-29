-- Rostos e placas desfocados no servidor antes de publicar. A publicação
-- passa a acontecer em segundo plano: quem postou vê o próprio pin como
-- "processando" até o servidor terminar.

-- finalize_post pode trocar o caminho da foto (a versão desfocada mora num
-- caminho novo, para nenhum cache servir a original)
drop function public.finalize_post(uuid, boolean, jsonb);
create function public.finalize_post(p_id uuid, p_approved boolean, p_moderation jsonb default null, p_photo_path text default null)
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
      photo_path = coalesce(p_photo_path, photo_path),
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
revoke execute on function public.finalize_post from public, anon, authenticated;
grant execute on function public.finalize_post to service_role;

-- O mapa: os publicados, e para quem postou, também o que ainda está sendo
-- processado (só enquanto a publicação não termina)
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
        'expires_at', case when p.status = 'pending' then p.created_at + public.category_lifetime(p.category) else p.expires_at end,
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
        'business_instagram', b.instagram,
        'mine', coalesce(p.user_id = auth.uid(), false),
        'processing', p.status = 'pending'
      )
    ) order by p.created_at), '[]'::jsonb)
  )
  from public.posts p
  left join public.profiles pr on pr.id = p.user_id
  left join public.businesses b on b.id = p.business_id
  where p.city_id = p_city_id
    and (
      (p.status = 'published' and p.expires_at > now())
      or (p.status = 'pending' and p.user_id = auth.uid() and p.created_at > now() - interval '10 minutes'
          and coalesce((p.moderation ->> 'processing')::boolean, false))
    );
$$;

-- O resultado para quem postou (o app pergunta até terminar)
create function public.my_post_status(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select status::text from public.posts where id = p_id and user_id = auth.uid();
$$;
revoke execute on function public.my_post_status from public, anon;
grant execute on function public.my_post_status to authenticated;
