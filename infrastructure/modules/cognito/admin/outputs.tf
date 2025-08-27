# Admin Pool Outputs
output "user_pool_id" {
  description = "ID of the Admins Cognito User Pool"
  value       = aws_cognito_user_pool.admins.id
}

output "user_pool_arn" {
  description = "ARN of the Admins Cognito User Pool"
  value       = aws_cognito_user_pool.admins.arn
}

output "user_pool_endpoint" {
  description = "Endpoint of the Admins Cognito User Pool"
  value       = aws_cognito_user_pool.admins.endpoint
}

output "user_pool_domain" {
  description = "Domain of the Admins Cognito User Pool"
  value       = aws_cognito_user_pool_domain.admins.domain
}

output "user_pool_client_id" {
  description = "ID of the Admins Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.admins_web.id
}

# Configuration Information
output "mfa_enabled" {
  description = "Whether MFA is enabled for admin users"
  value       = var.enable_mfa
}

output "authentication_method" {
  description = "Authentication method for admin pool"
  value       = "Direct Email/Password (No OAuth)"
}

# Complete Admin Pool Information
output "admin_pool_info" {
  description = "Complete information about the Admin Cognito User Pool"
  value = {
    pool_id       = aws_cognito_user_pool.admins.id
    pool_arn      = aws_cognito_user_pool.admins.arn
    pool_endpoint = aws_cognito_user_pool.admins.endpoint
    domain        = aws_cognito_user_pool_domain.admins.domain
    client_id     = aws_cognito_user_pool_client.admins_web.id
    auth_method   = "Direct Email/Password (No OAuth)"
    mfa_enabled   = var.enable_mfa
    auth_flows    = "Direct password authentication only"
  }
}