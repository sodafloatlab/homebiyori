# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**重要：このプロジェクトでのやり取りは常に日本語で行ってください。**

## MCP ツール利用方針

**このプロジェクトでは利用可能なMCPツールを積極的に活用してください：**

- **Serenaツール**: コードベース操作（ファイル読み書き、シンボル検索、テスト実行等）では必ずSerenaツールを使用すること
- **AWSドキュメンテーションツール**: AWS関連の技術調査や設計確認時に活用
- **Terraformツール**: インフラストラクチャ実装時のモジュール・ポリシー検索に活用
- **その他MCPツール**: 作業効率化のため、利用可能なツールは積極的に活用すること

**重要**: 利用可能なMCPツールがある場合は、標準ツールよりもMCPツールを優先して使用してください。特にコードベース操作においてSerenaツールの利用は必須です。

## ⚠️ テストファイル配置の必須ルール

**【絶対厳守】テストファイルの統一配置ルール：**

### 🚫 禁止事項
- **frontend/src/__tests__/**: フロントエンド配下にテストディレクトリを作成してはならない
- **frontend/tests/**: フロントエンド配下にテストディレクトリを作成してはならない
- **backend/tests/**: バックエンド配下にテストディレクトリを作成してはならない
- **個別サービス配下のtests/**: 各サービスディレクトリ内にテストディレクトリを作成してはならない

### ✅ 必須配置場所
```
C:\Users\hplat\Desktop\Develop\Kiro\homebiyori\
└── tests/                           # 【統一テストディレクトリ】
    ├── backend/                      # バックエンドテスト
    │   ├── services/
    │   │   ├── health_check/
    │   │   ├── user_service/
    │   │   ├── chat_service/
    │   │   └── ...
    │   └── layers/
    └── frontend/                     # フロントエンドテスト
        ├── components/
        ├── lib/
        └── stores/
```

### 🔧 Jest設定ルール
```javascript
// frontend/jest.config.js - 必須設定
const customJestConfig = {
  roots: ['<rootDir>/src', '<rootDir>/../tests/frontend'],
  testMatch: [
    '<rootDir>/../tests/frontend/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  // frontend/src配下のテストマッチは絶対に含めない
}
```

### 📋 テストファイル作成・移動時のチェックリスト
1. **配置場所確認**: 必ず`tests/frontend/`または`tests/backend/`配下か確認
2. **パス設定確認**: テストファイル内のimportパスが`@/`（絶対パス）になっているか確認
3. **Jest設定確認**: `testMatch`が統一ディレクトリを指しているか確認
4. **実行確認**: `npm test`でテストが正常に認識されるか確認

### 🎯 統一方針の理由
- **プロジェクト一貫性**: バックエンドもフロントエンドも同じ`tests/`配下で管理
- **CI/CD効率化**: 全テストを`tests/`配下で一括実行可能
- **メンテナンス性**: テストファイルの場所が明確で管理しやすい
- **開発者体験**: 新しい開発者が迷わない明確なルール

**この配置ルールは絶対に変更してはならない。例外は一切認めない。**

## プロジェクト概要

**Homebiyori（ほめびより）** は、育児中の親をAIが優しく褒めてくれるWebアプリケーションです。主役は子供ではなく親であり、押し付けがましくない優しさで育児のやる気や自己肯定感を高めることを目的としています。

## アーキテクチャ

サーバーレス構成のWebアプリケーション：

**フロントエンド：**
- Next.js 14（App Router、SSG/ISRモード）
- TypeScript
- Tailwind CSS
- React Hook Form
- Framer Motion（アニメーション）
- AWS Amplify Auth（認証クライアント）

**バックエンド：**
- AWS Lambda（Python 3.11+）
- FastAPI + Mangumアダプター
- Pydantic（データバリデーション）
- Boto3（AWS SDK）

**インフラストラクチャ：**
- AWS Lambda（サーバーレス実行環境）
- Amazon API Gateway（RESTful API）
- Amazon DynamoDB（NoSQLデータベース）
- Amazon S3（静的ホスティング、画像ストレージ）
- Amazon Cognito（認証・認可）
- Amazon Bedrock（AI/LLMサービス）
- AWS CloudFront（CDN）
- AWS WAF（Webアプリケーションファイアウォール）
- Terraform（Infrastructure as Code）

## 重要なアーキテクチャ変更

**⚡ Issue #28 EventBridge移行完了（2024-08-25）**
- **旧方式**: API Gateway + 単一webhook_service Lambda
- **新方式**: EventBridge + 分割Lambda（handle-payment-succeeded, handle-payment-failed, handle-subscription-updated）
- **場所**: `backend/services/webhook_service/stripe/`
- **メリット**: 高可用性、独立スケーリング、ネイティブリトライ・DLQ、運用負荷軽減

**🏗️ Terraform アーキテクチャ改善（2024-08-25）**
- **EventBridge モジュール分割**: 再利用可能な`eventbridge-bus`、`eventbridge-rule`モジュール
- **IAMポリシー外部化**: JSONファイル + テンプレート変数でポリシー管理
- **設定統合**: stripe_eventbridge.tf → main.tf統合で管理簡素化

## 開発コマンド
**インフラストラクチャ（Terraform）：**
```bash
# 各レイヤーを順番にデプロイ
cd terraform/environments/prod/datastore
terraform init && terraform plan && terraform apply

cd ../backend  
terraform init && terraform plan && terraform apply

cd ../frontend
terraform init && terraform plan && terraform apply

# 全インフラ削除（逆順）
cd terraform/environments/prod/frontend && terraform destroy
cd ../backend && terraform destroy  
cd ../datastore && terraform destroy
```

**フロントエンド（Next.js）- 実装開始時：**
```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run start        # 本番サーバー起動
npm run lint         # ESLint実行
npm run typecheck    # TypeScript型チェック
npm test             # Jestテスト実行
```

**バックエンド（FastAPI + Lambda）：**
```bash
# テスト実行（tests配下で統一管理）
pytest tests/                              # 全テスト実行
pytest tests/backend/services/health_check/ # 個別サービステスト
python -m pytest tests/ --cov=backend      # カバレッジ付きテスト

# コード品質チェック
ruff check backend/          # Pythonコードリント
ruff format backend/         # Pythonコードフォーマット
mypy backend/               # 型チェック

# 個別サービス開発時
cd backend/services/health_check
python -m pytest ../../../tests/backend/services/health_check/ -v
```

## ディレクトリ構成

**バックエンド構成（本番用モジュールのみ）：**
```
backend/
├── services/           # Lambda関数群
│   ├── health_check/   # ヘルスチェック専用Lambda
│   ├── user_service/   # ユーザー管理Lambda
│   ├── chat_service/   # チャット・AI機能Lambda
│   ├── webhook_service/# Webhook処理サービス
│   │   └── stripe/     # Stripe EventBridge Webhooks（Issue #28対応）
│   │       ├── handlers/   # Lambda関数ハンドラー群
│   │       └── common/     # 共通モジュール（models, database, services）
│   └── ...
├── layers/            # 共通Lambda Layers
│   ├── common/        # 共通ライブラリ
│   └── ai/           # AI関連ライブラリ
└── scripts/          # デプロイスクリプト等
```

**テスト構成（tests配下で統一管理）：**
```
tests/                           # 【統一テストディレクトリ】
├── backend/                     # バックエンドテスト
│   ├── services/
│   │   ├── health_check/
│   │   │   └── test_health_check.py    # main.py + handler.py のテスト
│   │   ├── user_service/
│   │   │   ├── test_user_service.py    # main.py + handler.py のテスト
│   │   │   └── test_models.py          # models.py のテスト
│   │   ├── chat_service/
│   │   ├── tree_service/
│   │   ├── billing_service/
│   │   ├── webhook_service/         # Webhook処理テスト
│   │   │   └── test_stripe_eventbridge_webhooks.py
│   │   └── ...
│   └── layers/
│       └── test_common_layer.py
├── frontend/                    # フロントエンドテスト【統一配置】
│   ├── components/
│   │   ├── features/
│   │   │   ├── account/
│   │   │   ├── chat/
│   │   │   └── premium/
│   │   └── ui/
│   ├── lib/
│   │   ├── hooks/
│   │   └── services/
│   └── stores/
├── integration/                 # 統合テスト
├── fixtures/                   # テストデータ
├── conftest.py                 # pytest設定
└── requirements-dev.txt        # テスト用依存関係
```

**⚠️ 重要**: フロントエンドテストは**絶対に**`frontend/src/__tests__`や`frontend/tests`ではなく、`tests/frontend`配下に配置すること。


## ファイル構造

**フロントエンド構造（実装時）：**
```
src/
├── app/                   # Next.js App Routerページ
│   ├── (auth)/           # 認証関連ルート
│   ├── dashboard/        # 木の成長UIメインダッシュボード
│   ├── post/            # 投稿作成ページ
│   └── settings/        # ユーザー設定
├── components/
│   ├── ui/              # 基本UIコンポーネント
│   ├── features/        # 機能別コンポーネント
│   └── layout/          # レイアウトコンポーネント
├── lib/                 # ユーティリティとサービス
└── types/               # TypeScript型定義
```

**バックエンド構造（実装時）：**
```
app/
├── handler.py           # Lambdaエントリーポイント
├── main.py             # FastAPIインスタンス
├── routers/            # APIエンドポイント
├── models/             # データモデル
├── services/           # ビジネスロジック
├── core/               # コア設定
└── utils/              # ヘルパー関数
```

## 開発ワークフロー（設計変更版）

1. **認証フロー：** Amazon Cognito経由のGoogle OAuth
2. **チャット作成：** テキストのみ投稿（画像機能削除）
3. **AI処理：** Bedrock API + LangChain高速文脈処理
4. **可視化：** 木の成長UIで育児努力の進捗表示（年輪と光る実システム）
5. **時刻表示：** 全てJST統一による直感的UX
6. **レスポンシブデザイン：** 忙しい親のためのモバイルファースト
7. **Stripe Webhook処理：** EventBridge + 分割Lambda方式（Issue #28対応完了）

## 設計ドキュメント準拠

**重要：このプロジェクトの開発は以下の設計ドキュメントに厳密に従って行ってください：**

1. **`.kiro/specs/homebi-yori/design.md`** - システム設計とアーキテクチャ仕様
   - API エンドポイント構造
   - データベース設計
   - インフラストラクチャ構成
   - セキュリティ要件

2. **`.kiro/specs/homebi-yori/requirements.md`** - 機能要件と非機能要件
   - ユーザーストーリー
   - 機能一覧と優先順位
   - パフォーマンス要件
   - セキュリティ要件

**開発時の注意事項：**
- 実装前に必ず該当ドキュメントを確認すること
- API設計はdesign.mdのエンドポイント仕様に従うこと
- 新機能追加時はrequirements.mdとの整合性を確認すること
