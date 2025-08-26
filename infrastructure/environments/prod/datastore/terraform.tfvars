aws_region   = "ap-northeast-1"
environment  = "prod"
project_name = "homebiyori"

enable_point_in_time_recovery = true

# S3 Logs Bucket lifecycle configuration
logs_transition_to_glacier_days = 90   # 90 days to Glacier
logs_expiration_days           = 400  # 13 months retention

common_tags = {
  Project     = "homebiyori"
  Environment = "prod"
  ManagedBy   = "terraform"
  Description = "AI-powered parenting support application"
  Layer       = "datastore"
}