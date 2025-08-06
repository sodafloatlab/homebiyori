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

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# User Pool URLs
variable "user_callback_urls" {
  description = "List of allowed callback URLs for user OAuth"
  type        = list(string)
  default     = ["http://localhost:3000", "https://localhost:3000"]
}

variable "user_logout_urls" {
  description = "List of allowed logout URLs for users"
  type        = list(string)
  default     = ["http://localhost:3000", "https://localhost:3000"]
}

# Admin Pool URLs
variable "admin_callback_urls" {
  description = "List of allowed callback URLs for admin OAuth"
  type        = list(string)
  default     = ["http://localhost:3001/admin", "https://localhost:3001/admin"]
}

variable "admin_logout_urls" {
  description = "List of allowed logout URLs for admins"
  type        = list(string)
  default     = ["http://localhost:3001/admin", "https://localhost:3001/admin"]
}

variable "enable_google_oauth" {
  description = "Enable Google OAuth integration"
  type        = bool
  default     = false
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

variable "create_identity_pool" {
  description = "Create Cognito Identity Pool for temporary AWS credentials"
  type        = bool
  default     = false
}

# Admin-specific settings
variable "enable_admin_mfa" {
  description = "Enable MFA for admin users"
  type        = bool
  default     = true
}