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
          event_source_arn                   = module.sqs.ttl_updates_queue_arn
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
            Resource = [module.sqs.ttl_updates_queue_arn]
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
        PAYMENTS_TABLE_NAME = data.terraform_remote_state.datastore.outputs.payments_table_name
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
              "${data.terraform_remote_state.datastore.outputs.feedback_table_arn}/index/*",
              data.terraform_remote_state.datastore.outputs.payments_table_arn,
              "${data.terraform_remote_state.datastore.outputs.payments_table_arn}/index/*"
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
  source = "../../../modules/lambda/layer"

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
  source = "../../../modules/lambda/functions"

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

# =====================================
# Stripe EventBridge Architecture - Issue #28
# =====================================

# Stripe Webhook Lambda configurations（IAMポリシーJSON外部化対応）
locals {
  stripe_webhook_services = {
    handle-payment-succeeded = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME     = data.terraform_remote_state.datastore.outputs.core_table_name
        PAYMENTS_TABLE_NAME = data.terraform_remote_state.datastore.outputs.payments_table_name
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/stripe_webhook_payment_policy.json"
    }

    handle-payment-failed = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME     = data.terraform_remote_state.datastore.outputs.core_table_name
        PAYMENTS_TABLE_NAME = data.terraform_remote_state.datastore.outputs.payments_table_name
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/stripe_webhook_payment_policy.json"
    }

    handle-subscription-updated = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME = data.terraform_remote_state.datastore.outputs.core_table_name
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/stripe_webhook_subscription_policy.json"
    }
  }

  # IAMポリシーのプレースホルダー置換用変数
  policy_template_vars = {
    core_table_arn     = data.terraform_remote_state.datastore.outputs.core_table_arn
    payments_table_arn = data.terraform_remote_state.datastore.outputs.payments_table_arn
    region             = local.region
    account_id         = local.account_id
    project_name       = local.project_name
    environment        = local.environment
  }
}

# Stripe Webhook Lambda Functions（外部化IAMポリシー使用）
module "stripe_webhook_functions" {
  source = "../../../modules/lambda/functions"

  for_each = local.stripe_webhook_services

  project_name = local.project_name
  environment  = local.environment
  service_name = each.key

  filename         = var.stripe_webhook_zip_paths[each.key]
  source_code_hash = lookup(var.stripe_webhook_source_code_hashes, each.key, null)

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

  # IAM policy（JSONファイルからテンプレート読み込み、プレースホルダー置換）
  iam_policy_document = templatefile(
    "${path.module}/${each.value.iam_policy_template}",
    local.policy_template_vars
  )

  # No API Gateway permissions (EventBridge triggers)
  lambda_permissions = {}

  tags = merge(local.layer_tags, {
    Service   = each.key
    Component = "stripe-webhooks"
    EventType = split("-", each.key)[1] == "payment" ? 
                "${split("-", each.key)[1]}-${split("-", each.key)[2]}" : 
                "subscription-updated"
  })
}

# SQS Dead Letter Queue for EventBridge failed events
module "stripe_eventbridge_dlq" {
  source = "../../../modules/sqs"

  queue_name = "${local.project_name}-${local.environment}-stripe-eventbridge-dlq"
  aws_region = local.region
  
  # DLQ specific settings
  message_retention_seconds = 1209600  # 14 days
  visibility_timeout_seconds = 300     # 5 minutes
  max_receive_count = null            # No redrive for DLQ itself
  
  # Monitoring
  enable_monitoring = true
  alarm_actions = []

  tags = merge(local.layer_tags, {
    Component = "stripe-eventbridge"
    Purpose   = "dead-letter-queue"
  })
}

# EventBridge Bus（再利用可能モジュール使用）
module "stripe_eventbridge_bus" {
  source = "../../../modules/eventbridge/bus"

  bus_name           = "${local.environment}-${local.project_name}-stripe-webhook-bus"
  log_retention_days = var.log_retention_days

  tags = merge(local.layer_tags, {
    Component = "stripe-eventbridge"
    Purpose   = "webhook-processing"
  })
}

# EventBridge Rules & Targets（再利用可能モジュールで各イベント処理）
module "stripe_eventbridge_rules" {
  source = "../../../modules/eventbridge/rule"

  for_each = {
    payment-succeeded = {
      description = "Route Stripe invoice.payment_succeeded events to Lambda"
      event_pattern = jsonencode({
        source      = ["aws.partner/stripe.com/${var.stripe_partner_source_id}"]
        detail-type = ["Invoice Payment Succeeded"]
        detail = {
          type = ["invoice.payment_succeeded"]
        }
      })
      lambda_function_name = module.stripe_webhook_functions["handle-payment-succeeded"].function_name
      target_arn           = module.stripe_webhook_functions["handle-payment-succeeded"].function_arn
    }
    payment-failed = {
      description = "Route Stripe invoice.payment_failed events to Lambda"
      event_pattern = jsonencode({
        source      = ["aws.partner/stripe.com/${var.stripe_partner_source_id}"]
        detail-type = ["Invoice Payment Failed"]
        detail = {
          type = ["invoice.payment_failed"]
        }
      })
      lambda_function_name = module.stripe_webhook_functions["handle-payment-failed"].function_name
      target_arn           = module.stripe_webhook_functions["handle-payment-failed"].function_arn
    }
    subscription-updated = {
      description = "Route Stripe customer.subscription.updated events to Lambda"
      event_pattern = jsonencode({
        source      = ["aws.partner/stripe.com/${var.stripe_partner_source_id}"]
        detail-type = ["Customer Subscription Updated"]
        detail = {
          type = ["customer.subscription.updated"]
        }
      })
      lambda_function_name = module.stripe_webhook_functions["handle-subscription-updated"].function_name
      target_arn           = module.stripe_webhook_functions["handle-subscription-updated"].function_arn
    }
  }

  rule_name        = "${local.environment}-${local.project_name}-${each.key}-rule"
  rule_description = each.value.description
  event_bus_name   = module.stripe_eventbridge_bus.eventbridge_bus_name
  event_pattern    = each.value.event_pattern

  target_id            = "${title(replace(each.key, "-", ""))}LambdaTarget"
  target_arn           = each.value.target_arn
  target_type          = "lambda"
  lambda_function_name = each.value.lambda_function_name

  # リトライ・DLQ設定
  retry_policy = {
    maximum_retry_attempts       = 3
    maximum_event_age_in_seconds = 3600
  }
  dlq_arn = module.stripe_eventbridge_dlq.queue_arn

  tags = merge(local.layer_tags, {
    Component = "stripe-eventbridge"
    EventType = each.key
  })
}

# CloudWatch Alarms for Stripe EventBridge monitoring
resource "aws_cloudwatch_metric_alarm" "eventbridge_failed_invocations" {
  alarm_name          = "${local.project_name}-${local.environment}-eventbridge-failed-invocations"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "FailedInvocations"
  namespace           = "AWS/Events"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "This metric monitors failed EventBridge rule invocations"
  
  dimensions = {
    EventBusName = module.stripe_eventbridge_bus.eventbridge_bus_name
  }

  tags = merge(local.layer_tags, {
    Component = "stripe-eventbridge"
    Purpose   = "monitoring"
  })
}

resource "aws_cloudwatch_metric_alarm" "stripe_dlq_messages" {
  alarm_name          = "${local.project_name}-${local.environment}-stripe-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "ApproximateNumberOfVisibleMessages"
  namespace           = "AWS/SQS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "This metric monitors messages in Stripe EventBridge DLQ"
  
  dimensions = {
    QueueName = module.stripe_eventbridge_dlq.queue_name
  }

  tags = merge(local.layer_tags, {
    Component = "stripe-eventbridge"
    Purpose   = "monitoring"
  })
}

# SQS Queues for microservices communication (moved from datastore state)
module "sqs" {
  source = "../../../modules/sqs"
  
  project_name = local.project_name
  environment  = local.environment
  common_tags  = var.common_tags
  lambda_execution_role_arn = module.lambda_functions["ttl-updater-service"].function_role_arn

  depends_on = [module.lambda_functions]
}