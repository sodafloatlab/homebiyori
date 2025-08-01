aws_region   = "ap-northeast-1"
environment  = "prod"
project_name = "homebiyori"

enable_point_in_time_recovery = true

common_tags = {
  Project     = "homebiyori"
  Environment = "prod"
  ManagedBy   = "terraform"
  Description = "AI-powered parenting support application"
  Layer       = "datastore"
}