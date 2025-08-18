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

# S3バケット設定
variable "enable_mfa_delete" {
  description = "MFA削除保護を有効にするか（本番環境推奨）"
  type        = bool
  default     = false  # 初期設定では無効（rootユーザー+MFA必要のため）
}

variable "transition_to_ia_days" {
  description = "Standard-IAストレージクラスへの移行日数"
  type        = number
  default     = 30
}

variable "transition_to_glacier_days" {
  description = "Glacierストレージクラスへの移行日数"
  type        = number
  default     = 90
}

variable "transition_to_deep_archive_days" {
  description = "Deep Archiveストレージクラスへの移行日数"
  type        = number
  default     = 365
}

variable "noncurrent_version_expiration_days" {
  description = "古いバージョンの削除日数（監査要件：7年間）"
  type        = number
  default     = 2555  # 約7年
}

variable "bucket_size_alarm_threshold" {
  description = "バケットサイズアラームのしきい値（バイト）"
  type        = number
  default     = 107374182400  # 100GB
}

