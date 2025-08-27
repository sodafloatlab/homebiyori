aws_region   = "ap-northeast-1"
environment  = "prod"
project_name = "homebiyori"

# Lambda configuration
lambda_zip_path = "../../../lambda_function.zip"

environment_variables = {
  LOG_LEVEL = "INFO"
  BEDROCK_REGION = "ap-northeast-1"
  BEDROCK_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
}

# Cognito configuration - homebiyori.com domain
callback_urls = [
  "https://homebiyori.com/auth/callback",
  "https://www.homebiyori.com/auth/callback",
  "http://localhost:3000/auth/callback"  # For development
]

logout_urls = [
  "https://homebiyori.com",
  "https://www.homebiyori.com",
  "http://localhost:3000"
]


enable_google_oauth = true
# Note: Set google_client_id and google_client_secret as environment variables:
# export TF_VAR_google_client_id="your_client_id"
# export TF_VAR_google_client_secret="your_client_secret"

# CloudWatch Logs retention - 1 week
log_retention_days = 7

common_tags = {
  Project     = "homebiyori"
  Environment = "prod"
  ManagedBy   = "terraform"
  Description = "AI-powered parenting support application"
  Layer       = "backend"
}

# =====================================
# Stripe EventBridge Configuration - Issue #28
# =====================================

# Stripe webhook Lambda zip paths (to be configured during deployment)
stripe_webhook_zip_paths = {
  handle-payment-succeeded     = "../../../webhook_service/stripe/handle_payment_succeeded.zip"
  handle-payment-failed        = "../../../webhook_service/stripe/handle_payment_failed.zip"
  handle-subscription-updated  = "../../../webhook_service/stripe/handle_subscription_updated.zip"
}

# Stripe Partner Event Source ID
# Note: Set this as environment variable for security:
# export TF_VAR_stripe_partner_source_id="acct_XXXXXXXXXXXXXXXXXX"
# stripe_partner_source_id will be set via environment variable