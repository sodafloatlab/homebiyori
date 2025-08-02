# User Pool Outputs
output "users_pool_id" {
  description = "ID of the Users Cognito User Pool"
  value       = aws_cognito_user_pool.users.id
}

output "users_pool_arn" {
  description = "ARN of the Users Cognito User Pool"
  value       = aws_cognito_user_pool.users.arn
}

output "users_pool_endpoint" {
  description = "Endpoint of the Users Cognito User Pool"
  value       = aws_cognito_user_pool.users.endpoint
}

output "users_pool_domain" {
  description = "Domain of the Users Cognito User Pool"
  value       = aws_cognito_user_pool_domain.users.domain
}

output "users_pool_client_id" {
  description = "ID of the Users Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.users_web.id
}

# Admin Pool Outputs
output "admins_pool_id" {
  description = "ID of the Admins Cognito User Pool"
  value       = aws_cognito_user_pool.admins.id
}

output "admins_pool_arn" {
  description = "ARN of the Admins Cognito User Pool"
  value       = aws_cognito_user_pool.admins.arn
}

output "admins_pool_endpoint" {
  description = "Endpoint of the Admins Cognito User Pool"
  value       = aws_cognito_user_pool.admins.endpoint
}

output "admins_pool_domain" {
  description = "Domain of the Admins Cognito User Pool"
  value       = aws_cognito_user_pool_domain.admins.domain
}

output "admins_pool_client_id" {
  description = "ID of the Admins Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.admins_web.id
}

# Identity Pool Output (Optional)
output "identity_pool_id" {
  description = "ID of the Cognito Identity Pool (if enabled)"
  value       = var.create_identity_pool ? aws_cognito_identity_pool.main[0].id : null
}

# Combined outputs for convenience
output "cognito_pools" {
  description = "Combined Cognito pools information"
  value = {
    users = {
      pool_id       = aws_cognito_user_pool.users.id
      pool_arn      = aws_cognito_user_pool.users.arn
      pool_endpoint = aws_cognito_user_pool.users.endpoint
      domain        = aws_cognito_user_pool_domain.users.domain
      client_id     = aws_cognito_user_pool_client.users_web.id
    }
    admins = {
      pool_id       = aws_cognito_user_pool.admins.id
      pool_arn      = aws_cognito_user_pool.admins.arn
      pool_endpoint = aws_cognito_user_pool.admins.endpoint
      domain        = aws_cognito_user_pool_domain.admins.domain
      client_id     = aws_cognito_user_pool_client.admins_web.id
    }
  }
}

# Legacy compatibility outputs (deprecated)
output "user_pool_id" {
  description = "[DEPRECATED] Use users_pool_id instead"
  value       = aws_cognito_user_pool.users.id
}

output "user_pool_arn" {
  description = "[DEPRECATED] Use users_pool_arn instead"
  value       = aws_cognito_user_pool.users.arn
}

output "user_pool_client_id" {
  description = "[DEPRECATED] Use users_pool_client_id instead"
  value       = aws_cognito_user_pool_client.users_web.id
}