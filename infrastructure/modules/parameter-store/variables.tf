variable "tags" {
  description = "Tags to apply to all Parameter Store parameters"
  type        = map(string)
  default     = {}
}

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