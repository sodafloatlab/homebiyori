# DynamoDB tables for Homebiyori application
module "dynamodb" {
  source = "../../../modules/dynamodb"
  
  project_name                  = var.project_name
  environment                   = var.environment
  common_tags                   = var.common_tags
  enable_point_in_time_recovery = var.enable_point_in_time_recovery
}

# S3 bucket for chat content storage
module "s3" {
  source = "../../../modules/s3"
  
  project_name    = var.project_name
  environment     = var.environment
  common_tags     = var.common_tags
  
  # Chat content bucket configuration
  create_chat_content_bucket = true
  chat_content_bucket_prefix = "chat-content"
}