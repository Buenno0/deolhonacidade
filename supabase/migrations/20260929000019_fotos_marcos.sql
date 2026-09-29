-- Mais fotos do próprio lugar, conferidas uma a uma (Wikimedia Commons):
-- Casa de Câmara e Cadeia: a fachada do atual Museu Histórico ("projetado para
-- abrigar a Cadeia", já foi Câmara) e a mesma fachada, tirada a 52 m do ponto.
-- Catedral: a fachada vista da praça.
update public.landmarks
set photos = '[
  {"url": "https://upload.wikimedia.org/wikipedia/commons/b/b6/Itapetininga_Museu_001.jpg",
   "page": "https://commons.wikimedia.org/wiki/File:Itapetininga_Museu_001.jpg",
   "author": "Marinoni (Wikimedia Commons)", "license": "Domínio público"},
  {"url": "https://upload.wikimedia.org/wikipedia/commons/2/20/Itapetininga_REFON_-65.JPG",
   "page": "https://commons.wikimedia.org/wiki/File:Itapetininga_REFON_-65.JPG",
   "author": "Jose Reynaldo da Fonseca", "license": "CC BY-SA 3.0"}
]'::jsonb
where id = 'casa-camara';

update public.landmarks
set photos = photos || '[
  {"url": "https://upload.wikimedia.org/wikipedia/commons/9/97/Itapetininga_REFON_-39.JPG",
   "page": "https://commons.wikimedia.org/wiki/File:Itapetininga_REFON_-39.JPG",
   "author": "Jose Reynaldo da Fonseca", "license": "CC BY-SA 3.0"}
]'::jsonb
where id = 'catedral' and not photos @> '[{"page": "https://commons.wikimedia.org/wiki/File:Itapetininga_REFON_-39.JPG"}]'::jsonb;
