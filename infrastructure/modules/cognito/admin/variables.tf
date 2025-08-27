variable "project_name" {
  description = "Name of the project"
  type        = string
  
  validation {
    condition     = length(var.project_name) > 0 && length(var.project_name) <= 50
    error_message = "Project name must be between 1-50 characters."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "additional_tags" {
  description = "Additional tags to apply to resources (default_tags handle basic tags)"
  type        = map(string)
  default     = {}
}

# No callback/logout URLs needed for direct password authentication
# OAuth-related variables removed - admin uses direct login only

variable "enable_mfa" {
  description = "Enable MFA for admin users"
  type        = bool
  default     = true
}