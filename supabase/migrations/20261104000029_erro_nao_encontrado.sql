-- "Não encontrado" precisa chegar ao navegador como texto, não como 500.
--
-- Os testes de ponta a ponta mostraram que o PostgREST trata o SQLSTATE P0002
-- (no_data_found) como erro interno: responde 500 e troca a mensagem por
-- "Something went wrong". A ficha da ocorrência mostrava esse texto em inglês
-- no lugar de "Ocorrência não encontrada neste município", e cada abertura de
-- link velho virava um 500 no log do Supabase.
--
-- O 22023 (invalid_parameter_value) volta 400 com a mensagem inteira, que é o
-- comportamento certo: o id pedido não serve para este agente. É o mesmo
-- código que o app já usa em "Você precisa estar dentro da cidade para postar".
--
-- Escopo: só as funções da sala de situação. O resto do projeto usa P0002 em
-- cerca de vinte lugares (delete_my_post, admin_user, remove_from_history…) e
-- tem o mesmo problema; trocar todos é outra mudança, não esta.

create or replace function public.agency_event(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_city integer := public.require_agent();
  uid uuid := auth.uid();
  p public.posts;
  me public.profiles;
begin
  select * into p from public.posts
  where id = p_id and city_id = v_city and photo_path is not null
    and public.is_incident(category)
    and ((status = 'published' and expires_at > now()) or agency_until > now());
  if p.id is null then
    raise exception 'Ocorrência não encontrada neste município' using errcode = '22023';
  end if;
  select * into me from public.profiles where id = uid;
  perform public.log_access(uid, 'agency_view_event', p_id);

  return jsonb_build_object(
    'event', public.agency_props(p) || jsonb_build_object(
      'share_count', p.share_count,
      'report_count', p.report_count,
      'agency_until', p.agency_until,
      -- quantos rostos e placas foram desfocados: a ficha declara isso, para
      -- que o documento diga o que foi alterado na imagem e por quê
      'faces_blurred', coalesce((p.moderation ->> 'faces')::integer, 0),
      'plates_blurred', coalesce((p.moderation ->> 'plates')::integer, 0),
      'checked_by', p.moderation ->> 'provider'
    ),
    'city', (select jsonb_build_object('name', c.name, 'uf', c.uf) from public.cities c where c.id = v_city),
    'issued_by', jsonb_build_object(
      'agency', coalesce(me.agency_name, 'Órgão conveniado'),
      'at', now()
    )
  );
end;
$$;

create or replace function public.admin_set_agent(
  p_user_id uuid,
  p_agent boolean,
  p_city integer default null,
  p_agency_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  if p_agent and p_city is null then
    raise exception 'Diga de qual cidade é o agente' using errcode = '22023';
  end if;
  update public.profiles
  set is_agent = p_agent,
      agency_city = case when p_agent then p_city end,
      agency_name = case when p_agent then nullif(btrim(p_agency_name), '') end
  where id = p_user_id;
  if not found then
    raise exception 'Conta não encontrada' using errcode = '22023';
  end if;
  perform public.log_access(admin, case when p_agent then 'admin_grant_agent' else 'admin_revoke_agent' end, null, p_user_id);
end;
$$;

create or replace function public.admin_set_retention(p_city integer, p_days integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid := public.require_admin();
begin
  update public.cities set agency_retention_days = greatest(coalesce(p_days, 0), 0) where id = p_city;
  if not found then
    raise exception 'Cidade não encontrada' using errcode = '22023';
  end if;
  perform public.log_access(admin, 'admin_set_retention', null);
end;
$$;
