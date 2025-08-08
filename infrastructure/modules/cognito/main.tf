# Cognito User Pools - Separated for Users and Admins
# Based on design.md - implements separated authentication for users and administrators
# Ensures proper access control and security isolation

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
  users_pool_name = "${var.project_name}-${var.environment}-users"
  admins_pool_name = "${var.project_name}-${var.environment}-admins"
  
  # Domain naming
  users_domain = "${var.project_name}-${var.environment}-auth"
  admins_domain = "${var.project_name}-${var.environment}-admin-auth"
  
  # Client naming
  users_client_name = "${var.project_name}-${var.environment}-users-web-client"
  admins_client_name = "${var.project_name}-${var.environment}-admins-web-client"
  
  # Additional tags (default_tags via provider handle basic tags)
  module_tags = merge(var.additional_tags, {
    Module = "cognito"
  })
  
  # Common schema attributes
  email_schema = {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable            = true
  }
  
  email_verified_schema = {
    name                = "email_verified"
    attribute_data_type = "Boolean"
    required            = false
    mutable            = true
  }
}

# User Pool for End Users (Google OAuth)
resource "aws_cognito_user_pool" "users" {
  name = local.users_pool_name

  # Password policy (less strict for social login)
  password_policy {
    minimum_length    = 8
    require_lowercase = false
    require_numbers   = false
    require_symbols   = false
    require_uppercase = false
  }

  # User attributes - focus on minimal required data
  alias_attributes = ["email"]
  
  username_configuration {
    case_sensitive = false
  }

  # Auto verification for email
  auto_verified_attributes = ["email"]

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # User pool policies
  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = false
    device_only_remembered_on_user_prompt = false
  }

  # MFA configuration - disabled for user convenience
  mfa_configuration = "OFF"

  # Schema configuration - minimal personal data
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable            = true
  }

  schema {
    name                = "email_verified"
    attribute_data_type = "Boolean"
    required            = false
    mutable            = true
  }

  tags = merge(local.module_tags, {
    Name = local.users_pool_name
    Type = "EndUser"
    AuthMethod = "GoogleOAuth"
  })
}

# User Pool for Administrators (Email/Password)
resource "aws_cognito_user_pool" "admins" {
  name = "${var.project_name}-${var.environment}-admins"

  # Strict password policy for administrators
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Admin attributes
  alias_attributes = ["email"]
  
  username_configuration {
    case_sensitive = false
  }

  # Auto verification
  auto_verified_attributes = ["email"]

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Admin pool policies - more restrictive
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  # MFA configuration - recommended for admins
  mfa_configuration = var.enable_admin_mfa ? "OPTIONAL" : "OFF"

  # Admin schema
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable            = true
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = false
    mutable            = true
  }

  tags = merge(local.module_tags, {
    Name = "${var.project_name}-${var.environment}-admins-pool"
    Type = "Administrator"
    AuthMethod = "EmailPassword"
  })
}

# User Pool Domain for End Users
resource "aws_cognito_user_pool_domain" "users" {
  domain       = "${var.project_name}-${var.environment}-auth"
  user_pool_id = aws_cognito_user_pool.users.id
}

# User Pool Domain for Administrators
resource "aws_cognito_user_pool_domain" "admins" {
  domain       = "${var.project_name}-${var.environment}-admin-auth"
  user_pool_id = aws_cognito_user_pool.admins.id
}

# User Pool Client for End Users (Web Application)
resource "aws_cognito_user_pool_client" "users_web" {
  name         = "${var.project_name}-${var.environment}-users-web-client"
  user_pool_id = aws_cognito_user_pool.users.id

  generate_secret = false

  # OAuth configuration for social login
  allowed_oauth_flows  = ["code"]
  allowed_oauth_scopes = ["openid", "email", "profile"]
  allowed_oauth_flows_user_pool_client = true

  # Callback and logout URLs
  callback_urls = var.user_callback_urls
  logout_urls   = var.user_logout_urls

  # Supported identity providers - primarily Google
  supported_identity_providers = concat(["COGNITO"], var.enable_google_oauth ? ["Google"] : [])

  # Token validity - aligned with design.md requirements
  access_token_validity  = 60   # 1 hour
  id_token_validity     = 60   # 1 hour
  refresh_token_validity = 30  # 30 days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Refresh token rotation for security
  enable_token_revocation = true
  enable_propagate_additional_user_context_data = false

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Read attributes - minimal for privacy
  read_attributes = [
    "email",
    "email_verified"
  ]

  # Write attributes - minimal for privacy
  write_attributes = [
    "email"
  ]

  # Explicit auth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# User Pool Client for Administrators
resource "aws_cognito_user_pool_client" "admins_web" {
  name         = "${var.project_name}-${var.environment}-admins-web-client"
  user_pool_id = aws_cognito_user_pool.admins.id

  generate_secret = false

  # OAuth configuration for admin login
  allowed_oauth_flows  = ["code"]
  allowed_oauth_scopes = ["openid", "email", "profile"]
  allowed_oauth_flows_user_pool_client = true

  # Admin callback and logout URLs
  callback_urls = var.admin_callback_urls
  logout_urls   = var.admin_logout_urls

  # Admin identity providers - email/password only
  supported_identity_providers = ["COGNITO"]

  # Token validity - shorter for security
  access_token_validity  = 30   # 30 minutes
  id_token_validity     = 30   # 30 minutes
  refresh_token_validity = 1   # 1 day

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Security settings
  enable_token_revocation = true
  prevent_user_existence_errors = "ENABLED"

  # Admin attributes
  read_attributes = [
    "email",
    "email_verified",
    "name"
  ]

  write_attributes = [
    "email",
    "name"
  ]

  # Explicit auth flows for admins
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]
}

# Google Identity Provider for End Users
resource "aws_cognito_identity_provider" "google" {
  count         = var.enable_google_oauth ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.users.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id     = var.google_client_id
    client_secret = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  # Minimal attribute mapping for privacy
  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
    # Note: name, picture, etc. are intentionally not mapped
    # to maintain privacy and avoid storing personal information
  }
}

# Optional Identity Pool for temporary AWS credentials (deprecated approach)
# This is kept for backward compatibility but not recommended for new designs
resource "aws_cognito_identity_pool" "main" {
  count                            = var.create_identity_pool ? 1 : 0
  identity_pool_name               = "${var.project_name}-${var.environment}-identity"
  allow_unauthenticated_identities = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.users_web.id
    provider_name           = aws_cognito_user_pool.users.endpoint
    server_side_token_check = false
  }

  tags = local.module_tags
}