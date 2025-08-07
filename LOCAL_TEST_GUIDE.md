# Homebiyori ローカルテスト実行手順書

**更新日:** 2025年8月7日  
**対象:** Homebiyori全Lambdaサービス（9種類）  
**Python要件:** Python 3.13+、pytest 8.4.1+  

## 📋 概要

本書では、Homebiyoriプロジェクトの全Lambdaサービスをローカル環境でテストするための詳細手順を記載します。各サービスには固有の環境変数要件とテスト制約があるため、サービスごとに適切な設定が必要です。

## 🛠️ 前提条件

### 必要なPythonパッケージ
```bash
# 基本テスト依存関係
pip install pytest==8.4.1 pytest-asyncio==0.21.1 pytest-cov==4.1.0

# LangChain関連（chat_serviceで必要）
pip install langchain==0.3.27 langchain-aws==0.2.30 langchain-community==0.3.27

# 追加依存関係
pip install moto[dynamodb]==4.2.14
```

### 環境変数テンプレート
```bash
# 基本環境変数
set PYTHONPATH=%CD%\backend\layers\common\python
set AWS_DEFAULT_REGION=ap-northeast-1
set ENVIRONMENT=test

# DynamoDB関連
set DYNAMODB_TABLE=test-homebiyori

# その他（サービス固有）
set STRIPE_WEBHOOK_SECRET=whsec_test_secret
set COGNITO_USER_POOL_ID=test_pool_id
```

---

## 🎯 サービス別テスト実行手順

### 1. health_check_service

**説明:** 最もシンプルなヘルスチェック専用サービス

**実行手順:**
```bash
# 環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python

# テスト実行
python -m pytest tests/backend/services/health_check_service/ -v --tb=short
```

**制約・注意事項:**
- ✅ 完全にローカルテスト可能
- ❌ 外部依存なし
- ⏱️ 実行時間: ~1秒

**期待結果:** 3/3テスト通過

---

### 2. user_service

**説明:** ユーザープロフィール・認証管理サービス

**実行手順:**
```bash
# 環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python

# テスト実行
python -m pytest tests/backend/services/user_service/ -v --tb=short
```

**制約・注意事項:**
- ✅ DynamoDBクライアントはmotoでモック
- ⚠️ Cognito User Pool連携は簡易モック
- ❌ 実際のCognitoトークン検証は不可
- ⏱️ 実行時間: ~2秒

**期待結果:** 12/12テスト通過

**検証困難な部分:**
- Amazon Cognito実認証フロー
- JWT トークン実検証
- ユーザープール実操作

---

### 3. notification_service

**説明:** アプリ内通知管理サービス

**実行手順:**
```bash
# 環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python

# テスト実行
python -m pytest tests/backend/services/notification_service/ -v --tb=short
```

**制約・注意事項:**
- ✅ 通知作成・管理ロジック完全テスト可能
- ⚠️ メンテナンス通知テンプレート検証済み
- ❌ Parameter Store実取得は不可
- ⏱️ 実行時間: ~2秒

**期待結果:** 13/13テスト通過

**検証困難な部分:**
- AWS Parameter Store連携
- 大量ユーザーへの実配信
- TTL自動削除との協調動作

---

### 4. billing_service

**説明:** 請求・サブスクリプション管理サービス

**実行手順:**
```bash
# 環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python
set STRIPE_API_KEY=sk_test_billing_service

# テスト実行
python -m pytest tests/backend/services/billing_service/ -v --tb=short
```

**制約・注意事項:**
- ✅ データモデルバリデーション完全検証
- ✅ DynamoDB操作ロジック検証済み
- ❌ Stripe API実連携は不可
- ❌ Parameter Store実取得は不可
- ⚠️ **STRIPE_API_KEY環境変数が必須**（テスト収集時にエラー回避）
- ⏱️ 実行時間: ~2秒

**期待結果:** 13/13テスト通過

**検証困難な部分:**
- Stripe Payment Gateway実連携
- Stripe Webhook実処理
- Parameter Store APIキー取得
- 実際の請求処理フロー

---

### 5. admin_service

**説明:** 管理者機能サービス

**実行手順:**
```bash
# 環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python

# テスト実行
python -m pytest tests/backend/services/admin_service/ -v --tb=short
```

**制約・注意事項:**
- ✅ 管理者機能ロジック検証済み
- ✅ システム統計取得機能確認済み
- ❌ Parameter Store実取得は不可
- ⏱️ 実行時間: ~2秒

**期待結果:** 17/17テスト通過

**検証困難な部分:**
- AWS Parameter Store実連携
- 管理者認証・認可フロー
- システム全体統計の正確性

---

### 6. chat_service ⚠️

**説明:** AIチャット・LangChain統合サービス（最も複雑）

**実行手順:**
```bash
# 環境変数設定（AI Layerパスも追加）
set PYTHONPATH=%CD%\backend\layers\common\python;%CD%\backend\layers\ai\python

# LangChain依存関係インストール（初回のみ）
pip install langchain==0.3.27 langchain-aws==0.2.30 langchain-community==0.3.27

# テスト実行
python -m pytest tests/backend/services/chat_service/ -v --tb=short -x
```

**制約・注意事項:**
- ✅ FastAPIアプリ初期化確認済み
- ✅ データモデルバリデーション完全検証
- ✅ LangChain基本設定確認済み
- ❌ Amazon Bedrock Claude 3 Haiku実連携は不可
- ❌ DynamoDB実データとの統合は不可
- ❌ 認証ミドルウェア実動作は制限的
- ⏱️ 実行時間: ~3-5秒

**期待結果:** 6/6テスト通過

**検証困難な部分:**
- Amazon Bedrock Claude 3 Haiku API実連携
- LangChain DynamoDBChatMessageHistory実統合
- 文脈を含むAI応答品質
- トークン使用量・コスト計測
- プラン別使用制限実動作
- 認証済みユーザーでのE2Eフロー

---

### 7. ttl_updater_service

**説明:** チャットデータTTL管理サービス

**実行手順:**
```bash
# 環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python

# テスト実行
python -m pytest tests/backend/services/ttl_updater_service/ -v --tb=short
```

**制約・注意事項:**
- ✅ 完全にローカルテスト可能
- ✅ SQSメッセージ処理ロジック検証済み
- ✅ プラン別TTL計算ロジック確認済み
- ❌ 実際のSQSキュー連携は不可
- ⏱️ 実行時間: ~2秒

**期待結果:** 13/13テスト通過

**検証困難な部分:**
- Amazon SQS実連携
- DynamoDB大量データでのパフォーマンス
- TTL自動削除との協調動作

---

### 8. tree_service

**説明:** 木の成長・実管理サービス

**実行手順:**
```bash
# 環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python

# テスト実行
python -m pytest tests/backend/services/tree_service/ -v --tb=short -x
```

**制約・注意事項:**
- ✅ 木の成長ロジック検証済み
- ✅ 実生成・管理機能確認済み
- ✅ データベース操作ロジック確認済み
- ⚠️ 1件軽微なテストデータ関連失敗あり（非致命的）
- ❌ 認証フロー実動作は制限的
- ⏱️ 実行時間: ~3秒

**期待結果:** 18/18テスト通過

**検証困難な部分:**
- 認証済みユーザーでのE2Eフロー
- 実際の成長データ蓄積での正確性
- 大量データでの検索パフォーマンス

---

### 9. webhook_service ⚠️

**説明:** Stripe Webhook処理サービス（環境変数依存最大）

**実行手順:**
```bash
# 必須環境変数設定
set DYNAMODB_TABLE=test-homebiyori
set STRIPE_WEBHOOK_SECRET=whsec_test_secret
set AWS_DEFAULT_REGION=ap-northeast-1
set PYTHONPATH=%CD%\backend\layers\common\python

# テスト実行
python -m pytest tests/backend/services/webhook_service/ -v --tb=short -x
```

**制約・注意事項:**
- ✅ Webhook受信ロジック確認済み
- ✅ サブスクリプション同期ロジック検証済み
- ❌ **DYNAMODB_TABLE環境変数が必須**
- ❌ 実際のStripe Webhook署名検証は不可
- ❌ Parameter Store実取得は不可
- ⏱️ 実行時間: ~3秒

**⚠️ webhook_serviceの特殊依存理由:**
- **SQS連携:** TTL_UPDATE_QUEUE_URL（他サービスはDynamoDBのみ）
- **外部API:** INTERNAL_API_KEY, STRIPE_API_KEY（実際のWebhook処理用）
- **Webhook署名:** STRIPE_WEBHOOK_SECRET（セキュリティ検証用）
- そのため他サービスと比較して環境変数依存が多い

**期待結果:** 9/9テスト通過（環境変数依存解決済み）

**検証困難な部分:**
- Stripe Webhook実署名検証
- Stripe API実連携
- Parameter Store APIキー取得
- SQS メッセージ送信
- 本番Webhookペイロード処理

---

## 🚀 全サービス一括テスト実行

### クイック全体テスト
```bash
# 基本環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python
set DYNAMODB_TABLE=test-homebiyori
set AWS_DEFAULT_REGION=ap-northeast-1

# シンプルサービス（5個）を一括実行
python -m pytest tests/backend/services/health_check_service/ tests/backend/services/user_service/ tests/backend/services/notification_service/ tests/backend/services/billing_service/ tests/backend/services/admin_service/ -v
```

### 詳細全体テスト（個別実行推奨）
```bash
# 1. health_check_service
echo "=== Testing health_check_service ==="
set PYTHONPATH=%CD%\backend\layers\common\python
python -m pytest tests/backend/services/health_check_service/ -v --tb=short

# 2. user_service
echo "=== Testing user_service ==="
python -m pytest tests/backend/services/user_service/ -v --tb=short

# 3. notification_service
echo "=== Testing notification_service ==="
python -m pytest tests/backend/services/notification_service/ -v --tb=short

# 4. billing_service
echo "=== Testing billing_service ==="
set STRIPE_API_KEY=sk_test_billing_service
python -m pytest tests/backend/services/billing_service/ -v --tb=short

# 5. admin_service
echo "=== Testing admin_service ==="
python -m pytest tests/backend/services/admin_service/ -v --tb=short

# 6. ttl_updater_service
echo "=== Testing ttl_updater_service ==="
python -m pytest tests/backend/services/ttl_updater_service/ -v --tb=short

# 7. tree_service
echo "=== Testing tree_service ==="
python -m pytest tests/backend/services/tree_service/ -v --tb=short -x

# 8. chat_service（LangChain追加パス必要）
echo "=== Testing chat_service ==="
set PYTHONPATH=%CD%\backend\layers\common\python
python -m pytest tests/backend/services/chat_service/ -v --tb=short -x

# 9. webhook_service（環境変数必須）
echo "=== Testing webhook_service ==="
set DYNAMODB_TABLE=test-homebiyori
set STRIPE_WEBHOOK_SECRET=whsec_test_secret
python -m pytest tests/backend/services/webhook_service/ -v --tb=short -x
```

---

## 📊 期待テスト結果サマリー

| サービス | 成功テスト数 | 制約レベル | 実行時間 |
|---------|-------------|-----------|---------|
| health_check_service | 3/3 | ✅ 制約なし | ~1秒 |
| user_service | 12/12 | ⚠️ 軽微制約 | ~2秒 |
| notification_service | 13/13 | ⚠️ 軽微制約 | ~2秒 |
| billing_service | 13/13 | ⚠️ 中程度制約 | ~2秒 |
| admin_service | 17/17 | ⚠️ 軽微制約 | ~2秒 |
| ttl_updater_service | 13/13 | ⚠️ 軽微制約 | ~2秒 |
| tree_service | 18/18 | ⚠️ 軽微制約 | ~3秒 |
| chat_service | 6/6 | ❌ 高制約 | ~3-5秒 |
| webhook_service | 9/9 | ⚠️ 環境変数必須 | ~3秒 |

**総計:** 100%ローカル検証成功率達成

---

## 🔧 トラブルシューティング

### よくある問題と解決方法

**1. `ModuleNotFoundError: No module named 'homebiyori_common'`**
```bash
# PYTHONPATHが正しく設定されているか確認
echo %PYTHONPATH%
# 正しい設定
set PYTHONPATH=%CD%\backend\layers\common\python
```

**2. `ModuleNotFoundError: No module named 'langchain'`**
```bash
# LangChain関連パッケージをインストール
pip install langchain==0.3.27 langchain-aws==0.2.30 langchain-community==0.3.27
```

**3. `ValueError: DYNAMODB_TABLE environment variable is required`**
```bash
# webhook_serviceで必須の環境変数を設定
set DYNAMODB_TABLE=test-homebiyori
```

**4. テストの文字化け（Windows）**
```bash
# コンソールエンコーディングを確認・設定
chcp 65001
```

**5. pytest not found**
```bash
# pytestのインストール確認
pip install pytest==8.4.1 pytest-asyncio==0.21.1
```

---

## 📝 検証レポート用テンプレート

テスト実行後に以下テンプレートを使用してレポート作成：

```markdown
## テスト実行結果レポート

**実行日:** YYYY-MM-DD
**実行者:** [名前]
**Python Version:** [python --version]

### 成功したサービス
- [ ] health_check_service (3/3)
- [ ] user_service (12/12)
- [ ] notification_service (13/13)
- [ ] billing_service (13/13)
- [ ] admin_service (17/17)
- [ ] ttl_updater_service (13/13)
- [ ] tree_service (18/18)
- [ ] chat_service (6/6)
- [ ] webhook_service (9/9)

### 問題・注意事項
- [問題があれば記載]

### 次のアクション
- [必要に応じて記載]
```

---

## 🎯 まとめ

**Homebiyoriプロジェクトは9種類のLambdaサービスを持ち、各サービスで異なるテスト制約があります。**

**推奨テストフロー:**
1. **シンプルサービス** (health_check, user, notification, billing, admin) → 完全ローカルテスト
2. **中程度サービス** (ttl_updater, tree) → 高精度ローカルテスト
3. **複雑サービス** (chat, webhook) → 基本機能確認 + ドキュメント化された制約理解

この手順書に従うことで、**ローカル環境で可能な最大限のテスト検証**を実施できます。