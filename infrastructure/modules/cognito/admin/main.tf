# Cognito User Pool for Administrators - Email/Password Only
# High security configuration with strict password policies and MFA

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
  pool_name = "${var.project_name}-${var.environment}-admins"
  
  # Domain naming  
  domain_name = "${var.project_name}-${var.environment}-admin-auth"
  
  # Client naming
  client_name = "${var.project_name}-${var.environment}-admins-web-client"
  
  # Module-specific tags (merged with provider default_tags)
  tags = merge({
    Name = local.pool_name
    Type = "Administrator"
    AuthMethod = "EmailPassword"
    Module = "cognito-admin"
  }, var.additional_tags)
}

# Admin User Pool (Email/Password authentication only)
resource "aws_cognito_user_pool" "admins" {
  name = local.pool_name

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

  # Admin pool policies - only admin can create users
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  # Device configuration - standard security
  device_configuration {
    challenge_required_on_new_device      = false
    device_only_remembered_on_user_prompt = false
  }

  # MFA configuration - configurable for enhanced security
  mfa_configuration = var.enable_mfa ? "OPTIONAL" : "OFF"

  # Schema configuration for admins
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

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = false
    mutable            = true
  }

  tags = local.tags
}

# Admin User Pool Domain
resource "aws_cognito_user_pool_domain" "admins" {
  domain       = local.domain_name
  user_pool_id = aws_cognito_user_pool.admins.id
}

# Admin User Pool Client - Direct Email/Password authentication (No OAuth)
resource "aws_cognito_user_pool_client" "admins_web" {
  name         = local.client_name
  user_pool_id = aws_cognito_user_pool.admins.id

  generate_secret = false

  # No OAuth configuration - direct password authentication only
  # OAuth flows removed for pure password-based authentication
  # No callback/logout URLs needed for direct authentication
  
  # Admin identity providers - Cognito only (no social login, no OAuth)
  supported_identity_providers = ["COGNITO"]

  # Token validity - shorter for enhanced security
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