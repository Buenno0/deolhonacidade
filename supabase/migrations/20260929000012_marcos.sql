-- Marcos da cidade: a camada que não some. Cada marco tem um texto nosso
-- (só o que se sabe com certeza) e, quando existe, a página da Wikipédia de
-- onde o app busca resumo e foto, sempre citando a fonte. Lugares sem página
-- ficam com o texto em construção: é o espaço para a parceria com a cultura local.

create table public.landmarks (
  id text primary key,
  city_id integer not null references public.cities (id),
  name text not null,
  kind text not null check (kind in ('igreja', 'monumento', 'estatua', 'marco')),
  location extensions.geography(Point, 4326) not null,
  summary text,
  wiki_title text,
  wiki_context text,
  osm text,
  sort integer not null default 0
);
alter table public.landmarks enable row level security;
create policy "marcos são públicos" on public.landmarks for select using (true);

create function public.city_landmarks(p_city_id integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'kind', kind, 'summary', summary,
    'wiki_title', wiki_title, 'wiki_context', wiki_context, 'osm', osm,
    'lng', extensions.st_x(location::extensions.geometry),
    'lat', extensions.st_y(location::extensions.geometry)
  ) order by sort), '[]'::jsonb)
  from public.landmarks where city_id = p_city_id;
$$;
grant execute on function public.city_landmarks to anon, authenticated;

-- Itapetininga: posições do OpenStreetMap (osm = de onde veio cada ponto)
insert into public.landmarks (id, city_id, name, kind, location, summary, wiki_title, wiki_context, osm, sort) values
  ('catedral', 3522307, 'Catedral Nossa Senhora dos Prazeres', 'igreja', extensions.st_setsrid(extensions.st_makepoint(-48.053428, -23.591093), 4326)::extensions.geography, 'Igreja matriz no centro de Itapetininga, sede da Diocese de Itapetininga.', 'Diocese_de_Itapetininga', 'sobre a Diocese de Itapetininga', 'way/473852085', 0),
  ('monumento-tropeiro', 3522307, 'Monumento ao Tropeiro', 'monumento', extensions.st_setsrid(extensions.st_makepoint(-48.047433, -23.588203), 4326)::extensions.geography, 'Monumento em homenagem aos tropeiros.', 'Tropeirismo', 'sobre o tropeirismo', 'node/7826163270', 1),
  ('homenagem-tropeirismo', 3522307, 'Homenagem ao tropeirismo', 'monumento', extensions.st_setsrid(extensions.st_makepoint(-48.057658, -23.592934), 4326)::extensions.geography, 'Homenagem ao tropeirismo em Itapetininga.', 'Tropeirismo', 'sobre o tropeirismo', 'node/10776977883', 2),
  ('aviadora', 3522307, 'Estátua da Primeira Aviadora do Brasil', 'estatua', extensions.st_setsrid(extensions.st_makepoint(-48.051868, -23.590779), 4326)::extensions.geography, 'Estátua em homenagem a Anésia Pinheiro Machado.', 'Anésia_Pinheiro_Machado', 'sobre Anésia Pinheiro Machado', 'node/4653841117', 3),
  ('teddy-vieira', 3522307, 'Estátua de Teddy Vieira', 'estatua', extensions.st_setsrid(extensions.st_makepoint(-48.051784, -23.591029), 4326)::extensions.geography, 'Estátua em homenagem ao compositor Teddy Vieira.', 'Teddy_Vieira', 'sobre Teddy Vieira', 'node/4653841116', 4),
  ('marechal-deodoro', 3522307, 'Estátua do Marechal Deodoro', 'estatua', extensions.st_setsrid(extensions.st_makepoint(-48.053511, -23.590642), 4326)::extensions.geography, 'Estátua do Marechal Deodoro da Fonseca.', 'Deodoro_da_Fonseca', 'sobre Deodoro da Fonseca', 'node/4678877661', 5),
  ('cristo-redentor', 3522307, 'Cristo Redentor', 'estatua', extensions.st_setsrid(extensions.st_makepoint(-48.050873, -23.593386), 4326)::extensions.geography, null, null, null, 'node/4653825496', 6),
  ('portal', 3522307, 'Portal da cidade', 'marco', extensions.st_setsrid(extensions.st_makepoint(-47.982406, -23.570939), 4326)::extensions.geography, 'Portal de entrada de Itapetininga.', null, null, 'way/1104523093', 7),
  ('registro-velho', 3522307, 'Registro Velho', 'marco', extensions.st_setsrid(extensions.st_makepoint(-48.106257, -23.62582), 4326)::extensions.geography, null, null, null, 'way/533603724', 8),
  ('relogio-solar', 3522307, 'Relógio Solar', 'marco', extensions.st_setsrid(extensions.st_makepoint(-48.030509, -23.597184), 4326)::extensions.geography, null, null, null, 'node/6267004316', 9),
  ('igreja-carmo', 3522307, 'Igreja Nossa Senhora do Carmo', 'igreja', extensions.st_setsrid(extensions.st_makepoint(-48.017692, -23.565864), 4326)::extensions.geography, null, null, null, 'way/717810932', 10),
  ('antiga-aparecida', 3522307, 'Antiga Igreja Nossa Senhora Aparecida', 'igreja', extensions.st_setsrid(extensions.st_makepoint(-48.017426, -23.679863), 4326)::extensions.geography, null, null, null, 'way/693413114', 11);
