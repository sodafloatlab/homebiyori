# Homebiyori Terraform 環境変数管理ガイド

## 概要

このドキュメントでは、Homebiyori プロジェクトにおける Terraform を使用した環境変数管理について説明します。

## ファイル構成

```
homebiyori/
├── terraform_variables.tf      # Terraform変数定義
├── terraform.tfvars.example    # 設定例ファイル
└── TERRAFORM_GUIDE.md          # このガイド
```

## 設定手順

### 1. 設定ファイルの準備

```bash
# サンプルファイルをコピー
cp terraform.tfvars.example terraform.tfvars

# 機密情報を適切に設定
vi terraform.tfvars
```

### 2. 環境別設定

#### 本番環境 (prod)
```hcl
environment = "prod"
dynamodb_table_prefix = "prod-homebiyori"
enable_debug_logging = false
enable_docs = false
log_level = "INFO"
```

#### ステージング環境 (staging)
```hcl
environment = "staging"
dynamodb_table_prefix = "staging-homebiyori"
enable_debug_logging = false
enable_docs = true
log_level = "INFO"
```

#### 開発環境 (dev)
```hcl
environment = "dev"
dynamodb_table_prefix = "dev-homebiyori"
enable_debug_logging = true
enable_docs = true
log_level = "DEBUG"
```

## Lambda サービス別環境変数

### 全サービス共通
- `ENVIRONMENT`: デプロイ環境
- `AWS_DEFAULT_REGION`: AWSリージョン
- `LOG_LEVEL`: ログレベル
- `PROJECT_NAME`: プロジェクト名

### health_check_service
- `SERVICE_NAME`: サービス名

### user_service / chat_service / tree_service
- `SERVICE_NAME`: サービス名
- `DYNAMODB_TABLE`: 使用するDynamoDBテーブル名
- `DYNAMODB_TABLE_NAME`: DynamoDBテーブル名（共通Layerとの互換性）

### webhook_service
- `SERVICE_NAME`: サービス名
- `DYNAMODB_TABLE`: サブスクリプションテーブル名
- `STRIPE_API_KEY`: Stripe APIキー（機密）
- `STRIPE_WEBHOOK_SECRET`: Webhook署名検証キー（機密）
- `TTL_UPDATE_QUEUE_URL`: SQSキューURL
- `INTERNAL_API_BASE_URL`: 内部API URL
- `INTERNAL_API_KEY`: 内部API認証キー（機密）
- `ENABLE_WEBHOOK_VALIDATION`: Webhook署名検証フラグ

### notification_service
- `SERVICE_NAME`: サービス名
- `DYNAMODB_TABLE`: 通知テーブル名
- `INTERNAL_API_KEY`: 内部API認証キー（機密）
- `ADMIN_API_KEY`: 管理者API認証キー（機密）
- `DEFAULT_NOTIFICATION_TTL_DAYS`: 通知TTL日数
- `MAX_NOTIFICATIONS_PER_USER`: ユーザー最大通知数
- `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE`: ページサイズ設定
- `ENABLE_ADMIN_NOTIFICATIONS`: 管理者通知有効化フラグ
- `ENABLE_BATCH_OPERATIONS`: バッチ操作有効化フラグ

### ttl_updater_service
- `SERVICE_NAME`: サービス名
- `DYNAMODB_TABLE`: チャットテーブル名
- `DYNAMODB_TABLE_NAME`: チャットテーブル名（共通Layerとの互換性）

## 機密情報管理

### AWS Systems Manager Parameter Store 推奨
```hcl
# 機密情報はParameter Storeから取得
variable "stripe_api_key" {
  description = "Stripe API Key from Parameter Store"
  type        = string
  default     = ""
}

data "aws_ssm_parameter" "stripe_api_key" {
  name = "/homebiyori/${var.environment}/stripe/api_key"
}
```

### 環境変数からの注入
```bash
# CI/CDパイプラインでの使用例
export TF_VAR_stripe_api_key="${STRIPE_API_KEY}"
export TF_VAR_internal_api_key="${INTERNAL_API_KEY}"
terraform apply -var-file="terraform.tfvars"
```

## 使用例

### Terraform モジュールでの環境変数設定

```hcl
# Lambda関数定義例
resource "aws_lambda_function" "webhook_service" {
  function_name = "${var.project_name}-${var.environment}-webhook-service"
  
  environment {
    variables = local.webhook_service_environment_variables
  }
  
  # その他の設定...
}

# API Gateway統合例
resource "aws_api_gateway_deployment" "api" {
  variables = {
    environment = var.environment
    cors_origins = join(",", var.cors_allowed_origins)
  }
}
```

### 出力値の利用

```hcl
# 他のモジュールで環境変数を参照
module "lambda_functions" {
  source = "./modules/lambda"
  
  # 環境変数マッピングを渡す
  environment_variables = module.environment_config.lambda_environment_variables
  
  # DynamoDBテーブル名を渡す
  dynamodb_tables = module.environment_config.dynamodb_table_names
}
```

## セキュリティベストプラクティス

### 1. 機密情報の取り扱い
- `terraform.tfvars` をバージョン管理に含めない
- 機密情報は AWS Systems Manager Parameter Store または AWS Secrets Manager を使用
- CI/CD パイプラインでは環境変数として注入

### 2. 権限設定
```hcl
# Lambda実行ロールに必要最小限の権限を付与
data "aws_iam_policy_document" "lambda_policy" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query"
    ]
    resources = [
      "arn:aws:dynamodb:${var.aws_region}:*:table/${var.dynamodb_users_table}",
      "arn:aws:dynamodb:${var.aws_region}:*:table/${var.dynamodb_chats_table}"
    ]
  }
}
```

### 3. 環境分離
```bash
# 環境別のTerraformワークスペースを使用
terraform workspace new prod
terraform workspace new staging
terraform workspace new dev

# 環境別の設定ファイルを管理
terraform.tfvars.prod
terraform.tfvars.staging
terraform.tfvars.dev
```

## トラブルシューティング

### 1. 環境変数が反映されない

**症状**: Lambda関数で環境変数が取得できない

**解決方法**:
```bash
# Terraform planで環境変数を確認
terraform plan -var-file="terraform.tfvars"

# Lambda関数の環境変数を直接確認
aws lambda get-function-configuration --function-name homebiyori-prod-webhook-service
```

### 2. 機密情報のエラー

**症状**: Stripe APIキーなどの機密情報でエラー

**解決方法**:
```bash
# Parameter Storeの値を確認
aws ssm get-parameter --name "/homebiyori/prod/stripe/api_key" --with-decryption

# Terraform実行時に機密情報を環境変数で注入
TF_VAR_stripe_api_key="sk_live_xxx" terraform apply
```

### 3. DynamoDBテーブル名の不整合

**症状**: Lambda Layersとテーブル名が一致しない

**解決方法**:
```hcl
# 複数の環境変数名で同じ値を設定
locals {
  user_service_environment_variables = {
    DYNAMODB_TABLE      = var.dynamodb_users_table  # 新形式
    DYNAMODB_TABLE_NAME = var.dynamodb_users_table  # 旧形式（互換性）
  }
}
```

## 継続的インテグレーション

### GitHub Actions 例

```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
          
      - name: Deploy infrastructure
        env:
          TF_VAR_stripe_api_key: ${{ secrets.STRIPE_API_KEY }}
          TF_VAR_internal_api_key: ${{ secrets.INTERNAL_API_KEY }}
          TF_VAR_admin_api_key: ${{ secrets.ADMIN_API_KEY }}
        run: |
          terraform init
          terraform plan -var-file="terraform.tfvars.prod"
          terraform apply -auto-approve -var-file="terraform.tfvars.prod"
```

## まとめ

この設定により、以下が実現されます：

1. **環境別デプロイ**: dev/staging/prod 環境の簡単な切り替え
2. **機密情報管理**: Parameter Store 統合とセキュアな管理
3. **一元管理**: 全Lambda関数の環境変数を一箇所で管理
4. **型安全性**: Terraform による設定値検証
5. **CI/CD統合**: 自動デプロイパイプラインとの連携

tfvars ファイルを通じて、main.tf を変更することなく柔軟な環境設定が可能になります。