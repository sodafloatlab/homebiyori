# Homebiyori - Terraform Infrastructure

このディレクトリには、ほめびよりアプリケーションのAWSインフラストラクチャ設定が含まれています。

## アーキテクチャ概要

サーバーレス構成で以下のAWSサービスを使用：

- **API Gateway + Lambda**: RESTful API とビジネスロジック
- **DynamoDB**: ユーザーデータ、投稿メタデータ、統計情報
- **S3**: 静的アセット、画像、投稿コンテンツ
- **Cognito**: ユーザー認証（Google OAuth対応）
- **CloudFront + WAF**: CDN配信とセキュリティ
- **Amazon Bedrock**: AI褒めメッセージ生成

## ディレクトリ構造

```
terraform/
├── modules/              # 再利用可能なモジュール
│   ├── dynamodb/        # DynamoDBテーブル
│   ├── s3/              # S3バケット設定
│   ├── lambda/          # Lambda関数（IAMロール含む）
│   ├── api-gateway/     # API Gateway設定（IAMロール含む）
│   ├── cognito/         # 認証設定
│   ├── cloudfront/      # CDN設定（OAC含む）
│   ├── waf/             # WAFセキュリティ
│   └── bedrock/         # AI設定・監視
└── environments/
    └── prod/            # 本番環境
        ├── datastore/   # データレイヤー（DynamoDB）
        ├── backend/     # バックエンド（Lambda、API Gateway、Cognito、Bedrock）
        └── frontend/    # フロントエンド（S3、CloudFront、WAF）
```

## デプロイメント手順

### 前提条件

1. **AWS CLI設定**
   ```bash
   aws configure
   ```

2. **Terraform インストール** (バージョン >= 1.0)
   ```bash
   # macOS
   brew install terraform
   
   # Windows
   choco install terraform
   ```

3. **必要なAWS権限**
   - DynamoDB、S3、Lambda、API Gateway、Cognito、CloudFront、WAF、IAM、Bedrock の管理権限

### 初期セットアップ

#### 1. Terraformステート管理用リソースの手動作成

```bash
# S3バケット作成（Terraformステート保存用）
aws s3 mb s3://homebiyori-terraform-state --region ap-northeast-1

# S3バケットのバージョニング有効化
aws s3api put-bucket-versioning \
  --bucket homebiyori-terraform-state \
  --versioning-configuration Status=Enabled

# S3バケットの暗号化設定
aws s3api put-bucket-encryption \
  --bucket homebiyori-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# S3バケットのパブリックアクセス禁止
aws s3api put-public-access-block \
  --bucket homebiyori-terraform-state \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# DynamoDBテーブル作成（Terraformロック用）
aws dynamodb create-table \
  --table-name homebiyori-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --server-side-encryption Enabled=true \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1
```

#### 2. Amazon Bedrockモデルの有効化

AWS コンソールでAmazon Bedrockにアクセスし、Claude 3 Haikuモデルを有効化してください。

#### 3. Google OAuth設定（必要な場合）

Google Cloud Consoleで OAuth 2.0 認証情報を作成し、環境変数として設定：

```bash
export TF_VAR_google_client_id="your_google_client_id"
export TF_VAR_google_client_secret="your_google_client_secret"
```

### インフラストラクチャデプロイ

**重要**: 各レイヤーを順番にデプロイしてください。

#### 1. Datastore レイヤー（データ）

```bash
cd environments/prod/datastore
terraform init
terraform plan
terraform apply
```

#### 2. Backend レイヤー（バックエンド）

```bash
cd ../backend
terraform init
terraform plan
terraform apply
```

#### 3. Frontend レイヤー（フロントエンド）

```bash
cd ../frontend
terraform init
terraform plan
terraform apply
```

### Lambda デプロイメント

Lambda関数のコードは別途準備し、`lambda_function.zip`として配置してください：

```bash
# Lambda関数のパッケージ化例
cd /path/to/your/lambda/code
zip -r lambda_function.zip .
cp lambda_function.zip /path/to/terraform/
```

### 設定のカスタマイズ

#### カスタムドメインの設定

1. Route 53でドメインを管理
2. ACMで SSL証明書を取得（us-east-1リージョン）
3. `frontend/terraform.tfvars`でドメイン設定を有効化

```hcl
custom_domain = "homebiyori.yourdomain.com"
ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/your-cert-id"
```

#### メンテナンスモードの有効化

```hcl
maintenance_mode = true
maintenance_allowed_ips = [
  "203.0.113.1/32"  # 管理者IP
]
```

## コスト見積もり

**月間アクティブユーザー100名での想定コスト（月額）:**
- API Gateway: $0.52
- Lambda: $0.00（無料枠内）
- DynamoDB: $3.91
- S3: $0.038
- CloudFront: $0.86
- Cognito: $0.55
- Bedrock: $0.563
- WAF: $2.60

**合計: 約$9.04/月**

## 運用

### 監視

- CloudWatchダッシュボードでメトリクス監視
- WAFでセキュリティ監視
- Bedrockトークン使用量監視

### ログ

- API Gateway: CloudWatchログ
- Lambda: CloudWatchログ
- WAF: CloudWatchログ
- Bedrock: カスタムログ

### バックアップ

- DynamoDB: ポイントインタイム復旧有効
- S3: バージョニング有効

## トラブルシューティング

### よくある問題

1. **Bedrockモデルアクセスエラー**
   - AWS コンソールでモデルが有効化されているか確認

2. **Cognito OAuth エラー**
   - コールバックURLが正しく設定されているか確認
   - Google OAuth認証情報が正しいか確認

3. **CloudFront配信エラー**
   - S3バケットポリシーが正しく設定されているか確認
   - OACが正しく設定されているか確認

### クリーンアップ

```bash
# 逆順で削除
cd environments/prod/frontend && terraform destroy
cd ../backend && terraform destroy
cd ../datastore && terraform destroy

# 手動作成したリソースも削除
aws s3 rm s3://homebiyori-terraform-state --recursive
aws s3 rb s3://homebiyori-terraform-state
aws dynamodb delete-table --table-name homebiyori-terraform-locks --region ap-northeast-1
```

## セキュリティ

- すべての通信はHTTPS
- WAFでDDoS防御
- IAM最小権限の原則
- S3バケットはプライベート
- DynamoDB暗号化有効

## サポート

問題が発生した場合は、以下の情報を含めて報告してください：

1. 実行したTerraformコマンド
2. エラーメッセージ
3. 関連するCloudWatchログ
4. AWS環境情報