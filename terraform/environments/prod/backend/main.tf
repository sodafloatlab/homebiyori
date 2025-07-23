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
  lambda_zip_path           = var.lambda_zip_path
  environment_variables = merge(var.environment_variables, {
    USERS_TABLE_NAME    = data.terraform_remote_state.datastore.outputs.users_table_name
    POSTS_TABLE_NAME    = data.terraform_remote_state.datastore.outputs.posts_table_name
    PRAISES_TABLE_NAME  = data.terraform_remote_state.datastore.outputs.praises_table_name
    STATS_TABLE_NAME    = data.terraform_remote_state.datastore.outputs.stats_table_name
    CHILDREN_TABLE_NAME = data.terraform_remote_state.datastore.outputs.children_table_name
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
  main_lambda_invoke_arn          = module.lambda.main_api_invoke_arn
  ai_praise_lambda_invoke_arn     = module.lambda.ai_praise_invoke_arn
  cognito_user_pool_arn           = module.cognito.user_pool_arn
}

# Bedrock monitoring
module "bedrock" {
  source = "../../../modules/bedrock"
  
  project_name = var.project_name
  environment  = var.environment
  common_tags  = var.common_tags
}