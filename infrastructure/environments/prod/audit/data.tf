# 監査ログ環境データソース

# 現在のAWSアカウント情報
data "aws_caller_identity" "current" {}

# 現在のAWSリージョン情報
data "aws_region" "current" {}