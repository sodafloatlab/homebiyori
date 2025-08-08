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

# Cognito configuration
callback_urls = [
  "https://homebiyori.example.com",
  "http://localhost:3000"  # For development
]

logout_urls = [
  "https://homebiyori.example.com/logout",
  "http://localhost:3000/logout"
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