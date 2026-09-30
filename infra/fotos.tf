# Fotos dos posts. Privado: o público só lê pelo CloudFront (cdn.tf) e só o
# app escreve, por formulário assinado (lib/server/storage.ts).
resource "aws_s3_bucket" "fotos" {
  bucket = var.bucket
}

resource "aws_s3_bucket_public_access_block" "fotos" {
  bucket                  = aws_s3_bucket.fotos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "fotos" {
  bucket = aws_s3_bucket.fotos.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "fotos" {
  bucket = aws_s3_bucket.fotos.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Sem versioning, de propósito (o NAS liga; aqui seria errado): o post promete
# sumir em 12h, e uma versão antiga guardaria a foto apagada por mais tempo.

# O navegador envia por POST (formulário assinado) direto ao bucket.
resource "aws_s3_bucket_cors_configuration" "fotos" {
  bucket = aws_s3_bucket.fotos.id
  cors_rule {
    allowed_methods = ["POST"]
    allowed_origins = distinct(concat(var.origens_web, [for o in var.origens_web : lower(o)]))
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "fotos" {
  bucket = aws_s3_bucket.fotos.id

  # Rede de segurança: quem apaga no dia certo é a rota /api/cron/expire (a
  # foto comum quando sai do mapa, a do histórico em até 30 dias). Se ela
  # parar, o S3 apaga sozinho em 31 dias.
  rule {
    id     = "posts-expiram"
    status = "Enabled"
    filter {
      prefix = "posts/"
    }
    expiration {
      days = 31
    }
  }

  rule {
    id     = "multipart-orfao"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

resource "aws_s3_bucket_policy" "fotos" {
  bucket = aws_s3_bucket.fotos.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "SoTLS"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.fotos.arn, "${aws_s3_bucket.fotos.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        # OAC: só esta distribuição lê, e só as fotos
        Sid       = "CloudFrontLeFotos"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.fotos.arn}/posts/*"
        Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.fotos.arn } }
      },
      {
        # A original enviada pelo navegador (com rostos e EXIF) mora em
        # posts/up/ e nunca sai pelo CDN: só o app lê, para refazer e desfocar
        Sid       = "CloudFrontNaoLeOriginais"
        Effect    = "Deny"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.fotos.arn}/posts/up/*"
      },
    ]
  })
  depends_on = [aws_s3_bucket_public_access_block.fotos]
}
