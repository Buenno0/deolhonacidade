# Aviso por e-mail antes de a conta surpreender: 50% gasto e 100% previsto.
# Conta só o que tem a tag projeto=deolhonacidade (a conta pode ter outros
# projetos). A tag precisa estar ativa em Billing > Cost allocation tags.
resource "aws_budgets_budget" "mensal" {
  name         = "deolho-mensal"
  budget_type  = "COST"
  limit_amount = tostring(var.orcamento_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:projeto$deolhonacidade"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.email_alerta]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.email_alerta]
  }
}
