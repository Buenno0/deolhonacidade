# Credencial do servidor do app (rotas /api/posts/* e /api/cron/expire).
# Menor privilégio: só o prefixo posts/ deste bucket e só a detecção de
# conteúdo impróprio do Rekognition.
#
# É uma access key fixa porque ainda não sabemos onde o app vai rodar. Quando
# for a Vercel, troque por OIDC (a Vercel emite um token por deploy e a AWS o
# troca por credencial temporária), no mesmo espírito do Roles Anywhere do NAS.
resource "aws_iam_user" "app" {
  name = "deolho-app"
}

resource "aws_iam_user_policy" "app" {
  name = "fotos-e-moderacao"
  user = aws_iam_user.app.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Fotos"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.fotos.arn}/posts/*"
      },
      {
        # Sem ListBucket, um HeadObject de arquivo inexistente vira 403 em vez
        # de 404; o app trata os dois como "não enviado".
        # Moderação + rostos e placas para desfocar (três chamadas por foto)
        Sid      = "Moderacao"
        Effect   = "Allow"
        Action   = ["rekognition:DetectModerationLabels", "rekognition:DetectFaces", "rekognition:DetectText"]
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}
