variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "homebiyori"
}

# S3ライフサイクル設定
variable "transition_to_glacier_days" {
  description = "Glacierストレージクラスへの移行日数"
  type        = number
  default     = 90
}

variable "noncurrent_version_expiration_days" {
  description = "古いバージョンの削除日数（監査要件：7年間）"
  type        = number
  default     = 2555  # 約7年
}

# S3バケット削除保護設定
variable "enable_mfa_delete" {
  description = "S3バケットのMFA削除を有効にするか（本番環境ではtrue推奨）"
  type        = bool
  default     = false
}

