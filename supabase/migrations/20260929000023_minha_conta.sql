-- Uma consulta só para o que o app precisa saber da conta ao abrir: se já
-- aceitou os termos, se é da moderação e o estabelecimento (antes eram três).
create function public.my_account()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'accepted_terms_at', pr.accepted_terms_at,
    'is_admin', coalesce(pr.is_admin, false),
    'business', (select public.business_json(b) from public.businesses b where b.owner = pr.id)
  )
  from public.profiles pr
  where pr.id = auth.uid();
$$;
revoke execute on function public.my_account from public, anon;
grant execute on function public.my_account to authenticated;
