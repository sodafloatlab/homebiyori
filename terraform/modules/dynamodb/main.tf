# Users テーブル - ユーザープロフィール情報
resource "aws_dynamodb_table" "users" {
  name         = "${var.project_name}-${var.environment}-users"
  billing_mode = "ON_DEMAND"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name     = "email-index"
    hash_key = "email"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-users"
    Type = "users"
  })
}

# Chat テーブル - 統合チャット機能のメタデータ
resource "aws_dynamodb_table" "chat" {
  name         = "${var.project_name}-${var.environment}-chat"
  billing_mode = "ON_DEMAND"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "ai_role"
    type = "S"
  }

  global_secondary_index {
    name     = "session-index"
    hash_key = "session_id"
    range_key = "SK"
  }

  global_secondary_index {
    name     = "ai-role-index"
    hash_key = "ai_role"
    range_key = "SK"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-chat"
    Type = "chat"
  })
}

# Tree テーブル - 木の成長統計情報
resource "aws_dynamodb_table" "tree" {
  name         = "${var.project_name}-${var.environment}-tree"
  billing_mode = "ON_DEMAND"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-tree"
    Type = "tree-stats"
  })
}

# Fruits テーブル - 実の個別管理
resource "aws_dynamodb_table" "fruits" {
  name         = "${var.project_name}-${var.environment}-fruits"
  billing_mode = "ON_DEMAND"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "ai_role"
    type = "S"
  }

  attribute {
    name = "creation_date"
    type = "S"
  }

  global_secondary_index {
    name     = "ai-role-date-index"
    hash_key = "ai_role"
    range_key = "creation_date"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-fruits"
    Type = "fruits"
  })
}

# Children テーブル - 子供情報
resource "aws_dynamodb_table" "children" {
  name         = "${var.project_name}-${var.environment}-children"
  billing_mode = "ON_DEMAND"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-children"
    Type = "children"
  })
}