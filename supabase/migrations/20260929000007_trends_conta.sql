-- Trends (visualizações e compartilhamentos) e a conta do usuário
-- (meus posts, apagar post). Excluir a conta mora na rota /api/account/delete.

alter table public.posts
  add column view_count integer not null default 0,
  add column share_count integer not null default 0;

-- Uma interação por aparelho e post. Não guardamos quem viu: só um hash de
-- (conta ou IP + navegador) com o post, que some quando o post vence.
create table public.post_interactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer text not null,
  kind text not null check (kind in ('view', 'share')),
  created_at timestamptz not null default now(),
  primary key (post_id, viewer, kind)
);
alter table public.post_interactions enable row level security;

create function public.record_interaction(p_id uuid, p_kind text)
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
    update public.posts set view_count = view_count + 1 where id = p_id;
  else
    update public.posts set share_count = share_count + 1 where id = p_id;
  end if;
end;
$$;
grant execute on function public.record_interaction to anon, authenticated;

-- active_posts ganha as contagens do Trends
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
        'share_count', p.share_count
      )
    ) order by p.created_at), '[]'::jsonb)
  )
  from public.posts p
  where p.city_id = p_city_id and p.status = 'published' and p.expires_at > now();
$$;

-- ---------------------------------------------------------------------------
-- Minha conta: os meus posts dos últimos 7 dias (os vencidos já sem foto)
create function public.my_posts()
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
    'deny_count', p.deny_count
  ) order by p.created_at desc), '[]'::jsonb)
  from public.posts p
  where p.user_id = auth.uid() and p.status <> 'pending' and p.created_at > now() - interval '7 days';
$$;
revoke execute on function public.my_posts from public, anon;
grant execute on function public.my_posts to authenticated;

-- Apagar um post meu: sai do mapa na hora; a foto vai na próxima limpeza
-- (até 10 min). A linha fica sem foto, como qualquer post vencido.
create function public.delete_my_post(p_id uuid)
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
  update public.posts set status = 'expired', expires_at = least(expires_at, now())
  where id = p_id and user_id = uid and status in ('published', 'hidden', 'pending');
  if not found then
    raise exception 'Post não encontrado' using errcode = 'P0002';
  end if;
  perform public.log_access(uid, 'delete_post', p_id);
end;
$$;
revoke execute on function public.delete_my_post from public, anon;
grant execute on function public.delete_my_post to authenticated;

-- Excluir a conta (chamada pela rota do servidor, com a service_role): tira
-- tudo do ar e devolve as fotos para apagar. Os registros de acesso ficam
-- (Marco Civil, art. 15), sem o vínculo com a conta, que deixa de existir.
create function public.prepare_account_deletion(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  paths text[];
begin
  select coalesce(array_agg(photo_path), '{}') into paths
  from public.posts where user_id = p_user_id and photo_path is not null;
  update public.posts set status = 'expired', photo_path = null, expires_at = least(expires_at, now())
  where user_id = p_user_id;
  update public.requests set status = 'expired' where user_id = p_user_id and status = 'open';
  delete from public.push_subscriptions where user_id = p_user_id;
  perform public.log_access(p_user_id, 'delete_account', null);
  return paths;
end;
$$;
revoke execute on function public.prepare_account_deletion from public, anon, authenticated;
grant execute on function public.prepare_account_deletion to service_role;

-- As interações de posts vencidos não servem para mais nada: apaga
select cron.schedule(
  'purge-interactions',
  '40 * * * *',
  $$ delete from public.post_interactions i using public.posts p
     where p.id = i.post_id and (p.status <> 'published' or p.expires_at < now() - interval '1 hour'); $$
);
