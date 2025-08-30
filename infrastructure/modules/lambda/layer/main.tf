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
  layer_name = "${var.environment}-${var.project_name}-${var.layer_name}"
  
  # Module-specific tags (merged with provider default_tags)
  tags = merge({
    Name        = local.layer_name
    LayerType   = var.layer_type
    Module      = "lambda-layer"
  }, var.tags)
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
  
  # Note: aws_lambda_layer_version doesn't support tags directly
  # Tags would typically be applied to resources that reference this layer
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}