# Remote State Data Sources for Frontend Environment  
# Centralizes all remote state references for dependency management

# Data sources to get information from other layers
data "terraform_remote_state" "backend" {
  backend = "s3"
  config = {
    bucket = "prod-homebiyori-terraform-state"
    key    = "backend/terraform.tfstate"
    region = var.aws_region
  }
}

data "terraform_remote_state" "datastore" {
  backend = "s3"
  config = {
    bucket = "prod-homebiyori-terraform-state" 
    key    = "datastore/terraform.tfstate"
    region = var.aws_region
  }
}