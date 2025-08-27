# Lambda Function Module

A reusable Terraform module for creating AWS Lambda functions with best practices and standardized configurations.

## Features

- ✅ **Single Responsibility**: One Lambda function per module instance
- ✅ **IAM Best Practices**: Least privilege with service-specific policies
- ✅ **Environment Management**: Configurable environments with validation
- ✅ **Monitoring Ready**: Automatic CloudWatch log group creation
- ✅ **Event Driven**: Support for SQS, DynamoDB, and other event sources
- ✅ **Security**: Encryption, VPC support, and secure defaults
- ✅ **Tagging**: Consistent resource tagging strategy

## Usage

### Basic Lambda Function

```hcl
module "user_service" {
  source = "../modules/lambda-function"

  project_name = "homebiyori"
  environment  = "prod"
  service_name = "user-service"
  
  filename = "path/to/user-service.zip"
  handler  = "handler.lambda_handler"
  runtime  = "python3.13"
  
  timeout     = 30
  memory_size = 256
  
  environment_variables = {
    USERS_TABLE_NAME = "homebiyori-prod-users"
  }
}
```

### Lambda with Custom IAM Policy

```hcl
module "chat_service" {
  source = "../modules/lambda-function"

  project_name = "homebiyori"
  environment  = "prod"
  service_name = "chat-service"
  
  filename = "path/to/chat-service.zip"
  
  timeout     = 60
  memory_size = 512
  
  # Custom IAM policy for DynamoDB and Bedrock access
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
        Resource = "arn:aws:dynamodb:*:*:table/homebiyori-prod-*"
      },
      {
        Effect = "Allow"
        Action = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-haiku-*"
      }
    ]
  })
  
  environment_variables = {
    CHATS_TABLE_NAME   = "homebiyori-prod-chats"
    BEDROCK_MODEL_ID   = "anthropic.claude-3-haiku-20240307-v1:0"
  }
}
```

### Lambda with SQS Event Source

```hcl
module "ttl_updater_service" {
  source = "../modules/lambda-function"

  project_name = "homebiyori"
  environment  = "prod"
  service_name = "ttl-updater-service"
  
  filename = "path/to/ttl-updater.zip"
  
  timeout     = 300  # 5 minutes for batch processing
  memory_size = 512
  
  # SQS event source mapping
  event_source_mappings = {
    ttl_updates = {
      event_source_arn                   = "arn:aws:sqs:region:account:ttl-updates"
      batch_size                         = 10
      maximum_batching_window_in_seconds = 5
      function_response_types            = ["ReportBatchItemFailures"]
    }
  }
  
  environment_variables = {
    CHATS_TABLE_NAME = "homebiyori-prod-chats"
  }
}
```

### Lambda with API Gateway Integration

```hcl
module "health_check_service" {
  source = "../modules/lambda-function"

  project_name = "homebiyori"
  environment  = "prod"
  service_name = "health-check-service"
  
  filename = "path/to/health-check.zip"
  
  timeout     = 10
  memory_size = 128
  
  # API Gateway permission
  lambda_permissions = {
    api_gateway = {
      principal  = "apigateway.amazonaws.com"
      source_arn = "arn:aws:execute-api:region:account:api-id/*/*"
    }
  }
}
```

## Input Variables

### Required Variables

| Name | Description | Type |
|------|-------------|------|
| `project_name` | The name of the project | `string` |
| `environment` | The deployment environment (dev/staging/prod) | `string` |
| `service_name` | The name of the service | `string` |
| `filename` | Path to the Lambda deployment package | `string` |

### Optional Variables

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `handler` | Lambda handler function | `string` | `"handler.lambda_handler"` |
| `runtime` | Lambda runtime | `string` | `"python3.13"` |
| `timeout` | Timeout in seconds | `number` | `30` |
| `memory_size` | Memory size in MB | `number` | `256` |
| `layers` | Lambda Layer ARNs | `list(string)` | `[]` |
| `environment_variables` | Environment variables | `map(string)` | `{}` |
| `log_retention_days` | CloudWatch log retention | `number` | `30` |

For a complete list of variables, see [variables.tf](./variables.tf).

## Outputs

| Name | Description |
|------|-------------|
| `function_arn` | Lambda function ARN |
| `function_name` | Lambda function name |
| `iam_role_arn` | IAM role ARN |
| `log_group_name` | CloudWatch log group name |
| `invoke_arn` | ARN for API Gateway integration |

For a complete list of outputs, see [outputs.tf](./outputs.tf).

## Best Practices

### 1. IAM Security
- Each Lambda function gets its own dedicated IAM role
- Follows principle of least privilege
- Service-specific permissions only

### 2. Environment Variables
- Automatic injection of standard variables (ENVIRONMENT, PROJECT_NAME, SERVICE_TYPE)
- Support for custom environment variables
- Parameter Store integration for secrets

### 3. Monitoring & Logging
- Automatic CloudWatch log group creation
- Configurable log retention
- Structured tagging for cost allocation

### 4. Error Handling
- Dead letter queue support
- Batch failure reporting for SQS
- X-Ray tracing integration

### 5. Networking
- VPC configuration support
- Security group management
- Private subnet deployment

## Migration from Legacy Lambda Module

The legacy `lambda` module can be migrated by:

1. Replace single module instance with multiple `lambda-function` instances
2. Convert shared IAM policies to service-specific policies
3. Update variable references and outputs
4. Test each service independently

```hcl
# Before (legacy)
module "lambda_services" {
  source = "../modules/lambda"
  # 9 services in one module
}

# After (best practice)
module "user_service" {
  source = "../modules/lambda-function"
  # Single service, focused configuration
}

module "chat_service" {
  source = "../modules/lambda-function"
  # Single service, focused configuration
}
```

## Validation

- Environment validation (dev/staging/prod only)
- Service name format validation (lowercase, numbers, hyphens)
- Resource limit validation (timeout, memory)
- Runtime validation (supported AWS Lambda runtimes)

## Dependencies

- AWS Provider >= 5.0
- Terraform >= 1.0

## License

MIT License - see [LICENSE](../../../LICENSE) for details.