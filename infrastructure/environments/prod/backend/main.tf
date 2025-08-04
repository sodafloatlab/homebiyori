# Data sources to get information from other layers
data "terraform_remote_state" "datastore" {
  backend = "s3"
  config = {
    bucket = "homebiyori-terraform-state"
    key    = "datastore/terraform.tfstate"
    region = var.aws_region
  }
}

# Lambda functions
module "lambda" {
  source = "../../../modules/lambda"
  
  project_name              = var.project_name
  environment               = var.environment
  common_tags               = var.common_tags
  
  # Lambda deployment packages
  user_service_zip_path     = var.user_service_zip_path
  chat_service_zip_path     = var.chat_service_zip_path
  tree_service_zip_path     = var.tree_service_zip_path
  health_check_zip_path     = var.health_check_zip_path
  admin_service_zip_path    = var.admin_service_zip_path
  
  # Lambda Layers
  common_layer_zip_path     = var.common_layer_zip_path
  ai_layer_zip_path         = var.ai_layer_zip_path
  create_common_layer       = var.create_common_layer
  create_ai_layer           = var.create_ai_layer
  
  # DynamoDB table information
  user_data_table_name      = data.terraform_remote_state.datastore.outputs.user_data_table_name
  user_data_table_arn       = data.terraform_remote_state.datastore.outputs.user_data_table_arn
  chat_free_table_name      = data.terraform_remote_state.datastore.outputs.chat_free_table_name
  chat_premium_table_name   = data.terraform_remote_state.datastore.outputs.chat_premium_table_name
  chat_table_arns           = [
    data.terraform_remote_state.datastore.outputs.chat_free_table_arn,
    data.terraform_remote_state.datastore.outputs.chat_premium_table_arn
  ]
  
  # Parameter Store ARNs (for maintenance settings etc.)
  parameter_store_arns      = [
    "arn:aws:ssm:${var.aws_region}:*:parameter/homebiyori/maintenance/*"
  ]
  
  environment_variables = merge(var.environment_variables, {
    # Table names
    USER_DATA_TABLE_NAME     = data.terraform_remote_state.datastore.outputs.user_data_table_name
    CHAT_FREE_TABLE_NAME     = data.terraform_remote_state.datastore.outputs.chat_free_table_name
    CHAT_PREMIUM_TABLE_NAME  = data.terraform_remote_state.datastore.outputs.chat_premium_table_name
    CHILDREN_TABLE_NAME      = data.terraform_remote_state.datastore.outputs.children_table_name
    
    # S3 buckets
    CHAT_CONTENT_BUCKET      = data.terraform_remote_state.datastore.outputs.chat_content_bucket_name
    
    # AWS settings
    AWS_DEFAULT_REGION       = var.aws_region
  })
}

# Cognito authentication
module "cognito" {
  source = "../../../modules/cognito"
  
  project_name         = var.project_name
  environment          = var.environment
  common_tags          = var.common_tags
  callback_urls        = var.callback_urls
  logout_urls          = var.logout_urls
  enable_google_oauth  = var.enable_google_oauth
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
}

# API Gateway
module "api_gateway" {
  source = "../../../modules/api-gateway"
  
  project_name                    = var.project_name
  environment                     = var.environment
  common_tags                     = var.common_tags
  
  # Lambda invoke ARNs
  user_service_invoke_arn         = module.lambda.user_service_invoke_arn
  chat_service_invoke_arn         = module.lambda.chat_service_invoke_arn
  tree_service_invoke_arn         = module.lambda.tree_service_invoke_arn
  health_check_invoke_arn         = module.lambda.health_check_invoke_arn
  admin_service_invoke_arn        = module.lambda.admin_service_invoke_arn
  
  # Cognito User Pool ARNs
  user_cognito_user_pool_arn      = module.cognito.user_pool_arn
  admin_cognito_user_pool_arn     = module.cognito.user_pool_arn  # 現在は同じUser Poolを使用
}

# Bedrock monitoring
module "bedrock" {
  source = "../../../modules/bedrock"
  
  project_name = var.project_name
  environment  = var.environment
  common_tags  = var.common_tags
}