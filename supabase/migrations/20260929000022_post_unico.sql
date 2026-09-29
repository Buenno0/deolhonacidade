-- Tempo real sem recarregar a lista inteira: o aviso "post_changed" traz o id,
-- e o app busca só aquele post (a mesma forma de active_posts). Não está no
-- ar (sumiu, escondido, vencido): volta nulo e o app o tira do mapa.
create function public.active_post(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select (jsonb_build_object(
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
    ))
  from public.posts p
  left join public.profiles pr on pr.id = p.user_id
  left join public.businesses b on b.id = p.business_id
  where p.id = p_id
    and (
      (p.status = 'published' and p.expires_at > now())
      or (p.status = 'pending' and p.user_id = auth.uid() and p.created_at > now() - interval '10 minutes'
          and coalesce((p.moderation ->> 'processing')::boolean, false))
    );
$$;
grant execute on function public.active_post to anon, authenticated;
