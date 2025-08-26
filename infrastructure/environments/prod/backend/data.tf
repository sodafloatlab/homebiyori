# Remote State Data Sources for Backend Environment
# Centralizes all remote state references for dependency management

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Parameter Store data sources for sensitive values
data "aws_ssm_parameter" "stripe_api_key" {
  name = "/${var.project_name}/${var.environment}/stripe/api_key"
}

data "aws_ssm_parameter" "stripe_webhook_secret" {
  name = "/${var.project_name}/${var.environment}/stripe/webhook_secret"
}


# Import datastore state for table and queue information
data "terraform_remote_state" "datastore" {
  backend = "s3"
  config = {
    bucket = "prod-homebiyori-terraform-state"
    key    = "datastore/terraform.tfstate"
    region = "ap-northeast-1"
  }
}

# Import frontend state for CloudFront domain information (for Cognito callbacks)
# Note: This creates a circular dependency issue, so we'll use variables for now
# In a real deployment, callbacks should be configured after frontend deployment
# data "terraform_remote_state" "frontend" {
#   backend = "s3"
#   config = {
#     bucket = "homebiyori-terraform-state"
#     key    = "prod/frontend/terraform.tfstate"
#     region = "us-east-1"
#   }
# }