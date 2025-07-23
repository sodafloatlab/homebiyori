# DynamoDB tables for Homebiyori application
module "dynamodb" {
  source = "../../../modules/dynamodb"
  
  project_name                  = var.project_name
  environment                   = var.environment
  common_tags                   = var.common_tags
  enable_point_in_time_recovery = var.enable_point_in_time_recovery
}