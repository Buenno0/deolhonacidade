-- Fora da área: descobrir se um ponto está numa cidade atendida e, se não,
-- qual é a mais próxima. E registrar, de forma anônima, onde há interesse.

alter table public.cities
  add column center extensions.geography(Point, 4326),
  add column default_zoom real not null default 13.5;

update public.cities
set center = extensions.st_setsrid(extensions.st_makepoint(-48.0531, -23.5917), 4326)::extensions.geography
where id = 3522307;

-- Onde a pessoa está: a cidade atendida que contém o ponto, ou a mais
-- próxima (com a distância em km). Aberta a todos: não guarda nada.
create function public.locate_city(p_lat double precision, p_lng double precision)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with pt as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  ), inside as (
    select c.id from public.cities c, pt where extensions.st_covers(c.boundary, pt.g) limit 1
  ), nearest as (
    select c.id, c.name, c.uf, c.default_zoom,
           extensions.st_x(coalesce(c.center, extensions.st_centroid(c.boundary::extensions.geometry)::extensions.geography)::extensions.geometry) as lng,
           extensions.st_y(coalesce(c.center, extensions.st_centroid(c.boundary::extensions.geometry)::extensions.geography)::extensions.geometry) as lat,
           round((extensions.st_distance(c.boundary, pt.g) / 1000)::numeric, 0) as km
    from public.cities c, pt
    order by extensions.st_distance(c.boundary, pt.g)
    limit 1
  )
  select jsonb_build_object(
    'inside', (select id from inside),
    'nearest', (select jsonb_build_object('id', id, 'name', name, 'uf', uf, 'lng', lng, 'lat', lat, 'zoom', default_zoom, 'km', km) from nearest)
  );
$$;
grant execute on function public.locate_city to anon, authenticated;

-- "Quero o De Olho na minha cidade": só a célula de ~10 km (0,1°), nunca o
-- ponto exato, e um voto por aparelho e célula.
create table public.city_interest (
  cell text not null,
  viewer text not null,
  created_at timestamptz not null default now(),
  primary key (cell, viewer)
);
alter table public.city_interest enable row level security;

create function public.register_interest(p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  cell text := round(p_lat::numeric, 1) || ',' || round(p_lng::numeric, 1);
  who text := coalesce(
    auth.uid()::text,
    coalesce(headers ->> 'cf-connecting-ip', split_part(headers ->> 'x-forwarded-for', ',', 1), '') || '|' || coalesce(headers ->> 'user-agent', '')
  );
begin
  insert into public.city_interest (cell, viewer) values (cell, md5(who || '|' || cell)) on conflict do nothing;
end;
$$;
grant execute on function public.register_interest to anon, authenticated;

-- Para a moderação decidir a próxima cidade: as células com mais interesse
create function public.admin_city_interest()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object('cell', cell, 'n', n) order by n desc)
    from (select cell, count(*) as n from public.city_interest group by cell order by n desc limit 50) t
  ), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_city_interest from public, anon;
grant execute on function public.admin_city_interest to authenticated;
