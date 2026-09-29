variable "regiao" {
  description = "us-east-1: mais barata e com todos os serviços usados (Rekognition, SES). O CloudFront entrega de São Paulo de qualquer forma."
  type        = string
  default     = "us-east-1"
}

variable "bucket" {
  description = "Nome globalmente único do bucket das fotos."
  type        = string
}

variable "origens_web" {
  description = "Origens do app que enviam foto direto ao bucket (CORS do formulário assinado)."
  type        = list(string)
  default     = ["http://localhost:3000"]
}

variable "dominio_email" {
  description = "Domínio de onde saem os e-mails de login (ex.: deolhonacidade.com.br). Vazio: verifica só o e-mail do remetente, o que serve para testar no sandbox do SES."
  type        = string
  default     = ""
}

variable "email_remetente" {
  description = "Endereço que envia o código de login (ex.: nao-responda@deolhonacidade.com.br). Vazio: sem SES (o login principal é pelo Google)."
  type        = string
  default     = ""
}

variable "email_alerta" {
  description = "Quem recebe os alertas de orçamento."
  type        = string
}

variable "orcamento_usd" {
  description = "Limite mensal do AWS Budgets. O alerta chega em 50% gasto e em 100% previsto."
  type        = number
  default     = 5
}
