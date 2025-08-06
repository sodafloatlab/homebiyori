# Lambda Layer Module

A reusable Terraform module for creating AWS Lambda Layers with consistent configuration and tagging.

## Usage

```hcl
module "common_layer" {
  source = "../../../modules/lambda-layer"

  project_name = "homebiyori"
  environment  = "prod"
  layer_name   = "common"
  layer_type   = "common"
  description  = "Common dependencies for Lambda functions"
  
  filename         = "common_layer.zip"
  source_code_hash = filebase64sha256("common_layer.zip")
  
  compatible_runtimes      = ["python3.11", "python3.12"]
  compatible_architectures = ["x86_64"]
  
  tags = {
    Component = "lambda-infrastructure"
  }
}
```

## Inputs

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `project_name` | Name of the project | `string` | - |
| `environment` | Environment name | `string` | - |
| `layer_name` | Name of the Lambda layer | `string` | - |
| `layer_type` | Type/purpose of the layer | `string` | `"common"` |
| `description` | Description of the Lambda layer | `string` | `""` |
| `filename` | Path to the layer deployment package | `string` | - |
| `source_code_hash` | SHA256 hash of the package file | `string` | `null` |
| `compatible_runtimes` | Compatible Lambda runtimes | `list(string)` | `["python3.11", "python3.12"]` |
| `compatible_architectures` | Compatible architectures | `list(string)` | `["x86_64"]` |
| `license_info` | License information | `string` | `"MIT"` |
| `tags` | Additional tags | `map(string)` | `{}` |

## Outputs

| Name | Description |
|------|-------------|
| `layer_arn` | ARN of the Lambda layer |
| `layer_version` | Version number of the layer |
| `layer_name` | Name of the Lambda layer |
| `source_code_hash` | SHA256 hash of the package |
| `source_code_size` | Size of the package in bytes |
| `compatible_runtimes` | Compatible runtimes list |
| `compatible_architectures` | Compatible architectures list |
| `created_date` | Layer creation date |

## Layer Types

- **common**: Shared dependencies across all Lambda functions
- **ai**: AI/ML specific dependencies (boto3 for Bedrock, langchain, etc.)
- **utilities**: Additional utility libraries

## Package Requirements

Layer packages should be structured as:
```
layer_package.zip
└── python/
    └── (your packages here)
```

For Python layers, ensure packages are installed with the correct target directory:
```bash
pip install -r requirements.txt -t python/
```