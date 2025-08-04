terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket  = "prod-homebiyori-terraform-state"
    key     = "backend/terraform.tfstate"
    region  = "ap-northeast-1"
    encrypt = true
    
    dynamodb_table = "prod-homebiyori-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "homebiyori"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}