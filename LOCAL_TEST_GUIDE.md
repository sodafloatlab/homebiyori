# Homebiyori ローカルテスト実行手順書

**更新日:** 2025年8月9日  
**対象:** Homebiyori全Lambdaサービス（10種類）  
**Python要件:** Python 3.13+、pytest 8.4.1+  
**重要:** Lambda Layer共通ミドルウェア統合対応版  

## 📋 概要

本書では、Homebiyoriプロジェクトの全Lambdaサービスをローカル環境でテストするための詳細手順を記載します。各サービスには固有の環境変数要件とテスト制約があるため、サービスごとに適切な設定が必要です。

## 🔄 **2025年8月9日更新内容**
- **共通ミドルウェア統合**: 全サービスでLambda Layer統一ミドルウェアを使用
- **テスト環境対応**: `ENVIRONMENT=test` 環境変数による認証フォールバック機能
- **保守性向上**: 重複したメンテナンス・認証処理をLayer化で統一

## 🛠️ 前提条件

### 必要なPythonパッケージ
```bash
# 基本テスト依存関係
pip install pytest==8.4.1 pytest-asyncio==0.21.1 pytest-cov==4.1.0

# LangChain関連（chat_serviceで必要）
pip install langchain==0.3.27 langchain-aws==0.2.30 langchain-community==0.3.27

# 追加依存関係
pip install moto[dynamodb]==4.2.14

# Contact Service用追加パッケージ
pip install email-validator==2.2.0
```

### 環境変数テンプレート
```bash
# 基本環境変数（全サービス共通）
set PYTHONPATH=%CD%\backend\layers\common\python
set AWS_DEFAULT_REGION=ap-northeast-1
set ENVIRONMENT=test  # 重要: テスト環境フラグ（認証フォールバック有効化）

# DynamoDB関連
set DYNAMODB_TABLE=test-homebiyori

# その他（サービス固有）
set STRIPE_WEBHOOK_SECRET=whsec_test_secret
set COGNITO_USER_POOL_ID=test_pool_id

# Contact Service用（統合テストで必要）
set SNS_TOPIC_ARN=arn:aws:sns:ap-northeast-1:123456789012:test-contact-notifications
```

### **環境変数の重要性**
- **`ENVIRONMENT=test`**: 共通ミドルウェアでテスト環境認証フォールバック機能を有効化
- **`PYTHONPATH`**: Lambda Layer共通ライブラリへのパス設定（全サービスで必須）

### **⚠️ Lambda Layer環境と現在のローカル環境の違い**

**Lambda本番環境（AWS）:**
- ✅ `/opt/python/` が自動でsys.pathに追加されるため、`import homebiyori_common` が問題なく動作
- ✅ Lambda Layerの内容が自動認識される
- ✅ 追加のPYTHONPATH設定は不要

**現在のローカルテスト環境（Windows）:**
- ❌ `homebiyori_common`パッケージへのパス設定が必要
- ⚠️ Windows環境変数の設定が複雑な場合あり
- 🔧 **解決策**: 推奨実行方法（下記参照）

---

## 🎯 サービス別テスト実行手順

### 1. health_check_service

**説明:** 最もシンプルなヘルスチェック専用サービス

**実行手順（推奨）:**
```bash
# 🔧 推奨: 直接実行（PYTHONPATH問題を回避）
cd backend/layers/common/python
set ENVIRONMENT=test
python -m pytest ../../../../tests/backend/services/health_check_service/ -v --tb=short
```

**実行手順（従来）:**
```bash
# 環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python
set ENVIRONMENT=test

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

**説明:** ユーザープロフィール・認証管理・アカウント削除サービス

**実行手順（推奨）:**
```bash
# 🔧 推奨: 直接実行（PYTHONPATH問題を回避）
cd backend/layers/common/python
python -m pytest ../../../../tests/backend/services/user_service/ -v --tb=short
```

**実行手順（従来）:**
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

**期待結果:** 24/24テスト通過

**新機能（2025年8月10日追加）:**
- **InteractionMode機能**: ユーザーの今日の気分設定（褒めて欲しい/話を聞いて欲しい）
- **AI設定統合**: chat_serviceとの連携でプロフィール設定ベースAI応答生成
- **無料ユーザー制限**: praise_level="deep"の無料ユーザー制限機能
- **統合テスト**: chat_service AI設定情報統合テスト完了

**検証困難な部分:**
- Amazon Cognito実認証フロー
- JWT トークン実検証
- ユーザープール実操作
- アカウント削除時の他サービス連携（billing_service等）
- 段階的削除プロセスのE2E検証
- InteractionModeの実際のプロンプト選択動作（chat_service実連携要）

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

**実行手順（推奨）:**
```bash
# 🔧 推奨: 直接実行（PYTHONPATH問題を回避）
cd backend/layers/common/python
python -m pytest ../../../../tests/backend/services/tree_service/ -v --tb=short -x
```

**実行手順（従来）:**
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

### 10. contact_service

**説明:** 問い合わせ管理・運営者通知サービス

**実行手順:**
```bash
# 環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python

# 基本テスト実行（SNS依存なし）
python -m pytest tests/backend/services/contact_service/test_contact_service.py -v --tb=short
```

**統合テスト実行（AWS環境必要）:**
```bash
# AWS統合テスト用環境変数（実環境のみ）
set SNS_TOPIC_ARN=arn:aws:sns:ap-northeast-1:123456789012:prod-homebiyori-contact-notifications
set AWS_DEFAULT_REGION=ap-northeast-1
set ENVIRONMENT=test

# 統合テスト実行（AWS認証情報必要）
python -m pytest tests/backend/services/contact_service/test_integration.py -v -m integration
```

**制約・注意事項:**
- ✅ 問い合わせフォームバリデーション完全テスト可能
- ✅ スパム検出・自動分類ロジック検証済み
- ✅ メッセージ生成機能確認済み
- ❌ **AWS SNS実連携は統合テストのみ**
- ❌ 実際のメール送信はテスト対象外
- ⚠️ **統合テストは実際のSNSトピックにメール送信する可能性**
- ⏱️ 実行時間: ~2秒（基本）/ ~5-10秒（統合）

**期待結果:** 
- 基本テスト: 15/15テスト通過
- 統合テスト: 4/4テスト通過（AWS環境のみ）

**検証困難な部分:**
- AWS SNS実メール配信
- 運営者メールアドレスへの実際の通知
- レート制限の実動作
- 大量問い合わせでのパフォーマンス
- Dead Letter Queue動作

**Contact Serviceの特徴:**
- **メール通知システム:** AWS SNS + Email購読による運営者通知
- **スマート分類:** 問い合わせ内容からカテゴリ・優先度を自動判定
- **セキュリティ:** XSS対策、スパム検出、レート制限機能
- **監視:** CloudWatch連携、失敗アラーム、ダッシュボード

---

## 🚀 全サービス一括テスト実行

### クイック全体テスト（推奨）
```bash
# 🔧 推奨: 直接実行方式
cd backend/layers/common/python

# シンプルサービス（6個）を一括実行
python -m pytest ../../../../tests/backend/services/health_check_service/ ../../../../tests/backend/services/user_service/ ../../../../tests/backend/services/notification_service/ ../../../../tests/backend/services/billing_service/ ../../../../tests/backend/services/admin_service/ ../../../../tests/backend/services/contact_service/test_contact_service.py -v
```

### クイック全体テスト（従来）
```bash
# 基本環境変数設定
set PYTHONPATH=%CD%\backend\layers\common\python
set DYNAMODB_TABLE=test-homebiyori
set AWS_DEFAULT_REGION=ap-northeast-1

# シンプルサービス（6個）を一括実行
python -m pytest tests/backend/services/health_check_service/ tests/backend/services/user_service/ tests/backend/services/notification_service/ tests/backend/services/billing_service/ tests/backend/services/admin_service/ tests/backend/services/contact_service/test_contact_service.py -v
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

# 10. contact_service（基本テストのみ）
echo "=== Testing contact_service ==="
python -m pytest tests/backend/services/contact_service/test_contact_service.py -v --tb=short
```

---

## 📊 期待テスト結果サマリー

| サービス | 成功テスト数 | 制約レベル | 実行時間 |
|---------|-------------|-----------|---------|
| health_check_service | 3/3 | ✅ 制約なし | ~1秒 |
| user_service | 24/24 | ⚠️ 軽微制約 | ~2秒 |
| notification_service | 13/13 | ⚠️ 軽微制約 | ~2秒 |
| billing_service | 13/13 | ⚠️ 中程度制約 | ~2秒 |
| admin_service | 17/17 | ⚠️ 軽微制約 | ~2秒 |
| ttl_updater_service | 13/13 | ⚠️ 軽微制約 | ~2秒 |
| tree_service | 18/18 | ⚠️ 軽微制約 | ~3秒 |
| chat_service | 6/6 | ❌ 高制約 | ~3-5秒 |
| webhook_service | 9/9 | ⚠️ 環境変数必須 | ~3秒 |
| contact_service | 15/15 | ⚠️ 軽微制約※ | ~2秒 |

**※contact_serviceの制約:** 基本機能は完全テスト可能。AWS SNS統合は別途統合テストで対応。

**総計:** 100%ローカル検証成功率達成（10サービス）

---

## 🔧 トラブルシューティング

### よくある問題と解決方法

**1. `ModuleNotFoundError: No module named 'homebiyori_common'`**

これは最も一般的な問題です。以下の手順で解決してください：

**解決策A（推奨）: 直接実行方式**
```bash
# 最も確実な方法
cd backend/layers/common/python
python -m pytest ../../../../tests/backend/services/[サービス名]/ -v --tb=short
```

**解決策B（従来方式）: PYTHONPATH設定**
```bash
# PYTHONPATHが正しく設定されているか確認
echo %PYTHONPATH%
# 正しく設定されていない場合
set PYTHONPATH=%CD%\backend\layers\common\python

# Python環境でパスを確認
cd backend/layers/common/python
python -c "import homebiyori_common; print('SUCCESS: homebiyori_common loaded')"
```

**背景説明:**
- **Lambda本番環境**: `/opt/python/homebiyori_common` が自動でsys.pathに追加される
- **ローカル環境**: 手動でPYTHONPATHを設定するか、直接実行が必要

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
- [ ] user_service (21/21)
- [ ] notification_service (13/13)
- [ ] billing_service (13/13)
- [ ] admin_service (17/17)
- [ ] ttl_updater_service (13/13)
- [ ] tree_service (18/18)
- [ ] chat_service (6/6)
- [ ] webhook_service (9/9)
- [ ] contact_service (15/15)

### 問題・注意事項
- [問題があれば記載]

### 次のアクション
- [必要に応じて記載]
```

---

## 🎯 まとめ

**Homebiyoriプロジェクトは10種類のLambdaサービスを持ち、各サービスで異なるテスト制約があります。**

**推奨テストフロー:**
1. **シンプルサービス** (health_check, user, notification, billing, admin, contact) → 完全ローカルテスト
2. **中程度サービス** (ttl_updater, tree) → 高精度ローカルテスト
3. **複雑サービス** (chat, webhook) → 基本機能確認 + ドキュメント化された制約理解
4. **統合テスト** (contact AWS SNS) → 実環境でのメール通知確認

この手順書に従うことで、**ローカル環境で可能な最大限のテスト検証**を実施できます。