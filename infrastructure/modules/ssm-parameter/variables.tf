# Tags are automatically applied via provider default_tags
# No need for explicit tags variable

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "homebiyori"
}

variable "environment" {
  description = "Environment (prod, staging, dev)"
  type        = string
  default     = "prod"
}