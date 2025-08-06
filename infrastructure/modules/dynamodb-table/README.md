# DynamoDB Table Module

A reusable Terraform module for creating AWS DynamoDB tables with best practices, auto-scaling, and comprehensive configuration options.

## Features

- ✅ **Flexible Schema**: Support for hash key, range key, GSI, and LSI
- ✅ **Billing Modes**: Both ON_DEMAND and PROVISIONED with auto-scaling
- ✅ **TTL Management**: Configurable Time-to-Live for cost optimization
- ✅ **Security**: Encryption at rest, point-in-time recovery
- ✅ **Monitoring**: DynamoDB Streams support for change tracking
- ✅ **Auto Scaling**: Intelligent read/write capacity scaling
- ✅ **Tagging**: Consistent resource tagging strategy

## Usage

### Basic Table (ON_DEMAND)

```hcl
module "users_table" {
  source = "../modules/dynamodb-table"

  project_name = "homebiyori"
  environment  = "prod"
  table_name   = "users"
  table_type   = "user-profiles"

  hash_key = "PK"
  range_key = "SK"

  attributes = [
    {
      name = "PK"
      type = "S"
    },
    {
      name = "SK"
      type = "S"
    }
  ]

  tags = {
    Privacy   = "GDPR-compliant"
    Retention = "Permanent"
  }
}
```

### Table with Global Secondary Index

```hcl
module "fruits_table" {
  source = "../modules/dynamodb-table"

  project_name = "homebiyori"
  environment  = "prod"
  table_name   = "fruits"
  table_type   = "fruit-information"

  hash_key  = "PK"
  range_key = "SK"

  attributes = [
    {
      name = "PK"
      type = "S"
    },
    {
      name = "SK"
      type = "S"
    },
    {
      name = "GSI1PK"
      type = "S"
    },
    {
      name = "GSI1SK"
      type = "S"
    }
  ]

  global_secondary_indexes = {
    GSI1 = {
      hash_key        = "GSI1PK"
      range_key       = "GSI1SK"
      projection_type = "ALL"
    }
  }

  tags = {
    Retention = "Permanent"
  }
}
```

### Table with TTL (Chat History)

```hcl
module "chats_table" {
  source = "../modules/dynamodb-table"

  project_name = "homebiyori"
  environment  = "prod"
  table_name   = "chats"
  table_type   = "chat-history"

  hash_key  = "PK"
  range_key = "SK"

  attributes = [
    {
      name = "PK"
      type = "S"
    },
    {
      name = "SK"
      type = "S"
    },
    {
      name = "GSI1PK"
      type = "S"
    },
    {
      name = "GSI1SK"
      type = "S"
    }
  ]

  global_secondary_indexes = {
    GSI1 = {
      hash_key        = "GSI1PK"
      range_key       = "GSI1SK"
      projection_type = "ALL"
    }
  }

  # TTL for automatic cleanup
  ttl_enabled        = true
  ttl_attribute_name = "TTL"

  tags = {
    TTLStrategy = "dynamic"
    Retention   = "plan-based"
  }
}
```

### Table with PROVISIONED billing and Auto Scaling

```hcl
module "high_traffic_table" {
  source = "../modules/dynamodb-table"

  project_name = "homebiyori"
  environment  = "prod"
  table_name   = "high-traffic"

  hash_key = "PK"

  attributes = [
    {
      name = "PK"
      type = "S"
    }
  ]

  billing_mode   = "PROVISIONED"
  read_capacity  = 100
  write_capacity = 100

  # Auto scaling configuration
  autoscaling_enabled = true
  autoscaling_read = {
    min_capacity = 100
    max_capacity = 1000
    target_value = 70
  }
  autoscaling_write = {
    min_capacity = 100
    max_capacity = 1000
    target_value = 70
  }
}
```

### Table with DynamoDB Streams

```hcl
module "events_table" {
  source = "../modules/dynamodb-table"

  project_name = "homebiyori"
  environment  = "prod"
  table_name   = "events"

  hash_key  = "PK"
  range_key = "SK"

  attributes = [
    {
      name = "PK"
      type = "S"
    },
    {
      name = "SK"
      type = "S"
    }
  ]

  # Enable DynamoDB Streams
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
}
```

## Input Variables

### Required Variables

| Name | Description | Type |
|------|-------------|------|
| `project_name` | The name of the project | `string` |
| `environment` | The deployment environment (dev/staging/prod) | `string` |
| `table_name` | The name of the DynamoDB table | `string` |
| `hash_key` | The hash key (partition key) for the table | `string` |
| `attributes` | List of table attributes | `list(object)` |

### Optional Variables

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `range_key` | The range key (sort key) for the table | `string` | `null` |
| `table_type` | The type of the table for categorization | `string` | `"general"` |
| `billing_mode` | Billing mode (ON_DEMAND/PROVISIONED) | `string` | `"ON_DEMAND"` |
| `ttl_enabled` | Whether TTL is enabled | `bool` | `false` |
| `point_in_time_recovery_enabled` | Whether PITR is enabled | `bool` | `true` |
| `server_side_encryption_enabled` | Whether SSE is enabled | `bool` | `true` |

For a complete list of variables, see [variables.tf](./variables.tf).

## Outputs

| Name | Description |
|------|-------------|
| `table_arn` | DynamoDB table ARN |
| `table_name` | DynamoDB table name |
| `table_stream_arn` | DynamoDB stream ARN (if enabled) |
| `global_secondary_index_arns` | GSI ARNs map |
| `billing_mode` | Table billing mode |

For a complete list of outputs, see [outputs.tf](./outputs.tf).

## Access Patterns

### Single Table Design Support

```hcl
# Example: Homebiyori 7-Table Architecture
# Each table optimized for specific access patterns

# 1. Users Table (Permanent)
# PK: "USER#{user_id}", SK: "PROFILE"

# 2. Subscriptions Table (Permanent)  
# PK: "USER#{user_id}", SK: "SUBSCRIPTION"

# 3. Trees Table (Permanent)
# PK: "USER#{user_id}", SK: "TREE"

# 4. Fruits Table (Permanent)
# PK: "USER#{user_id}", SK: "FRUIT#{timestamp}"
# GSI1: PK: "FRUIT#{user_id}", SK: "{timestamp}"

# 5. Chats Table (TTL Managed)
# PK: "USER#{user_id}", SK: "CHAT#{timestamp}" 
# GSI1: PK: "CHAT#{user_id}", SK: "{timestamp}"
# TTL: Dynamic based on subscription plan

# 6. Notifications Table (90d TTL)
# PK: "USER#{user_id}", SK: "NOTIFICATION#{timestamp}"
# GSI1: PK: "NOTIFICATION#{user_id}", SK: "{timestamp}"

# 7. Feedback Table (Permanent)
# PK: "FEEDBACK#{YYYY-MM}", SK: "CANCELLATION#{user_id}#{timestamp}"
```

## Best Practices

### 1. Schema Design
- Use composite keys for hierarchical data
- Design GSI for specific query patterns
- Minimize secondary index projections

### 2. Cost Optimization
- Choose ON_DEMAND for unpredictable workloads
- Use TTL for automatic data expiration
- Monitor and adjust provisioned capacity

### 3. Security
- Enable encryption at rest (default)
- Use point-in-time recovery for critical tables
- Implement proper IAM policies

### 4. Performance
- Use auto scaling for PROVISIONED tables
- Design efficient access patterns
- Monitor CloudWatch metrics

### 5. Monitoring
- Enable DynamoDB Streams for change tracking
- Set up CloudWatch alarms for throttling
- Use AWS X-Ray for request tracing

## Migration from Legacy DynamoDB Module

```hcl
# Before (legacy - single module, 7 tables)
module "dynamodb_tables" {
  source = "../modules/dynamodb"
  # All 7 tables in one module
}

# After (best practice - dedicated modules)
module "users_table" {
  source = "../modules/dynamodb-table"
  # Single table, focused configuration
}

module "chats_table" {
  source = "../modules/dynamodb-table" 
  # Single table, TTL-specific configuration
}
```

## Validation

- Environment validation (dev/staging/prod only)
- Table name format validation
- Attribute type validation (S/N/B)
- Billing mode validation
- Stream view type validation

## Dependencies

- AWS Provider >= 5.0
- Terraform >= 1.0

## License

MIT License - see [LICENSE](../../../LICENSE) for details.