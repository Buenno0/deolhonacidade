-- Categoria nova: divulgação de estabelecimentos. Fica sozinha nesta migration
-- porque um valor novo de enum só pode ser usado depois que a transação que o
-- criou termina.
alter type public.post_category add value if not exists 'estabelecimento';
