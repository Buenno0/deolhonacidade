-- O mapa não expõe quem postou, mas cada pessoa precisa saber quais posts são
-- dela (para não oferecer "Ainda está rolando?" nem "Denunciar" no próprio).
-- "mine" só é verdadeiro para o dono logado; para os outros, sempre falso.
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
        'business_instagram', b.instagram,
        'mine', coalesce(p.user_id = auth.uid(), false)
      )
    ) order by p.created_at), '[]'::jsonb)
  )
  from public.posts p
  left join public.profiles pr on pr.id = p.user_id
  left join public.businesses b on b.id = p.business_id
  where p.city_id = p_city_id and p.status = 'published' and p.expires_at > now();
$$;
