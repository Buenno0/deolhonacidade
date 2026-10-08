-- "Primeiro do bairro" (LP): quem quer o Viu forte no seu bairro. Anônimo,
-- um voto por aparelho e bairro (o mesmo esquema do city_interest), e a
-- contagem é pública: só o número por bairro, nunca quem votou.
-- A lista de bairros é a mesma de lib/bairros.ts: mude as duas juntas.

create table public.neighborhood_interest (
  bairro text not null,
  viewer text not null,
  created_at timestamptz not null default now(),
  primary key (bairro, viewer)
);
alter table public.neighborhood_interest enable row level security;

create function public.bairros_validos()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'Centro',
    'Central Parque 4-L',
    'Chácara São José',
    'Jardim Bela Vista',
    'Jardim Brasil',
    'Jardim Flor de Lis',
    'Jardim Fogaça',
    'Jardim Itália',
    'Jardim Leonel',
    'Jardim Marabá',
    'Jardim Maria Luiza',
    'Jardim Mesquita',
    'Jardim Paulista',
    'Jardim Santa Inez',
    'Jardim Vieira de Moraes',
    'Parque Atenas do Sul',
    'Parque da Lagoa',
    'Reserva da Mata',
    'Vale San Fernando',
    'Vila Aliança',
    'Vila Alves',
    'Vila Aparecida',
    'Vila Arruda',
    'Vila Asem',
    'Vila Aurora',
    'Vila Bandeirantes',
    'Vila Barth',
    'Vila Camarão',
    'Vila Carolina',
    'Vila Cubatão',
    'Vila Deyse',
    'Vila Eldorado',
    'Vila Francisca',
    'Vila Godoi',
    'Vila Judith',
    'Vila Mazzei',
    'Vila Monteiro',
    'Vila Nova',
    'Vila Orestes',
    'Vila Piedade',
    'Vila Prestes',
    'Vila Progresso',
    'Vila Regina',
    'Vila Rica',
    'Vila Rio Branco',
    'Vila Rocha',
    'Vila Rosa',
    'Vila Santana',
    'Vila Serafim',
    'Vila Visaltino Gomes'
  ]::text[];
$$;

-- Devolve a posição de quem votou no bairro (1º, 2º...) e o total
create function public.register_neighborhood(p_bairro text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  who text := coalesce(
    auth.uid()::text,
    coalesce(headers ->> 'cf-connecting-ip', split_part(headers ->> 'x-forwarded-for', ',', 1), '') || '|' || coalesce(headers ->> 'user-agent', '')
  );
  v text := md5(who || '|' || p_bairro);
  pos int;
begin
  if not (p_bairro = any(public.bairros_validos())) then
    raise exception 'bairro desconhecido' using errcode = '22023';
  end if;
  insert into public.neighborhood_interest (bairro, viewer) values (p_bairro, v) on conflict do nothing;
  select count(*) into pos from public.neighborhood_interest n
    where n.bairro = p_bairro
      and n.created_at <= (select created_at from public.neighborhood_interest where bairro = p_bairro and viewer = v);
  return jsonb_build_object(
    'posicao', pos,
    'total', (select count(*) from public.neighborhood_interest where bairro = p_bairro)
  );
end;
$$;
grant execute on function public.register_neighborhood to anon, authenticated;

-- O ranking da LP
create function public.neighborhood_counts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('bairro', bairro, 'n', n) order by n desc), '[]'::jsonb)
  from (select bairro, count(*) as n from public.neighborhood_interest group by bairro order by n desc limit 10) t;
$$;
grant execute on function public.neighborhood_counts to anon, authenticated;
