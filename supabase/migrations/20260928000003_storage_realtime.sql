-- Bucket das fotos: leitura pública (caminho é um UUID), upload só via policy
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "upload da foto do próprio post pendente" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'posts' and public.can_upload_post_photo(name));

-- Avisa os mapas abertos quando um post entra ou sai, pelo Realtime Broadcast.
-- O payload leva só o id; o cliente busca de novo pela função pública.
create function public.broadcast_post_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and (new.status = 'published' or old.status = 'published') then
    begin
      perform realtime.send(
        jsonb_build_object('id', new.id, 'status', new.status),
        'post_changed',
        'city:' || new.city_id,
        false
      );
    exception when others then
      -- Realtime fora do ar não pode impedir a publicação
      raise warning 'realtime.send falhou: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

create trigger posts_broadcast
  after update of status on public.posts
  for each row execute function public.broadcast_post_change();
