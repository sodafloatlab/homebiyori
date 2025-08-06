# Lambda Layer Module Variables

# Basic configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., prod, staging, dev)"
  type        = string
}

variable "layer_name" {
  description = "Name of the Lambda layer (e.g., common, ai)"
  type        = string
}

variable "layer_type" {
  description = "Type/purpose of the layer (e.g., common, ai, utilities)"
  type        = string
  default     = "common"
}

variable "description" {
  description = "Description of the Lambda layer"
  type        = string
  default     = ""
}

# Lambda layer package configuration
variable "filename" {
  description = "Path to the Lambda layer deployment package (zip file)"
  type        = string
}

variable "source_code_hash" {
  description = "Base64-encoded SHA256 hash of the package file"
  type        = string
  default     = null
}

# Runtime and architecture compatibility
variable "compatible_runtimes" {
  description = "List of compatible Lambda runtimes"
  type        = list(string)
  default     = ["python3.11", "python3.12"]
}

variable "compatible_architectures" {
  description = "List of compatible instruction set architectures"
  type        = list(string)
  default     = ["x86_64"]
}

# Metadata
variable "license_info" {
  description = "License information for the layer"
  type        = string
  default     = "MIT"
}

# Tags
variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}