# 外部パラメータ設計書 - Parameter Store設定管理

## 概要

Homebiyoriプロジェクトでは、機密情報の管理とシステム動的制御のためにAWS Systems Manager Parameter Storeを活用しています。この設計書では、Parameter Storeで管理する全パラメータの登録内容、参照パターン、運用方法について詳述します。

## Parameter Store定義状況

### ✅ Terraform完全管理 (infrastructure/modules/parameter-store/main.tf)

**Stripe API設定** - backend/data.tfで参照
- `/{environment}/homebiyori/stripe/api_key` (SecureString) 
- `/{environment}/homebiyori/stripe/webhook_secret` (SecureString)
- `/{environment}/homebiyori/stripe/webhook_endpoint_secret` (SecureString)

**メンテナンス制御** - ignore_changes設定済み
- `/{environment}/homebiyori/maintenance/enabled` (String)
- `/{environment}/homebiyori/maintenance/message` (String)
- `/{environment}/homebiyori/maintenance/start_time` (String)
- `/{environment}/homebiyori/maintenance/end_time` (String)

**セキュリティ認証** - ignore_changes設定済み
- `/{environment}/homebiyori/internal/api_key` (SecureString)
- `/{environment}/homebiyori/admin/api_key` (SecureString)

**システム設定**
- `/{environment}/homebiyori/app/version` (String)
- `/{environment}/homebiyori/features/flags` (String - JSON)
- `/{environment}/homebiyori/ai/model_config` (String - JSON) 
- `/{environment}/homebiyori/tree/growth_thresholds` (String - JSON)
- `/{environment}/homebiyori/security/rate_limits` (String - JSON)

### 🚫 削除済み
- ~~`/{environment}/homebiyori/contact/sns_topic_arn`~~ → Terraform環境変数`SNS_TOPIC_ARN`に変更

### 環境変数経由参照（推奨）
```python
# Stripe APIキー取得例
stripe_api_key_param = os.getenv("STRIPE_API_KEY_PARAMETER")
stripe.api_key = get_parameter_store_value(stripe_api_key_param)
```

### 直接パラメータ指定
```python
# メンテナンス設定取得例
environment = os.getenv("ENVIRONMENT", "prod")
enabled = get_parameter_store_value(f"/{environment}/homebiyori/maintenance/enabled")
```

### 共通取得関数
```python
def get_parameter_store_value(parameter_name: str) -> str:
    ssm_client = boto3.client('ssm')
    response = ssm_client.get_parameter(Name=parameter_name, WithDecryption=True)
    return response['Parameter']['Value']
```

## 主要サービスでの使用例

| サービス | 使用パラメータ | 用途 |
|----------|----------------|------|
| **billing-service** | `stripe/api_key`, `stripe/webhook_secret` | 決済処理 |
| **webhook-service** | `stripe/*`, `internal/api_key` | Webhook受信・認証 |
| **admin-service** | `maintenance/*`, `admin/api_key` | メンテナンス制御・管理機能 |
| **contact-service** | なし | SNSはTerraform環境変数使用 |
| **全サービス** | `maintenance/enabled`, `maintenance/message` | メンテナンスミドルウェア |

## セキュリティ・権限設定

- **SecureString**: Stripe API、認証キー等の機密情報（KMS暗号化）
- **String**: メンテナンス設定、機能フラグ等の一般情報
- **IAM権限**: `ssm:GetParameter` + `kms:Decrypt` でリソース制限
- **ignore_changes**: 運用時変更パラメータはTerraform上書き防止

## 運用コマンド例

### メンテナンスモード制御
```bash
# 緊急メンテナンス開始
aws ssm put-parameter --name "/{environment}/homebiyori/maintenance/enabled" --value "true" --overwrite
aws ssm put-parameter --name "/{environment}/homebiyori/maintenance/message" --value "緊急メンテナンス実施中" --overwrite

# メンテナンス終了
aws ssm put-parameter --name "/{environment}/homebiyori/maintenance/enabled" --value "false" --overwrite
```

### APIキー更新
```bash
# Stripe本番キー設定
aws ssm put-parameter --name "/prod/homebiyori/stripe/api_key" --value "sk_live_xxxxx" --type "SecureString" --overwrite

# 内部認証キー生成・設定
aws ssm put-parameter --name "/prod/homebiyori/internal/api_key" --value "$(openssl rand -hex 32)" --type "SecureString" --overwrite
```



## 次回作業項目

### ✅ 完了済み
- [x] infrastructure/modules/parameter-store/main.tfの環境識別子追加 
- [x] メンテナンス・セキュリティパラメータにignore_changes設定
- [x] 未定義パラメータ（internal/admin API key）の追加

### 🔄 デプロイ後の手動設定
```bash
# 1. 本番Stripeキー設定
aws ssm put-parameter --name "/prod/homebiyori/stripe/api_key" --value "sk_live_ACTUAL_KEY" --type "SecureString" --overwrite

# 2. 認証キー生成・設定  
aws ssm put-parameter --name "/prod/homebiyori/internal/api_key" --value "$(openssl rand -hex 32)" --type "SecureString" --overwrite
aws ssm put-parameter --name "/prod/homebiyori/admin/api_key" --value "$(openssl rand -hex 32)" --type "SecureString" --overwrite

# 3. 動作確認
aws ssm get-parameter --name "/prod/homebiyori/maintenance/enabled"
```

### 📋 運用時コマンド
```bash
# メンテナンスモード切替
aws ssm put-parameter --name "/prod/homebiyori/maintenance/enabled" --value "true/false" --overwrite

# APIキーローテーション
aws ssm put-parameter --name "/prod/homebiyori/internal/api_key" --value "$(openssl rand -hex 32)" --type "SecureString" --overwrite
```

---

**Parameter Store設計完了**: 全パラメータがTerraform管理下にあり、運用時動的変更に対応済み。環境分離とセキュリティが確保されたシステム設計となりました。