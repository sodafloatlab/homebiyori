# Cognito User Pool for End Users - Google OAuth Only
# Minimal personal information collection, privacy-focused design

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Local values for computed configurations
locals {
  # Pool naming
  pool_name = "${var.environment}-${var.project_name}-users"
  
  # Domain naming  
  domain_name = "${var.environment}-${var.project_name}-auth"
  
  # Client naming
  client_name = "${var.environment}-${var.project_name}-users-web-client"
  
  # Module-specific tags (merged with provider default_tags)
  tags = merge({
    Name = local.pool_name
    Type = "EndUser"
    AuthMethod = "GoogleOAuth"
    Module = "cognito-user"
  }, var.additional_tags)
}

# User Pool for End Users (Google OAuth only - no email attributes)
resource "aws_cognito_user_pool" "users" {
  name = local.pool_name

  # Password policy - minimal since Google OAuth doesn't use passwords
  password_policy {
    minimum_length    = 8
    require_lowercase = false
    require_numbers   = false
    require_symbols   = false
    require_uppercase = false
  }

  # No alias attributes - purely Google OAuth based identification
  # No email-based login or identification
  
  username_configuration {
    case_sensitive = false
  }

  # No auto verification - not using email attributes
  # auto_verified_attributes removed

  # No email configuration - not handling emails
  # email_configuration removed

  # No account recovery - Google manages account recovery
  # account_recovery_setting removed

  # User pool policies - allow user registration through Google OAuth
  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # Device configuration - simplified for user convenience
  device_configuration {
    challenge_required_on_new_device      = false
    device_only_remembered_on_user_prompt = false
  }

  # MFA configuration - disabled for user convenience
  mfa_configuration = "OFF"

  # No schema configuration - minimal user pool
  # All user data managed by Google, no custom attributes stored
  
  tags = local.tags
}

# User Pool Domain
resource "aws_cognito_user_pool_domain" "users" {
  domain       = local.domain_name
  user_pool_id = aws_cognito_user_pool.users.id
}

# User Pool Client - configured for Google OAuth only
resource "aws_cognito_user_pool_client" "users_web" {
  name         = local.client_name
  user_pool_id = aws_cognito_user_pool.users.id

  generate_secret = false

  # OAuth configuration - Google OAuth flow only
  allowed_oauth_flows  = ["code"]     #　認可コードフロー（Authorization Code Grant）による認証
  allowed_oauth_scopes = ["openid"]   # Minimal scope - only OpenID for authentication
  allowed_oauth_flows_user_pool_client = true # OAuth機能の有効化

  # Callback and logout URLs
  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  # Identity providers - Google only (no COGNITO direct login)
  supported_identity_providers = var.enable_google_oauth ? ["Google"] : []
  
  # Ensure Google identity provider exists before creating client
  depends_on = [aws_cognito_identity_provider.google]

  # Token validity - standard for web applications
  access_token_validity  = 60   # 1 hour
  id_token_validity     = 60   # 1 hour
  refresh_token_validity = 30  # 30 days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Security settings
  enable_token_revocation = true
  enable_propagate_additional_user_context_data = false
  prevent_user_existence_errors = "ENABLED"

  # No read attributes - Google manages all user data
  # read_attributes removed - no user attributes stored locally
  
  # No write attributes - Google manages all user data  
  # write_attributes removed - no user attributes modifiable

  # Explicit auth flows - only for social login
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# Google Identity Provider for End Users
resource "aws_cognito_identity_provider" "google" {
  count         = var.enable_google_oauth ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.users.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id                     = var.google_client_id
    client_secret                 = var.google_client_secret
    authorize_scopes              = "openid"
    attributes_url                = "https://people.googleapis.com/v1/people/me?personFields="
    attributes_url_add_attributes = "true"
    authorize_url                 = "https://accounts.google.com/o/oauth2/v2/auth"
    oidc_issuer                   = "https://accounts.google.com"
    token_request_method          = "POST"
    token_url                     = "https://www.googleapis.com/oauth2/v4/token"
  }

  # No attribute mapping - absolute privacy
  # Google manages all user data, Cognito only handles authentication tokens
  # No personal information stored in Cognito User Pool
}