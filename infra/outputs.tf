# Variáveis de ambiente do app (cole no .env.local / na hospedagem)
output "env_app" {
  description = "Liga S3 + CloudFront + Rekognition no app."
  value = {
    STORAGE_PROVIDER           = "s3"
    MODERATION_PROVIDER        = "rekognition"
    REKOGNITION_REGION         = var.regiao
    AWS_REGION                 = var.regiao
    S3_BUCKET                  = aws_s3_bucket.fotos.bucket
    NEXT_PUBLIC_MEDIA_BASE_URL = "https://${aws_cloudfront_distribution.fotos.domain_name}"
    AWS_ACCESS_KEY_ID          = aws_iam_access_key.app.id
  }
}

output "aws_secret_access_key" {
  description = "tofu output -raw aws_secret_access_key"
  value       = aws_iam_access_key.app.secret
  sensitive   = true
}

# Supabase > Authentication > SMTP Settings
output "smtp" {
  value = local.com_email ? {
    host      = "email-smtp.${var.regiao}.amazonaws.com"
    port      = 587
    usuario   = aws_iam_access_key.smtp[0].id
    remetente = var.email_remetente
  } : null
}

output "smtp_senha" {
  description = "tofu output -raw smtp_senha"
  value       = local.com_email ? aws_iam_access_key.smtp[0].ses_smtp_password_v4 : null
  sensitive   = true
}

# Registros para colocar no DNS do domínio (DKIM), se houver domínio
output "dns_dkim" {
  value = local.com_dominio ? [
    for t in aws_sesv2_email_identity.dominio[0].dkim_signing_attributes[0].tokens :
    { tipo = "CNAME", nome = "${t}._domainkey.${var.dominio_email}", valor = "${t}.dkim.amazonses.com" }
  ] : []
}
