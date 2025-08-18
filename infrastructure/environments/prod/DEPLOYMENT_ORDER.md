# Terraform Deployment Order and Dependencies

This document outlines the correct deployment order and dependency management for the Homebiyori infrastructure.

## Deployment Order

**CRITICAL:** Deploy environments in this exact order to avoid dependency issues:

1. **datastore** - Foundation layer (DynamoDB, S3, SQS)
2. **backend** - Application layer (Lambda, API Gateway, Cognito)  
3. **frontend** - Presentation layer (CloudFront, WAF)
4. **audit** - Security audit layer (CloudTrail, S3 audit logs) - **Optional but recommended**

## Remote State Dependencies

### datastore → No dependencies
- Foundation layer with no external state references
- Provides outputs used by backend and frontend layers

### backend → datastore 
- References datastore remote state for:
  - DynamoDB table ARNs and names
  - S3 bucket ARNs and names  
  - SQS queue ARNs and URLs
- Creates Lambda Layers (common and AI) for function dependencies
- Lambda functions reference created layer ARNs

### frontend → datastore + backend
- References datastore remote state for:
  - S3 bucket names for CloudFront origins
- References backend remote state for:
  - API Gateway URL for CloudFront behaviors

### audit → datastore + backend (optional references)
- References datastore remote state for:
  - DynamoDB table ARNs for audit targeting
- References backend remote state for:
  - Lambda function ARNs for audit targeting
- **Independent deployment**: Can be deployed separately without affecting other layers

## Circular Dependency Considerations

### Cognito Callback URLs
- **Problem:** Backend layer needs frontend CloudFront domain for Cognito callbacks, but frontend depends on backend API Gateway
- **Solution:** Use temporary hardcoded callback URLs in variables.tf for initial deployment
- **Post-Deployment:** Update Cognito callback URLs manually or via separate Terraform run after frontend deployment

### Commands for Post-Deployment Cognito Update

```bash
# After all layers are deployed, update Cognito callback URLs:
cd infrastructure/environments/prod/backend
terraform plan -var="callback_urls=[\"https://$(terraform -chdir=../frontend output -raw cloudfront_domain_name)\"]" -var="logout_urls=[\"https://$(terraform -chdir=../frontend output -raw cloudfront_domain_name)\"]"
terraform apply -var="callback_urls=[\"https://$(terraform -chdir=../frontend output -raw cloudfront_domain_name)\"]" -var="logout_urls=[\"https://$(terraform -chdir=../frontend output -raw cloudfront_domain_name)\"]"

## Terraform State Management

All environments use consistent S3 backend configuration:

- **S3 Bucket**: `prod-homebiyori-terraform-state`
- **Region**: `ap-northeast-1` 
- **DynamoDB Lock Table**: `prod-homebiyori-terraform-locks`
- **Encryption**: Enabled

### State File Locations:
```
prod-homebiyori-terraform-state/
├── datastore/terraform.tfstate    # Foundation layer
├── backend/terraform.tfstate      # Application layer  
├── frontend/terraform.tfstate     # Presentation layer
└── audit/terraform.tfstate        # Security audit layer (optional)
```
```

## File Organization

All remote state references are centralized in `data.tf` files within each environment for:
- Easy dependency tracking
- Clear separation of concerns  
- Simplified troubleshooting

## Validation Commands

Run these commands to verify all configurations are valid:

```bash
# Validate all environments
cd infrastructure/environments/prod/datastore && terraform validate
cd ../backend && terraform validate  
cd ../frontend && terraform validate
cd ../audit && terraform validate

## Lambda Layer Package Structure

Lambda layers should be packaged with the following structure:

```
common_layer.zip
└── python/
    ├── boto3/
    ├── pydantic/
    ├── requests/
    └── (other common packages)

ai_layer.zip
└── python/
    ├── langchain/
    ├── langchain-aws/
    └── (AI-specific packages)
```

### Package Creation Commands

```bash
# For common layer
mkdir -p python
pip install -r requirements-common.txt -t python/
zip -r common_layer.zip python/

# For AI layer  
mkdir -p python
pip install -r requirements-ai.txt -t python/
zip -r ai_layer.zip python/
```

## Lambda Layer Configuration

Layer creation is controlled by variables in `backend/variables.tf`:

- `create_common_layer` (default: true) - Creates common dependencies layer
- `create_ai_layer` (default: true) - Creates AI/ML dependencies layer  
- `common_layer_zip_path` - Path to common layer package
- `ai_layer_zip_path` - Path to AI layer package

If layer creation is disabled, specify existing layer ARNs:
- `common_layer_arn` - ARN of existing common layer
- `ai_layer_arn` - ARN of existing AI layer
```