# Homebiyori Backend Infrastructure - Production Environment
# Uses reusable modules following Terraform best practices

# Local values for shared configurations
locals {
  # Project configuration
  project_name = var.project_name
  environment  = var.environment
  region       = data.aws_region.current.name
  account_id   = data.aws_caller_identity.current.account_id

  # Lambda service configurations
  lambda_services = {
    user-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME = data.terraform_remote_state.datastore.outputs.core_table_name
      }
      iam_policy_document = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:Query"
            ]
            Resource = [
              data.terraform_remote_state.datastore.outputs.core_table_arn,
              "${data.terraform_remote_state.datastore.outputs.core_table_arn}/index/*"
            ]
            Condition = {
              "ForAllValues:StringLike" = {
                "dynamodb:LeadingKeys" = ["USER#*"]
              }
            }
          },
          {
            Effect = "Allow"
            Action = ["ssm:GetParameter"]
            Resource = [
              "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${local.project_name}/${local.environment}/*"
            ]
          }
        ]
      })
    }

    chat-service = {
      memory_size = 512
      timeout     = 60
      layers      = ["common", "ai"]
      environment_variables = {
        CORE_TABLE_NAME     = data.terraform_remote_state.datastore.outputs.core_table_name
        CHATS_TABLE_NAME    = data.terraform_remote_state.datastore.outputs.chats_table_name
        FRUITS_TABLE_NAME   = data.terraform_remote_state.datastore.outputs.fruits_table_name
        BEDROCK_MODEL_ID    = var.bedrock_model_id
      }
      iam_policy_document = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:Query"
            ]
            Resource = [
              data.terraform_remote_state.datastore.outputs.core_table_arn,
              "${data.terraform_remote_state.datastore.outputs.core_table_arn}/index/*",
              data.terraform_remote_state.datastore.outputs.chats_table_arn,
              data.terraform_remote_state.datastore.outputs.fruits_table_arn
            ]
            Condition = {
              "ForAllValues:StringLike" = {
                "dynamodb:LeadingKeys" = ["USER#*"]
              }
            }
          },
          {
            Effect = "Allow"
            Action = ["bedrock:InvokeModel"]
            Resource = [
              "arn:aws:bedrock:${local.region}::foundation-model/${var.bedrock_model_id}"
            ]
          },
          {
            Effect = "Allow"
            Action = ["ssm:GetParameter"]
            Resource = [
              "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${local.project_name}/${local.environment}/*"
            ]
          }
        ]
      })
    }

    tree-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME   = data.terraform_remote_state.datastore.outputs.core_table_name
        FRUITS_TABLE_NAME = data.terraform_remote_state.datastore.outputs.fruits_table_name
      }
      iam_policy_document = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:Query"
            ]
            Resource = [
              data.terraform_remote_state.datastore.outputs.core_table_arn,
              "${data.terraform_remote_state.datastore.outputs.core_table_arn}/index/*",
              data.terraform_remote_state.datastore.outputs.fruits_table_arn
            ]
            Condition = {
              "ForAllValues:StringLike" = {
                "dynamodb:LeadingKeys" = ["USER#*"]
              }
            }
          },
          {
            Effect = "Allow"
            Action = ["ssm:GetParameter"]
            Resource = [
              "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${local.project_name}/${local.environment}/*"
            ]
          }
        ]
      })
    }

    health-check-service = {
      memory_size = 128
      timeout     = 10
      layers      = []
      environment_variables = {}
      iam_policy_document = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = ["ssm:GetParameter"]
            Resource = [
              "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${local.project_name}/${local.environment}/maintenance/*"
            ]
          }
        ]
      })
    }

    webhook-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME                 = data.terraform_remote_state.datastore.outputs.core_table_name
        TTL_UPDATES_QUEUE_URL          = data.terraform_remote_state.datastore.outputs.ttl_updates_queue_url
        WEBHOOK_EVENTS_QUEUE_URL       = data.terraform_remote_state.datastore.outputs.webhook_events_queue_url
        STRIPE_API_KEY_PARAMETER       = data.aws_ssm_parameter.stripe_api_key.name
        STRIPE_WEBHOOK_SECRET_PARAMETER = data.aws_ssm_parameter.stripe_webhook_secret.name
        STRIPE_WEBHOOK_ENDPOINT_SECRET_PARAMETER = data.aws_ssm_parameter.stripe_webhook_endpoint_secret.name
      }
      iam_policy_document = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem"
            ]
            Resource = [
              data.terraform_remote_state.datastore.outputs.core_table_arn,
              "${data.terraform_remote_state.datastore.outputs.core_table_arn}/index/*"
            ]
          },
          {
            Effect = "Allow"
            Action = ["sqs:SendMessage"]
            Resource = [
              data.terraform_remote_state.datastore.outputs.ttl_updates_queue_arn,
              data.terraform_remote_state.datastore.outputs.webhook_events_queue_arn
            ]
          },
          {
            Effect = "Allow"
            Action = ["ssm:GetParameter"]
            Resource = [
              "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${local.project_name}/${local.environment}/*"
            ]
          }
        ]
      })
    }

    notification-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME = data.terraform_remote_state.datastore.outputs.core_table_name
      }
      iam_policy_document = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:Query"
            ]
            Resource = [
              data.terraform_remote_state.datastore.outputs.core_table_arn,
              "${data.terraform_remote_state.datastore.outputs.core_table_arn}/index/*"
            ]
          },
          {
            Effect = "Allow"
            Action = ["ssm:GetParameter"]
            Resource = [
              "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${local.project_name}/${local.environment}/*"
            ]
          }
        ]
      })
    }

    ttl-updater-service = {
      memory_size = 512
      timeout     = 300
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME   = data.terraform_remote_state.datastore.outputs.core_table_name
        CHATS_TABLE_NAME  = data.terraform_remote_state.datastore.outputs.chats_table_name
      }
      event_source_mappings = {
        ttl_updates = {
          event_source_arn                   = data.terraform_remote_state.datastore.outputs.ttl_updates_queue_arn
          batch_size                         = 10
          maximum_batching_window_in_seconds = 5
          function_response_types            = ["ReportBatchItemFailures"]
        }
      }
      iam_policy_document = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:Query",
              "dynamodb:BatchWriteItem"
            ]
            Resource = [
              data.terraform_remote_state.datastore.outputs.core_table_arn,
              "${data.terraform_remote_state.datastore.outputs.core_table_arn}/index/*",
              data.terraform_remote_state.datastore.outputs.chats_table_arn
            ]
          },
          {
            Effect = "Allow"
            Action = [
              "sqs:ReceiveMessage",
              "sqs:DeleteMessage",
              "sqs:GetQueueAttributes"
            ]
            Resource = [data.terraform_remote_state.datastore.outputs.ttl_updates_queue_arn]
          },
          {
            Effect = "Allow"
            Action = ["ssm:GetParameter"]
            Resource = [
              "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${local.project_name}/${local.environment}/*"
            ]
          }
        ]
      })
    }

    billing-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME          = data.terraform_remote_state.datastore.outputs.core_table_name
        STRIPE_API_KEY_PARAMETER = data.aws_ssm_parameter.stripe_api_key.name
      }
      iam_policy_document = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:PutItem",
              "dynamodb:UpdateItem",
              "dynamodb:Query"
            ]
            Resource = [
              data.terraform_remote_state.datastore.outputs.core_table_arn,
              "${data.terraform_remote_state.datastore.outputs.core_table_arn}/index/*"
            ]
          },
          {
            Effect = "Allow"
            Action = ["ssm:GetParameter"]
            Resource = [
              "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${local.project_name}/${local.environment}/*"
            ]
          }
        ]
      })
    }

    admin-service = {
      memory_size = 512
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME     = data.terraform_remote_state.datastore.outputs.core_table_name
        CHATS_TABLE_NAME    = data.terraform_remote_state.datastore.outputs.chats_table_name
        FRUITS_TABLE_NAME   = data.terraform_remote_state.datastore.outputs.fruits_table_name
        FEEDBACK_TABLE_NAME = data.terraform_remote_state.datastore.outputs.feedback_table_name
      }
      iam_policy_document = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "dynamodb:GetItem",
              "dynamodb:Query",
              "dynamodb:Scan"
            ]
            Resource = [
              data.terraform_remote_state.datastore.outputs.core_table_arn,
              "${data.terraform_remote_state.datastore.outputs.core_table_arn}/index/*",
              data.terraform_remote_state.datastore.outputs.chats_table_arn,
              data.terraform_remote_state.datastore.outputs.fruits_table_arn,
              data.terraform_remote_state.datastore.outputs.feedback_table_arn,
              "${data.terraform_remote_state.datastore.outputs.feedback_table_arn}/index/*"
            ]
          },
          {
            Effect = "Allow"
            Action = [
              "cloudwatch:GetMetricStatistics",
              "lambda:GetFunction",
              "lambda:ListFunctions"
            ]
            Resource = ["*"]
          },
          {
            Effect = "Allow"
            Action = [
              "ssm:GetParameter",
              "ssm:PutParameter"
            ]
            Resource = [
              "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${local.project_name}/${local.environment}/*"
            ]
          }
        ]
      })
    }

    contact-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        SNS_TOPIC_ARN = module.contact_notifications.topic_arn
      }
      iam_policy_document = jsonencode({
        Version = "2012-10-17"
        Statement = [
          {
            Effect = "Allow"
            Action = [
              "sns:Publish",
              "sns:GetTopicAttributes"
            ]
            Resource = [module.contact_notifications.topic_arn]
          },
          {
            Effect = "Allow"
            Action = [
              "sqs:SendMessage"
            ]
            Resource = [module.contact_notifications.dlq_arn]
          },
          {
            Effect = "Allow"
            Action = [
              "logs:CreateLogGroup",
              "logs:CreateLogStream", 
              "logs:PutLogEvents"
            ]
            Resource = [
              "arn:aws:logs:${local.region}:${local.account_id}:log-group:/aws/lambda/${local.project_name}-${local.environment}-contact-service*"
            ]
          },
          {
            Effect = "Allow"
            Action = ["ssm:GetParameter"]
            Resource = [
              "arn:aws:ssm:${local.region}:${local.account_id}:parameter/${local.project_name}/${local.environment}/*"
            ]
          }
        ]
      })
    }
  }

  # Additional tags specific to backend layer (default_tags handle basic tags)
  layer_tags = {
    Layer = "backend"
  }

  # Lambda Layer ARNs
  layer_arns = {
    common = var.create_common_layer ? module.lambda_layers["common"].layer_arn : var.common_layer_arn
    ai     = var.create_ai_layer ? module.lambda_layers["ai"].layer_arn : var.ai_layer_arn
  }

  # Lambda layer configurations
  lambda_layer_configs = {
    common = {
      layer_name   = "common"
      layer_type   = "common"
      description  = "Common dependencies for Homebiyori Lambda functions"
      filename     = var.common_layer_zip_path
      compatible_runtimes = ["python3.11", "python3.12"]
      license_info = "MIT"
      tags = {
        Component = "lambda-infrastructure"
        Purpose   = "shared-dependencies"
      }
    }
    ai = {
      layer_name   = "ai"
      layer_type   = "ai"
      description  = "AI/ML dependencies for Homebiyori Lambda functions (Bedrock, LangChain)"
      filename     = var.ai_layer_zip_path
      compatible_runtimes = ["python3.11", "python3.12"]
      license_info = "MIT"
      tags = {
        Component = "lambda-infrastructure"
        Purpose   = "ai-dependencies"
      }
    }
  }
}


# Lambda Layers using reusable modules
module "lambda_layers" {
  source = "../../../modules/lambda-layer"

  for_each = {
    for layer_name, layer_config in local.lambda_layer_configs :
    layer_name => layer_config
    if (layer_name == "common" && var.create_common_layer) || 
       (layer_name == "ai" && var.create_ai_layer)
  }

  project_name = local.project_name
  environment  = local.environment
  layer_name   = each.value.layer_name
  layer_type   = each.value.layer_type
  description  = each.value.description

  filename                 = each.value.filename
  source_code_hash         = lookup(var.lambda_layer_source_code_hashes, each.key, null)
  compatible_runtimes      = each.value.compatible_runtimes
  compatible_architectures = ["x86_64"]
  license_info            = each.value.license_info

  tags = merge(local.layer_tags, each.value.tags)
}

# Lambda Functions using reusable modules
module "lambda_functions" {
  source = "../../../modules/lambda-function"

  for_each = local.lambda_services

  project_name = local.project_name
  environment  = local.environment
  service_name = each.key

  filename         = var.lambda_zip_paths[each.key]
  source_code_hash = lookup(var.lambda_source_code_hashes, each.key, null)

  memory_size = each.value.memory_size
  timeout     = each.value.timeout

  # CloudWatch Logs retention
  log_retention_days = var.log_retention_days

  # Lambda Layers
  layers = compact([
    for layer in each.value.layers : lookup(local.layer_arns, layer, null)
  ])

  # Environment variables
  environment_variables = each.value.environment_variables

  # IAM policy
  iam_policy_document = each.value.iam_policy_document

  # Event source mappings (for ttl-updater-service)
  event_source_mappings = lookup(each.value, "event_source_mappings", {})

  # API Gateway permissions (will be handled by API Gateway module)
  lambda_permissions = {}

  tags = merge(local.layer_tags, {
    Service = each.key
  })
}

# Cognito authentication
module "cognito" {
  source = "../../../modules/cognito"
  
  project_name         = local.project_name
  environment          = local.environment
  additional_tags      = local.layer_tags
  user_callback_urls   = var.callback_urls
  user_logout_urls     = var.logout_urls
  admin_callback_urls  = var.callback_urls
  admin_logout_urls    = var.logout_urls
  enable_google_oauth  = var.enable_google_oauth
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
}

# User API Gateway - Public and authenticated user endpoints
module "user_api_gateway" {
  source = "../../../modules/apigateway"
  
  project_name = local.project_name
  environment  = local.environment
  api_type     = "user"
  
  cognito_user_pool_arn = module.cognito.users_pool_arn
  log_retention_days    = var.log_retention_days
  
  lambda_services = {
    health = {
      path_part             = "health"
      lambda_function_name  = module.lambda_functions["health-check-service"].function_name
      lambda_invoke_arn     = module.lambda_functions["health-check-service"].invoke_arn
      http_method          = "GET"
      require_auth         = false
      use_proxy           = false
      enable_cors         = true
    }
    users = {
      path_part             = "users"
      lambda_function_name  = module.lambda_functions["user-service"].function_name
      lambda_invoke_arn     = module.lambda_functions["user-service"].invoke_arn
      http_method          = "ANY"
      require_auth         = true
      use_proxy           = true
      enable_cors         = true
    }
    chat = {
      path_part             = "chat"
      lambda_function_name  = module.lambda_functions["chat-service"].function_name
      lambda_invoke_arn     = module.lambda_functions["chat-service"].invoke_arn
      http_method          = "ANY"
      require_auth         = true
      use_proxy           = true
      enable_cors         = true
    }
    tree = {
      path_part             = "tree"
      lambda_function_name  = module.lambda_functions["tree-service"].function_name
      lambda_invoke_arn     = module.lambda_functions["tree-service"].invoke_arn
      http_method          = "ANY"
      require_auth         = true
      use_proxy           = true
      enable_cors         = true
    }
    webhook = {
      path_part             = "webhook"
      lambda_function_name  = module.lambda_functions["webhook-service"].function_name
      lambda_invoke_arn     = module.lambda_functions["webhook-service"].invoke_arn
      http_method          = "POST"
      require_auth         = false
      use_proxy           = false
      enable_cors         = false
    }
    billing = {
      path_part             = "billing"
      lambda_function_name  = module.lambda_functions["billing-service"].function_name
      lambda_invoke_arn     = module.lambda_functions["billing-service"].invoke_arn
      http_method          = "ANY"
      require_auth         = true
      use_proxy           = true
      enable_cors         = true
    }
    notifications = {
      path_part             = "notifications"
      lambda_function_name  = module.lambda_functions["notification-service"].function_name
      lambda_invoke_arn     = module.lambda_functions["notification-service"].invoke_arn
      http_method          = "ANY"
      require_auth         = true
      use_proxy           = true
      enable_cors         = true
    }
    contact = {
      path_part             = "contact"
      lambda_function_name  = module.lambda_functions["contact-service"].function_name
      lambda_invoke_arn     = module.lambda_functions["contact-service"].invoke_arn
      http_method          = "ANY"
      require_auth         = false
      use_proxy           = true
      enable_cors         = true
    }
  }
  
  cors_allow_origin       = "'*'"
  enable_detailed_logging = true
  
  tags = merge(local.layer_tags, {
    APIType = "user"
  })
}

# Admin API Gateway - Administrative endpoints
module "admin_api_gateway" {
  source = "../../../modules/apigateway"
  
  project_name = local.project_name
  environment  = local.environment
  api_type     = "admin"
  
  cognito_user_pool_arn = module.cognito.admins_pool_arn
  log_retention_days    = var.log_retention_days
  
  lambda_services = {
    admin = {
      path_part             = "admin"
      lambda_function_name  = module.lambda_functions["admin-service"].function_name
      lambda_invoke_arn     = module.lambda_functions["admin-service"].invoke_arn
      http_method          = "ANY"
      require_auth         = true
      use_proxy           = true
      enable_cors         = false
    }
  }
  
  cors_allow_origin       = "'https://admin.homebiyori.com'"
  enable_detailed_logging = true
  
  tags = merge(local.layer_tags, {
    APIType = "admin"
  })
}

# Bedrock monitoring
module "bedrock" {
  source = "../../../modules/bedrock"
  
  project_name = local.project_name
  environment  = local.environment
  additional_tags = local.layer_tags
}

# SNS topic for contact inquiries
module "contact_notifications" {
  source = "../../../modules/sns"

  topic_name    = "${local.project_name}-${local.environment}-contact-notifications"
  display_name  = "Homebiyori Contact Notifications"
  aws_region    = local.region
  aws_account_id = local.account_id

  # Email subscriptions (must be confirmed manually after deployment)
  subscription_emails = var.contact_notification_emails

  # Monitoring
  enable_monitoring = true
  alarm_actions     = []

  tags = merge(local.layer_tags, {
    Component = "contact-notifications"
    Purpose   = "operator-alerts"
  })
}