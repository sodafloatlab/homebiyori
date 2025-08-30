# ========================================
# Homebiyori Backend Infrastructure - Production Environment
# ========================================
# Uses reusable modules following Terraform best practices
# Architecture: API Gateway + Lambda + DynamoDB + Cognito + EventBridge

# ========================================
# LOCAL VARIABLES - Configuration Definitions
# ========================================
locals {
  # ----------------------------------------
  # Project Metadata
  # ----------------------------------------
  project_name = var.project_name
  environment  = var.environment
  region       = data.aws_region.current.name
  account_id   = data.aws_caller_identity.current.account_id

  # ----------------------------------------
  # Lambda Service Configurations
  # ----------------------------------------
  # Main application services with individual IAM policies
  # Each service maps to a specific Lambda function with:
  # - Runtime settings (memory, timeout, layers)
  # - Environment variables (table names, parameters)
  # - IAM permissions (DynamoDB, SSM, external APIs)
  lambda_services = {
    # User Management Service - Authentication, profiles, subscription status
    user-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME = data.terraform_remote_state.datastore.outputs.core_table_name
        ENVIRONMENT     = var.environment
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/user_service_policy.json"
    }

    # Chat AI Service - LLM conversations, memory management (common layer only)
    chat-service = {
      memory_size = 512
      timeout     = 60
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME     = data.terraform_remote_state.datastore.outputs.core_table_name
        CHATS_TABLE_NAME    = data.terraform_remote_state.datastore.outputs.chats_table_name
        FRUITS_TABLE_NAME   = data.terraform_remote_state.datastore.outputs.fruits_table_name
        ENVIRONMENT         = var.environment
        TREE_SERVICE_URL    = module.user_api_gateway.invoke_url
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/chat_service_policy.json"
    }

    # Tree Growth Service - Fruit management and progress visualization
    tree-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME   = data.terraform_remote_state.datastore.outputs.core_table_name
        FRUITS_TABLE_NAME = data.terraform_remote_state.datastore.outputs.fruits_table_name
        ENVIRONMENT       = var.environment
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/tree_service_policy.json"
    }

    # Health Check Service - API status and maintenance mode monitoring
    health-check-service = {
      memory_size = 128
      timeout     = 10
      layers      = []
      environment_variables = {
        ENVIRONMENT = var.environment
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/health_check_service_policy.json"
    }


    # Notification Service - User alerts and system messages
    notification-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME = data.terraform_remote_state.datastore.outputs.core_table_name
        ENVIRONMENT     = var.environment
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/notification_service_policy.json"
    }


    # Billing Service - Stripe integration and subscription management
    billing-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME          = data.terraform_remote_state.datastore.outputs.core_table_name
        FEEDBACK_TABLE_NAME      = data.terraform_remote_state.datastore.outputs.feedback_table_name
        STRIPE_API_KEY_PARAMETER = data.aws_ssm_parameter.stripe_api_key.name
        ENVIRONMENT              = var.environment
        FRONTEND_URL             = "https://homebiyori.com"
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/billing_service_policy.json"
    }

    # Admin Service - System administration and monitoring dashboard
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
        ENVIRONMENT         = var.environment
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/admin_service_policy.json"
    }

    # Contact Service - Customer inquiry handling and SNS notifications
    contact-service = {
      memory_size = 256
      timeout     = 30
      layers      = ["common"]
      environment_variables = {
        SNS_TOPIC_ARN = module.contact_notifications.topic_arn
        ENVIRONMENT   = var.environment
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/contact_service_policy.json"
    }

    # Deletion Processor Service - Account deletion async data cleanup
    deletion-processor = {
      memory_size = 512
      timeout     = 900  # 15 minutes for large data cleanup
      layers      = ["common"]
      environment_variables = {
        CORE_TABLE_NAME     = data.terraform_remote_state.datastore.outputs.core_table_name
        CHATS_TABLE_NAME    = data.terraform_remote_state.datastore.outputs.chats_table_name
        FRUITS_TABLE_NAME   = data.terraform_remote_state.datastore.outputs.fruits_table_name
        FEEDBACK_TABLE_NAME = data.terraform_remote_state.datastore.outputs.feedback_table_name
        ENVIRONMENT         = var.environment
      }
      # JSONファイルから読み込み、プレースホルダー置換
      iam_policy_template = "policies/deletion_processor_policy.json"
      # SQS event source mapping for account deletion queue
      event_source_mappings = {
        account_deletion_queue = {
          event_source_arn                   = module.account_deletion_queue.queue_arn
          batch_size                         = 10
          maximum_batching_window_in_seconds = 5
        }
      }
    }
  }

  # ----------------------------------------
  # Layer Configurations
  # ----------------------------------------

  # Lambda Layer ARN Mapping - dynamically select created or existing layers
  layer_arns = {
    common = var.create_common_layer ? module.lambda_layers[0].layer_arn : var.common_layer_arn
  }

  # Lambda Layer Runtime Configuration - ZIP files and dependencies (common only)
  lambda_layer_config = {
    layer_name   = "common"
    layer_type   = "common"
    description  = "Common dependencies for Homebiyori Lambda functions"
    filename     = "${path.module}/src/layers/common.zip"
    compatible_runtimes = ["python3.13"]
    license_info = "MIT"
    tags = {
      Component = "lambda-infrastructure"
      Purpose   = "shared-dependencies"
    }
  }

  # Lambda Functions ZIP file paths
  lambda_zip_paths = {
    for service_name in keys(local.lambda_services) :
    service_name => "${path.module}/src/functions/${service_name}.zip"
  }

  # Stripe Webhook Functions ZIP file paths
  stripe_webhook_zip_paths = {
    for webhook_name in keys(local.stripe_webhook_services) :
    webhook_name => "${path.module}/src/functions/${webhook_name}.zip"
  }
}


# Lambda Layer using reusable module (common only)
module "lambda_layers" {
  count = var.create_common_layer ? 1 : 0
  source = "../../../modules/lambda/layer"

  project_name = local.project_name
  environment  = local.environment
  layer_name   = local.lambda_layer_config.layer_name
  layer_type   = local.lambda_layer_config.layer_type
  description  = local.lambda_layer_config.description

  filename                 = local.lambda_layer_config.filename
  source_code_hash         = filebase64sha256(local.lambda_layer_config.filename)
  compatible_runtimes      = local.lambda_layer_config.compatible_runtimes
  compatible_architectures = ["x86_64"]
  license_info            = local.lambda_layer_config.license_info

  tags = local.lambda_layer_config.tags
}

# Lambda Functions using reusable modules
module "lambda_functions" {
  source = "../../../modules/lambda/functions"

  for_each = local.lambda_services

  project_name = local.project_name
  environment  = local.environment
  service_name = each.key

  filename         = local.lambda_zip_paths[each.key]
  source_code_hash = filebase64sha256(local.lambda_zip_paths[each.key])

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

  # Event source mappings
  event_source_mappings = lookup(each.value, "event_source_mappings", {})

  # API Gateway permissions (will be handled by API Gateway module)
  lambda_permissions = {}

  tags = {
    Service = each.key
  }
}

# Cognito User Pool for End Users (Google OAuth only)
module "cognito_users" {
  source = "../../../modules/cognito/user"
  
  project_name         = local.project_name
  environment          = local.environment
  additional_tags      = {}
  callback_urls        = var.callback_urls
  logout_urls          = var.logout_urls
  enable_google_oauth  = var.enable_google_oauth
  google_client_id     = data.aws_ssm_parameter.google_client_id.value
  google_client_secret = data.aws_ssm_parameter.google_client_secret.value
}

# Cognito User Pool for Admins (Email/Password authentication only)
module "cognito_admins" {
  source = "../../../modules/cognito/admin"
  
  project_name    = local.project_name
  environment     = local.environment
  additional_tags = {}
  enable_mfa      = true  # Enhanced security for admin accounts
}

# User API Gateway - Public and authenticated user endpoints
module "user_api_gateway" {
  source = "../../../modules/apigateway"
  
  project_name = local.project_name
  environment  = local.environment
  api_type     = "user"
  
  cognito_user_pool_arn = module.cognito_users.user_pool_arn
  enable_cognito_auth   = true
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
    user = {
      path_part             = "user"
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
  
  tags = {
    APIType = "user"
  }
}

# Admin API Gateway - Administrative endpoints
module "admin_api_gateway" {
  source = "../../../modules/apigateway"
  
  project_name = local.project_name
  environment  = local.environment
  api_type     = "admin"
  
  cognito_user_pool_arn = module.cognito_admins.user_pool_arn
  enable_cognito_auth   = true
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
  
  tags = {
    APIType = "admin"
  }
}

# Amazon Bedrock logging configuration
module "bedrock" {
  source = "../../../modules/bedrock"
  
  project_name     = local.project_name
  environment      = local.environment
  logs_bucket_name = data.terraform_remote_state.datastore.outputs.logs_bucket_name
  additional_tags  = {}
}

# SNS topic for contact inquiries (subscriptions managed manually)
module "contact_notifications" {
  source = "../../../modules/sns"

  topic_name    = "${local.environment}-${local.project_name}-contact-notifications"
  display_name  = "Homebiyori Contact Notifications"
  aws_region    = local.region
  aws_account_id = local.account_id

  # No automatic email subscriptions - managed manually
  subscription_emails = []

  tags = {
    Component = "contact-notifications"
    Purpose   = "operator-alerts"
  }
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

  # IAMポリシーのプレースホルダー置換用変数（全サービス対応）
  policy_template_vars = {
    core_table_arn             = data.terraform_remote_state.datastore.outputs.core_table_arn
    chats_table_arn            = data.terraform_remote_state.datastore.outputs.chats_table_arn
    fruits_table_arn           = data.terraform_remote_state.datastore.outputs.fruits_table_arn
    feedback_table_arn         = data.terraform_remote_state.datastore.outputs.feedback_table_arn
    payments_table_arn         = data.terraform_remote_state.datastore.outputs.payments_table_arn
    sns_topic_arn              = module.contact_notifications.topic_arn
    contact_dlq_arn            = module.contact_notifications.dlq_arn
    ai_unified_model_id        = data.aws_ssm_parameter.ai_unified_model_id.value
    region                     = local.region
    account_id                 = local.account_id
    project_name               = local.project_name
    environment                = local.environment
    account_deletion_queue_arn = module.account_deletion_queue.queue_arn
  }
}

# Stripe Webhook Lambda Functions（外部化IAMポリシー使用）
module "stripe_webhook_functions" {
  source = "../../../modules/lambda/functions"

  for_each = local.stripe_webhook_services

  project_name = local.project_name
  environment  = local.environment
  service_name = each.key

  filename         = local.stripe_webhook_zip_paths[each.key]
  source_code_hash = filebase64sha256(local.stripe_webhook_zip_paths[each.key])

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

  tags = {
    Service   = each.key
    Component = "stripe-webhooks"
    EventType = split("-", each.key)[1] == "payment" ? "${split("-", each.key)[1]}-${split("-", each.key)[2]}" : "subscription-updated"
  }
}

# SQS Dead Letter Queue for EventBridge failed events
module "stripe_eventbridge_dlq" {
  source = "../../../modules/sqs"

  queue_name = "${local.project_name}-${local.environment}-stripe-eventbridge-dlq"
  
  # DLQ specific settings
  message_retention_seconds = 1209600  # 14 days
  visibility_timeout_seconds = 300     # 5 minutes
  enable_dlq = false                  # DLQ itself doesn't need another DLQ

  tags = {
    Component = "stripe-eventbridge"
    Purpose   = "dead-letter-queue"
  }
}

# ========================================
# Account Deletion SQS System
# ========================================

# SQS Queue for Account Deletion Tasks
module "account_deletion_queue" {
  source = "../../../modules/sqs"

  queue_name                 = "${local.project_name}-${local.environment}-account-deletion-queue"
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 20       # Long Polling
  visibility_timeout_seconds = 900      # 15 minutes (Lambda max timeout)
  enable_dlq                = true
  max_receive_count         = 3

  tags = {
    Component = "account-deletion"
    Purpose   = "async-data-cleanup"
  }
}

# Partner Event Source名とEventBus名を構築
locals {
  stripe_partner_event_source_name = "aws.partner/stripe.com/${var.stripe_partner_event_source_id}"
  stripe_event_bus_name            = "aws.partner/stripe.com/${var.stripe_partner_event_source_id}"
}

# EventBridge Rules & Targets（再利用可能モジュールで各イベント処理）
module "stripe_eventbridge_rules" {
  source = "../../../modules/eventbridge/rule"

  for_each = {
    payment-succeeded = {
      description = "Route Stripe invoice.payment_succeeded events to Lambda"
      event_pattern = jsonencode({
        source      = [local.stripe_partner_event_source_name]
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
        source      = [local.stripe_partner_event_source_name]
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
        source      = [local.stripe_partner_event_source_name]
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
  event_bus_name   = local.stripe_event_bus_name
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

  tags = {
    Component = "stripe-eventbridge"
    EventType = each.key
  }
}

# CloudWatch監視定義はoperationステートに移動済み
# 以下のリソースはoperation/main.tfで管理：
# - aws_cloudwatch_metric_alarm.eventbridge_failed_invocations
# - aws_cloudwatch_metric_alarm.stripe_dlq_messages

