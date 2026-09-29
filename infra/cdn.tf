# Leitura pública das fotos pela CDN. O post é público enquanto vive, então
# não há URL assinada (o NAS assina porque a mídia é pessoal).
#
# O CloudFront tem 1 TB/mês de saída grátis para sempre, e a foto de 11 KB +
# miniatura de 1 KB fazem esse 1 TB render dezenas de milhões de visualizações.
resource "aws_cloudfront_origin_access_control" "fotos" {
  name                              = "deolho-fotos"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Cache curto de propósito: quando o post some (12h, ou denúncia), a cópia na
# borda dura pouco. A original grava max-age=600 (10 min); a versão desfocada,
# que tem endereço único e nunca muda, grava s-maxage=3600 (1 h na borda) e
# max-age=43200 (12 h no aparelho de quem já viu).
resource "aws_cloudfront_cache_policy" "fotos" {
  name        = "deolho-fotos"
  min_ttl     = 0
  default_ttl = 600
  max_ttl     = 3600
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_brotli = false
    enable_accept_encoding_gzip   = false
  }
}

resource "aws_cloudfront_distribution" "fotos" {
  enabled         = true
  comment         = "De Olho: fotos dos posts"
  is_ipv6_enabled = true
  # PriceClass_All é a única que inclui as bordas da América do Sul. As
  # classes mais baratas serviriam o Brasil a partir dos EUA.
  price_class = "PriceClass_All"

  origin {
    origin_id                = "s3"
    domain_name              = aws_s3_bucket.fotos.bucket_regional_domain_name
    origin_path              = "/posts" # a URL pública é <cdn>/<cidade>/<id>
    origin_access_control_id = aws_cloudfront_origin_access_control.fotos.id
  }

  default_cache_behavior {
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = aws_cloudfront_cache_policy.fotos.id
    compress               = false # WebP já vem comprimido
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Sem domínio próprio por enquanto: o *.cloudfront.net com o certificado padrão
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
