# Homebiyoriプロジェクト 手動構築手順書

**このドキュメントは、Terraformデプロイ前に必要な手動構築手順とその詳細を説明しています。**

## 📋 手動構築が必要な項目一覧

| 項目 | 種別 | 必要性 | Terraformとの関連 |
|------|------|--------|------------------|
| 1. Terraformステート用S3バケット・DynamoDB | AWS基盤 | 🔴 必須 | 全スタックの状態管理 |
| 2. Amazon Bedrockモデル有効化 | AWS設定 | 🔴 必須 | backend/bedrock |
| 3. Route53ホストゾーン・ドメイン | DNS | 🟡 推奨 | frontend/CloudFront |
| 4. ACM SSL証明書 | 証明書 | 🟡 推奨 | frontend/CloudFront |
| 5. Google OAuth設定 | 外部サービス | 🟡 推奨 | backend/Cognito |
| 6. Stripeアカウント・Webhook | 決済 | 🟡 推奨 | backend/Lambda |
| 7. Parameter Store設定 | 機密情報 | 🔴 必須 | backend/data.tf |
| 8. Lambda デプロイパッケージ準備 | アプリケーション | 🔴 必須 | backend/Lambda |

---

## 🏗️ 手順1: AWS基盤インフラ（Terraform前提条件）

### 1.1 Terraformステート管理用リソース

**作成が必要なリソース：**
```bash
# S3バケット (東京リージョン)
S3バケット名: prod-homebiyori-terraform-state
リージョン: ap-northeast-1
暗号化: 有効 (AES256)
バージョニング: 有効
パブリックアクセス: すべてブロック

# DynamoDBテーブル (状態ロック用)
テーブル名: prod-homebiyori-terraform-locks
パーティションキー: LockID (String)
課金モード: オンデマンド
暗号化: 有効
```

**作成手順：**
```bash
# AWS CLI設定確認
aws configure list
aws sts get-caller-identity

# S3バケット作成
aws s3 mb s3://prod-homebiyori-terraform-state --region ap-northeast-1

# S3バケット暗号化設定
aws s3api put-bucket-encryption \
  --bucket prod-homebiyori-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# S3バケット バージョニング有効
aws s3api put-bucket-versioning \
  --bucket prod-homebiyori-terraform-state \
  --versioning-configuration Status=Enabled

# S3バケット パブリックアクセスブロック
aws s3api put-public-access-block \
  --bucket prod-homebiyori-terraform-state \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# DynamoDBテーブル作成
aws dynamodb create-table \
  --table-name prod-homebiyori-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-1
```

### 1.2 Amazon Bedrock モデル有効化

**対象モデル：** `anthropic.claude-3-haiku-20240307-v1:0`

**手順：**
1. AWS Management Console → Amazon Bedrock
2. 左ペイン「Model access」→「Enable model access」
3. Anthropic → Claude 3 Haiku をチェック
4. 利用条件に同意して有効化

**確認コマンド：**
```bash
aws bedrock list-foundation-models \
  --region ap-northeast-1 \
  --query 'modelSummaries[?modelId==`anthropic.claude-3-haiku-20240307-v1:0`]'
```

---

## 🌐 手順2: ドメイン・SSL証明書（推奨）

### 2.1 Route53 ドメイン取得・設定

**必要な設定：**
```
メインドメイン: homebiyori.com
管理者ドメイン: admin.homebiyori.com
認証ドメイン: auth.homebiyori.com
```

**手順：**
1. Route53でドメイン購入または既存ドメイン移行
2. ホストゾーン作成・ネームサーバー設定
3. 必要に応じてサブドメイン用のCNAMEレコード予約

**Terraformとの関連：**
- `frontend/variables.tf`: `custom_domain = "homebiyori.com"`
- `backend/variables.tf`: `callback_urls`, `logout_urls`

### 2.2 ACM SSL証明書取得

**必要な証明書：**
```
プライマリ証明書: *.homebiyori.com
リージョン: us-east-1 (CloudFront用)
検証方法: DNS検証
```

**手順：**
1. AWS Certificate Manager (us-east-1) → 証明書のリクエスト
2. ワイルドカード証明書 `*.homebiyori.com` をリクエスト
3. DNS検証でRoute53にCNAMEレコード追加
4. 発行完了後、ARNを記録

**Terraformとの関連：**
- `frontend/variables.tf`: `ssl_certificate_arn = "arn:aws:acm:us-east-1:..."`

---

## 🔐 手順3: 外部サービス連携

### 3.1 Google OAuth設定

**Google Cloud Console設定：**
1. プロジェクト作成・選択
2. APIs & Services → OAuth consent screen → 外部ユーザー
3. OAuth クライアントID作成（Webアプリケーション）
4. 承認済みリダイレクトURI設定：
   ```
   https://homebiyori-prod-auth.auth.ap-northeast-1.amazoncognito.com/oauth2/idpresponse
   ```

**取得する情報：**
- Google Client ID
- Google Client Secret

**Terraformとの関連：**
- Parameter Store: `/homebiyori/prod/google/client_id`
- Parameter Store: `/homebiyori/prod/google/client_secret`
- `backend/variables.tf`: `enable_google_oauth = true`

### 3.2 Stripe設定

**Stripeダッシュボード設定：**
1. Stripeアカウント作成・本人確認
2. API Keys取得（公開可能キー・シークレットキー）
3. Webhook エンドポイント設定：
   ```
   エンドポイントURL: https://<api-gateway-id>.execute-api.ap-northeast-1.amazonaws.com/prod/webhook
   イベント: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
   ```

**取得する情報：**
- Stripe API Key (Secret)
- Stripe Webhook Secret
- Stripe Webhook Endpoint Secret

**Terraformとの関連：**
- Parameter Store経由でLambda環境変数に設定
- `backend/data.tf`: SSM Parameter参照

---

## 🔧 手順4: Parameter Store設定

### 4.1 必須パラメーター設定

**作成するパラメーター：**
```bash
# Stripe関連（必須）
aws ssm put-parameter \
  --name "/homebiyori/prod/stripe/api_key" \
  --value "sk_live_xxxxxxxxxxxxxxxx" \
  --type "SecureString" \
  --description "Stripe API Secret Key for prod environment"

aws ssm put-parameter \
  --name "/homebiyori/prod/stripe/webhook_secret" \
  --value "whsec_xxxxxxxxxxxxxxxx" \
  --type "SecureString" \
  --description "Stripe Webhook Secret for prod environment"

aws ssm put-parameter \
  --name "/homebiyori/prod/stripe/webhook_endpoint_secret" \
  --value "endpoint_secret_xxxxxxxx" \
  --type "SecureString" \
  --description "Stripe Webhook Endpoint Secret for prod environment"

# Google OAuth関連（推奨）
aws ssm put-parameter \
  --name "/homebiyori/prod/google/client_id" \
  --value "xxxxxxxx.googleusercontent.com" \
  --type "SecureString" \
  --description "Google OAuth Client ID for prod environment"

aws ssm put-parameter \
  --name "/homebiyori/prod/google/client_secret" \
  --value "GOCSPX-xxxxxxxxxxxxxxxx" \
  --type "SecureString" \
  --description "Google OAuth Client Secret for prod environment"
```

**Terraformとの関連：**
- `backend/data.tf`: `data "aws_ssm_parameter"` で参照
- Lambda環境変数として自動注入

---

## 📦 手順5: Lambda デプロイパッケージ準備

### 5.1 必要なZIPファイル

**アプリケーション Lambda（10個）：**
```
user_service.zip           - ユーザー管理サービス
chat_service.zip           - チャット・AI機能サービス  
tree_service.zip           - 木の成長管理サービス
health_check_service.zip   - ヘルスチェックサービス
webhook_service.zip        - Webhook処理サービス
notification_service.zip   - 通知サービス
ttl_updater_service.zip    - TTL更新サービス
billing_service.zip        - 決済管理サービス
admin_service.zip          - 管理画面サービス
contact_service.zip        - お問い合わせサービス
```

**Lambda Layer（1個）：**
```
common_layer.zip           - 共通依存関係
# ai_layer.zip廃止 - chat_service内でLangChain統合済み
```

### 5.2 Lambda Layer詳細パッケージング手順

**重要**: Lambda Layerは共通依存関係を提供し、個別Lambda関数のパッケージサイズを削減します。

#### **5.2.1 Common Layer作成（共通依存関係）**

**依存関係一覧（backend/layers/common/requirements.txt）：**
```
boto3==1.40.3             # AWS サービス連携
botocore==1.40.3          # boto3の低レベル実装  
fastapi==0.116.1          # メインWebフレームワーク
pydantic==2.11.7          # データバリデーション
mangum==0.19.0            # ASGI-Lambda間アダプター
structlog==25.4.0         # 構造化ログ出力
httpx==0.28.1             # 非同期HTTPクライアント
python-dateutil==2.8.2   # タイムゾーン対応
orjson==3.11.1            # 高速JSON処理
```

**パッケージング手順：**
```bash
# 1. 作業ディレクトリ準備
mkdir -p lambda_packages/common_layer/python
cd lambda_packages/common_layer

# 2. 既存の共通ライブラリコピー（Homebiyori固有）
cp -r ../../backend/layers/common/python/ .

# 3. 外部依存関係インストール
pip install -r ../../backend/layers/common/requirements.txt -t python/

# 4. Python バイトコード削除（サイズ最適化）
find python/ -name "*.pyc" -delete
find python/ -name "__pycache__" -type d -exec rm -rf {} +

# 5. ZIPパッケージ作成
zip -r ../common_layer.zip python/ -x "*.pyc" "*__pycache__*"

# 6. パッケージサイズ確認（50MB制限内か確認）
ls -lh ../common_layer.zip
```

#### **5.2.2 個別Lambda関数パッケージング**

**各サービス共通手順：**
```bash
# 例: User Serviceのパッケージング
cd backend/services/user_service

# 1. 依存関係確認（requirements.txtがある場合）
if [ -f requirements.txt ]; then
  pip install -r requirements.txt -t .
fi

# 2. ZIPパッケージ作成（不要ファイル除外）
zip -r ../../../user_service.zip . \
  -x "__pycache__/*" \
     "*.pyc" \
     "tests/*" \
     "*.pytest_cache/*" \
     "requirements.txt"

# 3. パッケージサイズ確認（50MB制限内か確認）
ls -lh ../../../user_service.zip
```

#### **5.2.4 自動化パッケージングスクリプト**

**scripts/package-lambda.sh の作成：**
```bash
#!/bin/bash
set -e

# カラーコード定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Lambda パッケージング自動化スクリプト${NC}"
echo "======================================"

# パッケージ作業ディレクトリ作成
mkdir -p lambda_packages
cd lambda_packages

# Lambda Layerパッケージング
echo -e "${YELLOW}🔧 Lambda Layerをパッケージング中...${NC}"

# Common Layer
echo "  📦 Common Layerを作成中..."
mkdir -p common_layer/python
cp -r ../backend/layers/common/python/* common_layer/python/
pip install -r ../backend/layers/common/requirements.txt -t common_layer/python/
find common_layer/python/ -name "*.pyc" -delete
find common_layer/python/ -name "__pycache__" -type d -exec rm -rf {} +
cd common_layer && zip -r ../common_layer.zip python/ -x "*.pyc" "*__pycache__*"
cd ..
echo "  ✅ Common Layer完了: $(ls -lh common_layer.zip | awk '{print $5}')"

# AI Layer  
echo "  🤖 AI Layerを作成中..."
# ai_layer廃止 - chat_service内でLangChain統合済み
echo "  ❌ AI Layer廃止: chat_service内のLangChain統合に変更"

# Lambda関数パッケージング
echo -e "${YELLOW}⚡ Lambda関数をパッケージング中...${NC}"

SERVICES=(
  "user_service"
  "chat_service" 
  "tree_service"
  "health_check_service"
  "webhook_service"
  "notification_service"
  "ttl_updater_service"
  "billing_service"
  "admin_service"
  "contact_service"
)

for service in "${SERVICES[@]}"; do
  echo "  📦 ${service}を作成中..."
  cd "../backend/services/${service}"
  
  # 個別依存関係があればインストール
  if [ -f requirements.txt ]; then
    pip install -r requirements.txt -t .
  fi
  
  # ZIPパッケージ作成
  zip -r "../../../lambda_packages/${service}.zip" . \
    -x "__pycache__/*" "*.pyc" "tests/*" "*.pytest_cache/*" "requirements.txt"
  
  cd "../../../lambda_packages"
  echo "    ✅ ${service}完了: $(ls -lh ${service}.zip | awk '{print $5}')"
done

echo ""
echo -e "${GREEN}🎉 全てのパッケージング完了！${NC}"
echo "======================================"
echo -e "${BLUE}作成されたパッケージ:${NC}"
ls -lh *.zip | awk '{printf "  📦 %-30s %s\n", $9, $5}'

echo ""
echo -e "${YELLOW}📝 次の手順:${NC}"
echo "1. Terraformのvariables.tfでZIPファイルパスを設定"
echo "2. terraform plan で設定確認" 
echo "3. terraform apply でデプロイ実行"
```

**実行手順：**
```bash
# スクリプトに実行権限付与
chmod +x scripts/package-lambda.sh

# パッケージング実行
./scripts/package-lambda.sh
```

**Terraformとの関連：**
- `backend/variables.tf`: 各ZIPファイルパス設定
- `backend/main.tf`: Lambda function・layer定義で参照

---

## 🎨 手順6: フロントエンドビルド・S3配置

### 6.1 Next.js静的エクスポート設定

**next.config.ts の設定更新：**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静的エクスポート設定（S3+CloudFront用）
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // 画像最適化無効化（静的エクスポート時）
  images: {
    unoptimized: true
  },
  
  // アセット配信設定
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://d123456789.cloudfront.net' // CloudFrontドメインに更新
    : '',
    
  // 環境変数設定
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
  }
};

export default nextConfig;
```

### 6.2 環境変数ファイル設定

**.env.local の作成：**
```bash
# API設定（Terraformデプロイ後に更新）
NEXT_PUBLIC_API_BASE_URL=https://YOUR_API_GATEWAY_ID.execute-api.ap-northeast-1.amazonaws.com/prod
NEXT_PUBLIC_AWS_REGION=ap-northeast-1

# Cognito設定（Terraformデプロイ後に更新）
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_COGNITO_DOMAIN=homebiyori-prod-auth

# CloudFront設定（Terraformデプロイ後に更新）
NEXT_PUBLIC_CDN_URL=https://d123456789.cloudfront.net

# 開発用設定
NEXT_PUBLIC_ENVIRONMENT=production
```

### 6.3 ビルド・デプロイスクリプト作成

**scripts/deploy-frontend.sh の作成：**
```bash
#!/bin/bash
set -e

# カラーコード定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# プロジェクト設定
PROJECT_NAME="homebiyori"
ENVIRONMENT="prod"
FRONTEND_DIR="frontend"

echo -e "${BLUE}📦 Homebiyori フロントエンド デプロイスクリプト${NC}"
echo "=================================="

# 前提条件チェック
echo -e "${YELLOW}🔍 前提条件をチェック中...${NC}"

# Terraformデプロイ確認
if ! terraform -chdir=infrastructure/environments/prod/datastore output static_bucket_name > /dev/null 2>&1; then
  echo -e "${RED}❌ エラー: datastore Terraformスタックがデプロイされていません${NC}"
  exit 1
fi

# Node.js環境確認
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ エラー: Node.jsがインストールされていません${NC}"
  exit 1
fi

# 必要な環境変数取得
echo -e "${YELLOW}🔗 Terraform出力から環境変数を取得中...${NC}"

STATIC_BUCKET=$(terraform -chdir=infrastructure/environments/prod/datastore output -raw static_bucket_name)
API_GATEWAY_URL=$(terraform -chdir=infrastructure/environments/prod/backend output -raw user_api_gateway_url 2>/dev/null || echo "")
USER_POOL_ID=$(terraform -chdir=infrastructure/environments/prod/backend output -raw user_pool_id 2>/dev/null || echo "")
USER_POOL_CLIENT_ID=$(terraform -chdir=infrastructure/environments/prod/backend output -raw user_pool_client_id 2>/dev/null || echo "")
CLOUDFRONT_DOMAIN=$(terraform -chdir=infrastructure/environments/prod/frontend output -raw cloudfront_domain_name 2>/dev/null || echo "")

echo "✅ Static Bucket: $STATIC_BUCKET"
echo "✅ API Gateway: $API_GATEWAY_URL"
echo "✅ Cognito Pool: $USER_POOL_ID"
echo "✅ CloudFront: $CLOUDFRONT_DOMAIN"

# 環境変数ファイル更新
echo -e "${YELLOW}🔧 環境変数ファイルを更新中...${NC}"
cd $FRONTEND_DIR

cat > .env.local << EOF
# 自動生成された環境変数ファイル
# Generated: $(date)

NEXT_PUBLIC_API_BASE_URL=$API_GATEWAY_URL
NEXT_PUBLIC_AWS_REGION=ap-northeast-1

NEXT_PUBLIC_COGNITO_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
NEXT_PUBLIC_COGNITO_DOMAIN=$PROJECT_NAME-$ENVIRONMENT-auth

NEXT_PUBLIC_CDN_URL=https://$CLOUDFRONT_DOMAIN
NEXT_PUBLIC_ENVIRONMENT=production
EOF

echo "✅ .env.local を更新しました"

# 依存関係インストール
echo -e "${YELLOW}📦 依存関係をインストール中...${NC}"
npm ci

# 型チェック
echo -e "${YELLOW}🔍 TypeScript型チェック実行中...${NC}"
npm run typecheck

# リンター実行
echo -e "${YELLOW}🔍 ESLint実行中...${NC}"
npm run lint

# ビルド実行
echo -e "${YELLOW}🏗️  Next.jsビルド実行中...${NC}"
npm run build

# S3への静的ファイル配置
echo -e "${YELLOW}📤 S3バケットに静的ファイルをアップロード中...${NC}"
aws s3 sync out/ s3://$STATIC_BUCKET/ --delete --exact-timestamps

# 画像ファイルの配置
if [ -d "public/images" ]; then
  echo -e "${YELLOW}🖼️  画像ファイルをimagesバケットにアップロード中...${NC}"
  IMAGES_BUCKET=$(terraform -chdir=../infrastructure/environments/prod/datastore output -raw images_bucket_name)
  aws s3 sync public/images/ s3://$IMAGES_BUCKET/images/ --exact-timestamps
  echo "✅ 画像ファイルをアップロードしました: $IMAGES_BUCKET"
fi

# CloudFrontキャッシュ無効化
if [ ! -z "$CLOUDFRONT_DOMAIN" ]; then
  echo -e "${YELLOW}🔄 CloudFrontキャッシュを無効化中...${NC}"
  DISTRIBUTION_ID=$(terraform -chdir=../infrastructure/environments/prod/frontend output -raw cloudfront_distribution_id 2>/dev/null || echo "")
  if [ ! -z "$DISTRIBUTION_ID" ]; then
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
    echo "✅ CloudFrontキャッシュを無効化しました"
  fi
fi

echo ""
echo -e "${GREEN}🎉 フロントエンドデプロイが完了しました！${NC}"
echo "=================================="
echo -e "🌐 Website URL: ${BLUE}https://$CLOUDFRONT_DOMAIN${NC}"
echo -e "📦 S3 Bucket: ${BLUE}$STATIC_BUCKET${NC}"
echo ""
echo -e "${YELLOW}📝 次の手順：${NC}"
echo "1. https://$CLOUDFRONT_DOMAIN にアクセスして動作確認"
echo "2. Cognito認証テスト"
echo "3. API連携テスト"
```

### 6.4 段階的デプロイ手順

**手動デプロイ手順（初回）：**
```bash
# 1. フロントエンドディレクトリに移動
cd frontend

# 2. 依存関係インストール
npm install

# 3. 環境変数設定（Terraformデプロイ前は仮設定）
cp .env.example .env.local
# API_GATEWAY_URL、COGNITO設定等を後で更新

# 4. 開発ビルドテスト
npm run build
npm run start  # 動作確認

# 5. 静的エクスポートビルド
npm run build  # output: 'export'設定で静的ファイル生成

# 6. S3バケット確認
aws s3 ls s3://homebiyori-prod-static/

# 7. 静的ファイル配置
aws s3 sync out/ s3://homebiyori-prod-static/ \
  --delete \
  --exact-timestamps \
  --acl private

# 8. CloudFrontキャッシュ無効化
aws cloudfront create-invalidation \
  --distribution-id E1234567890123 \
  --paths "/*"
```

### 6.5 継続的デプロイ（CD）設定

**GitHub Actions ワークフロー（.github/workflows/frontend-deploy.yml）：**
```yaml
name: Frontend Deploy

on:
  push:
    branches: [main]
    paths: ['frontend/**', '.github/workflows/frontend-deploy.yml']

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ap-northeast-1
    
    - name: Get Terraform outputs
      id: terraform
      run: |
        echo "static-bucket=$(terraform -chdir=infrastructure/environments/prod/datastore output -raw static_bucket_name)" >> $GITHUB_OUTPUT
        echo "api-url=$(terraform -chdir=infrastructure/environments/prod/backend output -raw user_api_gateway_url)" >> $GITHUB_OUTPUT
        echo "cognito-pool-id=$(terraform -chdir=infrastructure/environments/prod/backend output -raw user_pool_id)" >> $GITHUB_OUTPUT
        echo "cognito-client-id=$(terraform -chdir=infrastructure/environments/prod/backend output -raw user_pool_client_id)" >> $GITHUB_OUTPUT
    
    - name: Install dependencies
      working-directory: frontend
      run: npm ci
    
    - name: Create environment file
      working-directory: frontend
      run: |
        cat > .env.local << EOF
        NEXT_PUBLIC_API_BASE_URL=${{ steps.terraform.outputs.api-url }}
        NEXT_PUBLIC_AWS_REGION=ap-northeast-1
        NEXT_PUBLIC_COGNITO_USER_POOL_ID=${{ steps.terraform.outputs.cognito-pool-id }}
        NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=${{ steps.terraform.outputs.cognito-client-id }}
        NEXT_PUBLIC_COGNITO_DOMAIN=homebiyori-prod-auth
        NEXT_PUBLIC_ENVIRONMENT=production
        EOF
    
    - name: Run tests
      working-directory: frontend
      run: |
        npm run typecheck
        npm run lint
    
    - name: Build application
      working-directory: frontend
      run: npm run build
    
    - name: Deploy to S3
      working-directory: frontend
      run: |
        aws s3 sync out/ s3://${{ steps.terraform.outputs.static-bucket }}/ \
          --delete --exact-timestamps
    
    - name: Invalidate CloudFront
      run: |
        DISTRIBUTION_ID=$(terraform -chdir=infrastructure/environments/prod/frontend output -raw cloudfront_distribution_id)
        aws cloudfront create-invalidation \
          --distribution-id $DISTRIBUTION_ID \
          --paths "/*"
```

**Terraformとの関連：**
- `datastore/outputs.tf`: `static_bucket_name`, `images_bucket_name` 
- `backend/outputs.tf`: `user_api_gateway_url`, `user_pool_id`, `user_pool_client_id`
- `frontend/outputs.tf`: `cloudfront_domain_name`, `cloudfront_distribution_id`

---

## 🚀 手順7: デプロイ順序とチェックリスト

### 7.1 デプロイ前チェックリスト

**AWS基盤準備：**
- [ ] S3ステートバケット作成完了
- [ ] DynamoDBロックテーブル作成完了  
- [ ] Bedrockモデルアクセス有効化完了
- [ ] Parameter Store設定完了

**アプリケーション準備：**
- [ ] Lambda Layer パッケージ準備完了（common_layer.zip、ai_layer廃止）
- [ ] Lambda関数パッケージ準備完了（10個のサービス.zip）
- [ ] フロントエンドビルド設定完了
- [ ] Google OAuth設定完了（推奨）
- [ ] Stripe設定完了（推奨）

**ドメイン・SSL準備（推奨）：**
- [ ] Route53ドメイン・ホストゾーン設定完了
- [ ] ACM SSL証明書発行完了（us-east-1）

### 7.2 Terraformデプロイ順序

```bash
# 1. Datastore層（基盤）
cd infrastructure/environments/prod/datastore
terraform init
terraform plan
terraform apply

# 2. Backend層（アプリケーション）  
cd ../backend
terraform init
terraform plan
terraform apply

# 3. Operation層（ログ管理）
cd ../operation
terraform init  
terraform plan
terraform apply

# 4. Frontend層（配信）
cd ../frontend
terraform init
terraform plan  
terraform apply

# 5. フロントエンドアプリケーション配置
cd ../../../..
chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh
```

### 7.3 デプロイ後設定

**Cognito CallbackURL更新：**
```bash
# CloudFrontドメイン確定後の更新
cd infrastructure/environments/prod/backend
FRONTEND_DOMAIN=$(terraform -chdir=../frontend output -raw cloudfront_domain_name)
terraform plan -var="callback_urls=[\"https://${FRONTEND_DOMAIN}\"]"
terraform apply -var="callback_urls=[\"https://${FRONTEND_DOMAIN}\"]"
```

---

## 🔗 手動構築とTerraformリソースの関連性マップ

### 関連性マトリックス

| 手動構築項目 | 影響するTerraformリソース | ファイル場所 | 設定値 |
|------------|------------------------|------------|--------|
| **S3ステートバケット** | 全スタック | `*/providers.tf` | `bucket = "prod-homebiyori-terraform-state"` |
| **Bedrockモデル** | `module.bedrock` | `backend/main.tf` | `bedrock_model_id = "anthropic.claude-3-haiku-20240307-v1:0"` |
| **Route53ドメイン** | `module.cloudfront` | `frontend/variables.tf` | `custom_domain = "homebiyori.com"` |
| **ACM証明書** | `module.cloudfront` | `frontend/variables.tf` | `ssl_certificate_arn = "arn:aws:acm:..."` |
| **Google OAuth** | `module.cognito` | `backend/variables.tf` | `enable_google_oauth = true` |
| **Stripe API** | `data.aws_ssm_parameter` | `backend/data.tf` | Parameter Store参照 |
| **Lambda ZIPファイル** | `module.lambda_functions` | `backend/variables.tf` | `*_zip_path` variables |
| **フロントエンドビルド** | `module.s3` + `module.cloudfront` | `datastore/s3` + `frontend/cloudfront` | Next.js静的エクスポート → S3 → CloudFront |

### 依存関係フロー

```
手動構築(AWS基盤) → Terraform(datastore) → Terraform(backend) → Terraform(operation) → Terraform(frontend) → フロントエンド配置
        ↓                    ↓                      ↓                       ↓                    ↓                    ↓
   S3・DynamoDB        DynamoDB・S3         Lambda・Cognito        Logging・Firehose   CloudFront・WAF       Next.js→S3→CDN
   Parameter Store       SQS               API Gateway             Subscription           SSL証明書           環境変数統合
   Bedrockモデル                          外部連携                                                        キャッシュ無効化
```

---

## ⚠️ 重要な注意事項

### セキュリティ考慮事項
- Parameter Storeの機密情報は`SecureString`タイプで暗号化保存
- Google OAuth・Stripe認証情報の適切な管理
- S3バケットのパブリックアクセス完全ブロック

### コスト最適化
- DynamoDBオンデマンド課金モード採用
- CloudFront Price Class設定による配信コスト管理  
- Lambdaメモリ・タイムアウト設定の最適化

### 運用考慮事項
- Terraformステートファイルのバージョン管理
- Parameter Store値の定期ローテーション
- SSL証明書の更新監視（自動更新）

---

このドキュメントに従って手動構築を完了することで、Terraformによるインフラ自動構築の前提条件がすべて整います。