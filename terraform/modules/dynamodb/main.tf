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

# Posts テーブル - 投稿メタデータ（実際のコンテンツはS3）
resource "aws_dynamodb_table" "posts" {
  name         = "${var.project_name}-${var.environment}-posts"
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
    name = "post_type"
    type = "S"
  }

  global_secondary_index {
    name     = "post-type-index"
    hash_key = "post_type"
    range_key = "SK"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project_name}-${var.environment}-posts"
    Type = "posts"
  })
}

# Praises テーブル - AI褒めメッセージ履歴
resource "aws_dynamodb_table" "praises" {
  name         = "${var.project_name}-${var.environment}-praises"
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
    Name = "${var.project_name}-${var.environment}-praises"
    Type = "praises"
  })
}

# Stats テーブル - 統計情報（花畑レベル、マイルストーン等）
resource "aws_dynamodb_table" "stats" {
  name         = "${var.project_name}-${var.environment}-stats"
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
    Name = "${var.project_name}-${var.environment}-stats"
    Type = "stats"
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