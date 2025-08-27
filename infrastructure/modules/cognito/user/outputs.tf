# User Pool Outputs
output "user_pool_id" {
  description = "ID of the Users Cognito User Pool"
  value       = aws_cognito_user_pool.users.id
}

output "user_pool_arn" {
  description = "ARN of the Users Cognito User Pool"
  value       = aws_cognito_user_pool.users.arn
}

output "user_pool_endpoint" {
  description = "Endpoint of the Users Cognito User Pool"
  value       = aws_cognito_user_pool.users.endpoint
}

output "user_pool_domain" {
  description = "Domain of the Users Cognito User Pool"
  value       = aws_cognito_user_pool_domain.users.domain
}

output "user_pool_client_id" {
  description = "ID of the Users Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.users_web.id
}

# Configuration Information
output "google_oauth_enabled" {
  description = "Whether Google OAuth is enabled for this pool"
  value       = var.enable_google_oauth
}

output "authentication_scope" {
  description = "OAuth scopes configured for this user pool"
  value       = aws_cognito_user_pool_client.users_web.allowed_oauth_scopes
}

# Complete User Pool Information
output "user_pool_info" {
  description = "Complete information about the Users Cognito User Pool"
  value = {
    pool_id       = aws_cognito_user_pool.users.id
    pool_arn      = aws_cognito_user_pool.users.arn
    pool_endpoint = aws_cognito_user_pool.users.endpoint
    domain        = aws_cognito_user_pool_domain.users.domain
    client_id     = aws_cognito_user_pool_client.users_web.id
    auth_method   = "Google OAuth Only (No Email Storage)"
    oauth_scopes  = aws_cognito_user_pool_client.users_web.allowed_oauth_scopes
    privacy_level = "Maximum - No personal data stored"
    callback_urls = var.callback_urls
    logout_urls   = var.logout_urls
  }
}