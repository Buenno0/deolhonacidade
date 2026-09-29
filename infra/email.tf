# E-mail do código de login pelo SES, entregue ao Supabase Auth por SMTP
# (Supabase > Authentication > SMTP Settings). É o que faz o código chegar na
# caixa de entrada de verdade; o SMTP padrão do Supabase só manda para a equipe.
#
# Conta nova no SES começa no sandbox: só envia para endereços verificados.
# Para abrir ao público, peça "production access" no console do SES.
locals {
  com_dominio = var.dominio_email != ""
}

resource "aws_sesv2_email_identity" "dominio" {
  count          = local.com_dominio ? 1 : 0
  email_identity = var.dominio_email
}

# Sem domínio: verifica só o remetente (chega um e-mail de confirmação nele)
resource "aws_sesv2_email_identity" "remetente" {
  count          = local.com_dominio ? 0 : 1
  email_identity = var.email_remetente
}

resource "aws_iam_user" "smtp" {
  name = "deolho-smtp"
}

resource "aws_iam_user_policy" "smtp" {
  name = "enviar-email"
  user = aws_iam_user.smtp.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = ["ses:SendRawEmail"]
      Resource  = "*"
      Condition = { StringEquals = { "ses:FromAddress" = var.email_remetente } }
    }]
  })
}

# A senha SMTP do SES é derivada da secret key (o provider faz a conta)
resource "aws_iam_access_key" "smtp" {
  user = aws_iam_user.smtp.name
}
