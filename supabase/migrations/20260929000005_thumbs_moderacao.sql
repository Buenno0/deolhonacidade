-- Miniatura do pin + publicação só pelo servidor (com moderação)

alter table public.posts add column moderation jsonb;

-- A miniatura mora ao lado da foto, com o sufixo -mini (lib/media.ts)
create or replace function public.can_upload_post_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts
    where p_name in (photo_path, photo_path || '-mini')
      and user_id = auth.uid() and status = 'pending'
  );
$$;

-- Antes o navegador publicava direto (publish_post). Agora quem publica é a
-- rota /api/posts/[id]/publish, depois da moderação automática, com a
-- service_role. Sem isso, dava para pular a moderação chamando a RPC.
drop function public.publish_post(uuid);

create function public.finalize_post(p_id uuid, p_approved boolean, p_moderation jsonb default null)
returns public.post_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.post_status;
begin
  update public.posts
  set status = case when p_approved then 'published'::public.post_status else 'hidden'::public.post_status end,
      moderation = p_moderation,
      created_at = case when p_approved then now() else created_at end,
      expires_at = case when p_approved then now() + interval '12 hours' else expires_at end
  where id = p_id and status = 'pending'
  returning status into result;

  if result is null then
    raise exception 'Post não encontrado ou já publicado' using errcode = 'P0002';
  end if;
  return result;
end;
$$;
revoke execute on function public.finalize_post from public, anon, authenticated;
grant execute on function public.finalize_post to service_role;
