# Lambda Layer Module
# Reusable module for creating Lambda Layers with consistent configuration

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Local values for computed configurations
locals {
  # Layer naming
  layer_name = "${var.project_name}-${var.environment}-${var.layer_name}"
  
  # Default tags
  default_tags = {
    Name        = local.layer_name
    Environment = var.environment
    Project     = var.project_name
    LayerType   = var.layer_type
    ManagedBy   = "terraform"
  }
  
  # Merged tags
  tags = merge(local.default_tags, var.tags)
}

# Lambda Layer
resource "aws_lambda_layer_version" "this" {
  filename                 = var.filename
  layer_name              = local.layer_name
  description             = var.description
  source_code_hash        = var.source_code_hash
  
  compatible_runtimes     = var.compatible_runtimes
  compatible_architectures = var.compatible_architectures
  
  # License information
  license_info = var.license_info
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}