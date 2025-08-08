# Data sources for Operation Layer
# References to datastore and backend remote states

# AWS Account and Region information
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Datastore remote state - access to S3 logs bucket
data "terraform_remote_state" "datastore" {
  backend = "s3"
  config = {
    bucket = "prod-homebiyori-terraform-state"
    key    = "datastore/terraform.tfstate"
    region = "ap-northeast-1"
  }
}

# Backend remote state - access to Lambda function information
data "terraform_remote_state" "backend" {
  backend = "s3"
  config = {
    bucket = "prod-homebiyori-terraform-state"
    key    = "backend/terraform.tfstate"
    region = "ap-northeast-1"
  }
}