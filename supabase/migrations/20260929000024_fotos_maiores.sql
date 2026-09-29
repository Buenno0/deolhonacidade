-- Fotos com mais qualidade (até 2048 px no maior lado): o limite do bucket
-- local sobe de 1 MB para 3 MB. Em produção as fotos vão para o S3, que tem o
-- mesmo limite na assinatura do upload.
update storage.buckets set file_size_limit = 3145728 where id = 'posts';
