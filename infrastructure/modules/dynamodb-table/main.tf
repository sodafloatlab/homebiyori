# Reusable DynamoDB Table Module
# Based on terraform-aws-modules/dynamodb-table best practices

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
  # Table naming
  table_name = "${var.project_name}-${var.environment}-${var.table_name}"
  
  # Default tags
  default_tags = {
    Name        = local.table_name
    Environment = var.environment
    Project     = var.project_name
    TableType   = var.table_type
    ManagedBy   = "terraform"
  }
  
  # Merged tags
  tags = merge(local.default_tags, var.tags)
  
  # GSI configuration
  global_secondary_indexes = var.global_secondary_indexes != null ? var.global_secondary_indexes : {}
  
  # LSI configuration  
  local_secondary_indexes = var.local_secondary_indexes != null ? var.local_secondary_indexes : {}
}

# DynamoDB Table
resource "aws_dynamodb_table" "this" {
  name         = local.table_name
  billing_mode = var.billing_mode
  hash_key     = var.hash_key
  range_key    = var.range_key

  # Provisioned throughput (only for PROVISIONED billing mode)
  read_capacity  = var.billing_mode == "PROVISIONED" ? var.read_capacity : null
  write_capacity = var.billing_mode == "PROVISIONED" ? var.write_capacity : null

  # Table attributes
  dynamic "attribute" {
    for_each = var.attributes
    
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  # Global Secondary Indexes
  dynamic "global_secondary_index" {
    for_each = local.global_secondary_indexes
    
    content {
      name     = global_secondary_index.key
      hash_key = global_secondary_index.value.hash_key
      range_key = lookup(global_secondary_index.value, "range_key", null)
      projection_type = lookup(global_secondary_index.value, "projection_type", "ALL")
      non_key_attributes = lookup(global_secondary_index.value, "non_key_attributes", null)
      
      read_capacity  = var.billing_mode == "PROVISIONED" ? lookup(global_secondary_index.value, "read_capacity", var.read_capacity) : null
      write_capacity = var.billing_mode == "PROVISIONED" ? lookup(global_secondary_index.value, "write_capacity", var.write_capacity) : null
    }
  }

  # Local Secondary Indexes
  dynamic "local_secondary_index" {
    for_each = local.local_secondary_indexes
    
    content {
      name            = local_secondary_index.key
      range_key       = local_secondary_index.value.range_key
      projection_type = lookup(local_secondary_index.value, "projection_type", "ALL")
      non_key_attributes = lookup(local_secondary_index.value, "non_key_attributes", null)
    }
  }

  # TTL configuration
  dynamic "ttl" {
    for_each = var.ttl_enabled ? [1] : []
    
    content {
      attribute_name = var.ttl_attribute_name
      enabled        = var.ttl_enabled
    }
  }

  # Point-in-time recovery
  dynamic "point_in_time_recovery" {
    for_each = var.point_in_time_recovery_enabled ? [1] : []
    
    content {
      enabled = var.point_in_time_recovery_enabled
    }
  }

  # Server-side encryption
  server_side_encryption {
    enabled = var.server_side_encryption_enabled
  }

  # Stream configuration
  stream_enabled   = var.stream_enabled
  stream_view_type = var.stream_enabled ? var.stream_view_type : null

  # Deletion protection
  deletion_protection_enabled = var.deletion_protection_enabled

  # Table class
  table_class = var.table_class

  tags = local.tags
}

# Auto Scaling (for PROVISIONED billing mode)
resource "aws_appautoscaling_target" "table_read" {
  count = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? 1 : 0
  
  max_capacity       = var.autoscaling_read.max_capacity
  min_capacity       = var.autoscaling_read.min_capacity
  resource_id        = "table/${aws_dynamodb_table.this.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_target" "table_write" {
  count = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? 1 : 0
  
  max_capacity       = var.autoscaling_write.max_capacity
  min_capacity       = var.autoscaling_write.min_capacity
  resource_id        = "table/${aws_dynamodb_table.this.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

# Auto Scaling Policies
resource "aws_appautoscaling_policy" "table_read" {
  count = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? 1 : 0
  
  name               = "${local.table_name}-read-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.table_read[0].resource_id
  scalable_dimension = aws_appautoscaling_target.table_read[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.table_read[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = var.autoscaling_read.target_value
  }
}

resource "aws_appautoscaling_policy" "table_write" {
  count = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? 1 : 0
  
  name               = "${local.table_name}-write-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.table_write[0].resource_id
  scalable_dimension = aws_appautoscaling_target.table_write[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.table_write[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = var.autoscaling_write.target_value
  }
}

# GSI Auto Scaling (for PROVISIONED billing mode)
resource "aws_appautoscaling_target" "gsi_read" {
  for_each = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? local.global_secondary_indexes : {}
  
  max_capacity       = lookup(each.value, "autoscaling_read_max_capacity", var.autoscaling_read.max_capacity)
  min_capacity       = lookup(each.value, "autoscaling_read_min_capacity", var.autoscaling_read.min_capacity)
  resource_id        = "table/${aws_dynamodb_table.this.name}/index/${each.key}"
  scalable_dimension = "dynamodb:index:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_target" "gsi_write" {
  for_each = var.billing_mode == "PROVISIONED" && var.autoscaling_enabled ? local.global_secondary_indexes : {}
  
  max_capacity       = lookup(each.value, "autoscaling_write_max_capacity", var.autoscaling_write.max_capacity)
  min_capacity       = lookup(each.value, "autoscaling_write_min_capacity", var.autoscaling_write.min_capacity)
  resource_id        = "table/${aws_dynamodb_table.this.name}/index/${each.key}"
  scalable_dimension = "dynamodb:index:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}