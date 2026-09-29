-- Marcos mais assertivos: a foto e o texto passam a falar do LUGAR, não do
-- assunto. Foto só quando é do próprio lugar (Wikimedia Commons, com autor e
-- licença); a página da Wikipédia só como texto principal quando é sobre o
-- lugar (wiki_title). O que é sobre quem é homenageado vai para "about".
-- Entram os prédios tombados pelo CONDEPHAAT (dados do Wikidata).

alter table public.landmarks drop constraint landmarks_kind_check;
alter table public.landmarks add constraint landmarks_kind_check
  check (kind in ('igreja', 'monumento', 'estatua', 'marco', 'patrimonio'));

alter table public.landmarks
  add column photos jsonb not null default '[]',
  add column heritage text,
  add column address text,
  add column wikidata text,
  add column about_title text,
  add column about_label text;

-- O que antes era "texto principal" nos marcos de assunto vira "sobre"
update public.landmarks set about_title = wiki_title, wiki_title = null, wiki_context = null
where wiki_title is not null;
update public.landmarks set about_label = case id
  when 'catedral' then 'Sobre a Diocese de Itapetininga'
  when 'monumento-tropeiro' then 'O que foi o tropeirismo'
  when 'homenagem-tropeirismo' then 'O que foi o tropeirismo'
  when 'aviadora' then 'Quem foi Anésia Pinheiro Machado'
  when 'teddy-vieira' then 'Quem foi Teddy Vieira'
  when 'marechal-deodoro' then 'Quem foi Deodoro da Fonseca'
end where about_title is not null;

update public.landmarks
set photos = '[{"url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Itapetininga_-_Cathedral.jpg/960px-Itapetininga_-_Cathedral.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail", "page": "https://commons.wikimedia.org/wiki/File:Itapetininga_-_Cathedral.jpg", "author": "Knightstalker (Wikipédia em inglês)", "license": "Domínio público"}, {"url": "https://upload.wikimedia.org/wikipedia/commons/2/24/Itapetininga_REFON_-23.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled", "page": "https://commons.wikimedia.org/wiki/File:Itapetininga_REFON_-23.JPG", "author": "Jose Reynaldo da Fonseca", "license": "CC BY-SA 3.0"}]'::jsonb, wikidata = 'Q125679778',
    summary = 'Igreja matriz no centro de Itapetininga e sede da Diocese de Itapetininga.'
where id = 'catedral';

-- Patrimônio tombado (CONDEPHAAT), com endereço e posição do Wikidata
insert into public.landmarks (id, city_id, name, kind, location, summary, heritage, address, wikidata, wiki_title, about_title, about_label, photos, osm, sort) values
  ('tres-escolas', 3522307, 'As Três Escolas', 'patrimonio',
   extensions.st_setsrid(extensions.st_makepoint(-48.047272, -23.587265), 4326)::extensions.geography,
   'Três escolas estaduais tombadas, lado a lado no mesmo endereço: E.E. Peixoto Gomide, E.E. Coronel Fernando Prestes e E.E. Adherbal de Paula Ferreira.',
   'Tombadas pelo CONDEPHAAT', 'Avenida Peixoto Gomide, 198', 'Q67103161 Q67103160 Q67103159', null, null, null,
   '[{"url": "https://upload.wikimedia.org/wikipedia/commons/2/2a/Itapetininga_As_Tr%C3%AAs_Escolas_004.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled", "page": "https://commons.wikimedia.org/wiki/File:Itapetininga_As_Tr%C3%AAs_Escolas_004.jpg", "author": "Autor não identificado", "license": "Domínio público"}]'::jsonb, null, -3),
  ('casa-camara', 3522307, 'Casa de Câmara e Cadeia', 'patrimonio',
   extensions.st_setsrid(extensions.st_makepoint(-48.052006729, -23.590631133), 4326)::extensions.geography,
   'Prédio tombado na Praça Marechal Deodoro. No mesmo endereço fica o Memorial Júlio Prestes de Albuquerque.',
   'Tombada pelo CONDEPHAAT', 'Praça Marechal Deodoro, 305', 'Q111921603 Q56693761', null,
   'Júlio_Prestes', 'Quem foi Júlio Prestes de Albuquerque', '[]', null, -2),
  ('fazenda-carrito', 3522307, 'Sede da Fazenda Tenente Carrito', 'patrimonio',
   extensions.st_setsrid(extensions.st_makepoint(-48.028492, -23.591913), 4326)::extensions.geography,
   null, 'Tombada pelo CONDEPHAAT em 1982', 'Recinto Acácio de Moraes Terra, Avenida João Olímpio de Oliveira, 600', 'Q67103157',
   'Sede_da_Fazenda_Tenente_Carrito', null, null, '[]', null, -1);

update public.landmarks set sort = -4 where id = 'catedral';

create or replace function public.city_landmarks(p_city_id integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'kind', kind, 'summary', summary,
    'wiki_title', wiki_title, 'about_title', about_title, 'about_label', about_label,
    'photos', photos, 'heritage', heritage, 'address', address, 'wikidata', wikidata, 'osm', osm,
    'lng', extensions.st_x(location::extensions.geometry),
    'lat', extensions.st_y(location::extensions.geometry)
  ) order by sort), '[]'::jsonb)
  from public.landmarks where city_id = p_city_id;
$$;
