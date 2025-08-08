# API Gateway Service Module

A reusable Terraform module for creating AWS API Gateway with Lambda service integrations following best practices.

## Features

- ✅ **Single Responsibility**: One API Gateway per module instance
- ✅ **Dynamic Service Configuration**: Support for multiple Lambda services via for_each
- ✅ **Cognito Integration**: Built-in support for Cognito User Pool authorization
- ✅ **CORS Support**: Configurable CORS for frontend integration
- ✅ **CloudWatch Logging**: Automatic access logging and monitoring
- ✅ **Proxy Integration**: Support for both direct and proxy ({proxy+}) integration
- ✅ **Input Validation**: Comprehensive validation for all variables
- ✅ **Auto Deployment**: Automatic redeployment on configuration changes

## Usage

### Basic Example

```hcl
module "user_api" {
  source = "./modules/api-gateway-service"
  
  project_name = "homebiyori"
  environment  = "prod"
  api_type     = "user"
  
  cognito_user_pool_arn = aws_cognito_user_pool.users.arn
  
  lambda_services = {
    health = {
      path_part             = "health"
      lambda_function_name  = "homebiyori-prod-health-check"
      lambda_invoke_arn     = aws_lambda_function.health.invoke_arn
      http_method          = "GET"
      require_auth         = false
      use_proxy           = false
      enable_cors         = true
    }
    users = {
      path_part             = "users"
      lambda_function_name  = "homebiyori-prod-user-service"
      lambda_invoke_arn     = aws_lambda_function.users.invoke_arn
      http_method          = "ANY"
      require_auth         = true
      use_proxy           = true
      enable_cors         = true
    }
  }
  
  tags = {
    Application = "homebiyori"
  }
}
```

### Advanced Example with Custom Configuration

```hcl
module "admin_api" {
  source = "./modules/api-gateway-service"
  
  project_name  = "homebiyori"
  environment   = "prod"
  api_type      = "admin"
  endpoint_type = "REGIONAL"
  
  cognito_user_pool_arn = aws_cognito_user_pool.admins.arn
  
  lambda_services = {
    admin = {
      path_part             = "admin"
      lambda_function_name  = "homebiyori-prod-admin-service"
      lambda_invoke_arn     = aws_lambda_function.admin.invoke_arn
      http_method          = "ANY"
      require_auth         = true
      use_proxy           = true
      enable_cors         = false
    }
  }
  
  # Custom logging configuration
  enable_detailed_logging = true
  log_retention_days      = 30
  cors_allow_origin       = "'https://admin.homebiyori.com'"
  
  # Custom access log format
  access_log_format = {
    requestId      = "$context.requestId"
    ip            = "$context.identity.sourceIp"
    caller        = "$context.identity.caller"
    user          = "$context.identity.user"
    requestTime   = "$context.requestTime"
    httpMethod    = "$context.httpMethod"
    resourcePath  = "$context.resourcePath"
    status        = "$context.status"
    protocol      = "$context.protocol"
    responseLength = "$context.responseLength"
  }
}
```

## Architecture

```
API Gateway
├── REST API
│   └── /api (root resource)
│       ├── /{service1} (dynamic resources)
│       │   └── /{proxy+} (optional proxy)
│       └── /{service2}
│           └── /{proxy+}
├── Cognito Authorizer (optional)
├── CloudWatch Logging
├── CORS Configuration
└── Lambda Permissions
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | The name of the project | `string` | n/a | yes |
| environment | The deployment environment | `string` | n/a | yes |
| api_type | The type of API (e.g., user, admin) | `string` | `"user"` | no |
| endpoint_type | The API Gateway endpoint type | `string` | `"REGIONAL"` | no |
| cognito_user_pool_arn | The ARN of the Cognito User Pool for authorization | `string` | `null` | no |
| lambda_services | Map of Lambda services and their configurations | `map(object)` | n/a | yes |
| cors_allow_origin | The CORS allow origin value | `string` | `"'*'"` | no |
| enable_detailed_logging | Enable detailed logging for API Gateway | `bool` | `false` | no |
| log_retention_days | The retention period for CloudWatch logs in days | `number` | `14` | no |
| tags | Additional tags to apply to all resources | `map(string)` | `{}` | no |

### lambda_services Object Structure

```hcl
lambda_services = {
  service_name = {
    path_part             = string  # URL path segment
    lambda_function_name  = string  # Lambda function name for permissions
    lambda_invoke_arn     = string  # Lambda invoke ARN for integration
    http_method          = string  # HTTP method (GET, POST, PUT, DELETE, ANY)
    require_auth         = bool    # Whether to require Cognito authentication
    use_proxy           = bool    # Whether to use {proxy+} integration
    enable_cors         = bool    # Whether to enable CORS for this service
  }
}
```

## Outputs

| Name | Description |
|------|-------------|
| rest_api_id | The ID of the REST API |
| rest_api_arn | The ARN of the REST API |
| execution_arn | The execution ARN of the REST API |
| invoke_url | The invoke URL for the API Gateway stage |
| stage_name | The name of the API Gateway stage |
| authorizer_id | The ID of the Cognito authorizer (if enabled) |
| cloudwatch_log_group_name | The name of the CloudWatch log group |
| service_resources | Map of service resources created |

## Best Practices Implemented

### 1. Single Responsibility Principle
- One API Gateway per module instance
- Each service is dynamically configured

### 2. Reusability
- Generic module suitable for multiple API types
- Configurable through variables

### 3. Security
- Cognito User Pool integration
- IAM least privilege for Lambda permissions
- HTTPS enforcement

### 4. Monitoring
- CloudWatch access logging
- Detailed execution logging (optional)
- Structured log format

### 5. Automation
- Automatic deployment triggers
- CORS preflight handling
- Lambda permission management

## Migration from Legacy API Gateway Module

### Before (Legacy)
```hcl
module "api_gateway" {
  source = "./modules/api-gateway"
  # Large monolithic configuration
}
```

### After (Best Practice)
```hcl
module "user_api" {
  source = "./modules/api-gateway-service"
  api_type = "user"
  lambda_services = { ... }
}

module "admin_api" {
  source = "./modules/api-gateway-service"
  api_type = "admin"
  lambda_services = { ... }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |

## Providers

| Name | Version |
|------|---------|
| aws | >= 5.0 |

## Resources Created

- `aws_api_gateway_rest_api` - The REST API
- `aws_api_gateway_authorizer` - Cognito authorizer (optional)
- `aws_api_gateway_resource` - API resources and proxy resources
- `aws_api_gateway_method` - HTTP methods for services and CORS
- `aws_api_gateway_integration` - Lambda integrations and CORS integrations
- `aws_api_gateway_method_response` - CORS method responses
- `aws_api_gateway_integration_response` - CORS integration responses
- `aws_api_gateway_deployment` - API deployment
- `aws_api_gateway_stage` - API stage
- `aws_cloudwatch_log_group` - CloudWatch log group
- `aws_iam_role` - IAM role for CloudWatch logging
- `aws_iam_role_policy_attachment` - IAM policy attachment
- `aws_api_gateway_account` - API Gateway account configuration
- `aws_lambda_permission` - Lambda permissions for API Gateway

## Examples

See the `examples/` directory for complete usage examples including:
- Basic user API setup
- Admin API with custom authentication
- Multi-service microservices architecture
- CORS configuration for frontend integration