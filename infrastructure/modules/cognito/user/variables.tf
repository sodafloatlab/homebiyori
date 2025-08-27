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

variable "callback_urls" {
  description = "List of allowed callback URLs for OAuth"
  type        = list(string)
  default     = ["http://localhost:3000/auth/callback"]
  
  validation {
    condition     = length(var.callback_urls) > 0
    error_message = "At least one callback URL must be provided."
  }
}

variable "logout_urls" {
  description = "List of allowed logout URLs"
  type        = list(string)
  default     = ["http://localhost:3000"]
  
  validation {
    condition     = length(var.logout_urls) > 0
    error_message = "At least one logout URL must be provided."
  }
}

variable "enable_google_oauth" {
  description = "Enable Google OAuth integration"
  type        = bool
  default     = true
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
  sensitive   = true
  
  validation {
    condition     = var.enable_google_oauth ? length(var.google_client_id) > 0 : true
    error_message = "Google client ID is required when Google OAuth is enabled."
  }
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
  
  validation {
    condition     = var.enable_google_oauth ? length(var.google_client_secret) > 0 : true
    error_message = "Google client secret is required when Google OAuth is enabled."
  }
}