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

## 開発コマンド

**現在の状況：** インフラストラクチャ定義が完了しており、バックエンドLambda実装進行中

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
│   └── ...
├── layers/            # 共通Lambda Layers
│   ├── common/        # 共通ライブラリ
│   └── ai/           # AI関連ライブラリ
└── scripts/          # デプロイスクリプト等
```

**テスト構成（tests配下で統一管理）：**
```
tests/
├── backend/
│   ├── services/
│   │   ├── health_check/
│   │   │   └── test_health_check.py    # main.py + handler.py のテスト
│   │   ├── user_service/
│   │   │   ├── test_user_service.py    # main.py + handler.py のテスト
│   │   │   └── test_models.py          # models.py のテスト
│   │   └── ...
│   └── layers/
│       └── test_common_layer.py
├── integration/        # 統合テスト
├── fixtures/          # テストデータ
├── conftest.py        # pytest設定
└── requirements-dev.txt # テスト用依存関係
```

## 主要機能とアーキテクチャ設計

### AIキャラクターシステム
- 3つのAIペルソナ：たまさん（優しい）、まどか姉さん（お姉さん的）、ヒデじい（おじいちゃん的）
- 各キャラクターは独自の褒め方とパーソナリティを持つ

### コンテンツ保存戦略（設計変更版）
- チャット内容はDynamoDB直接保存（LangChain最適化）
- 画像機能は削除（コスト・複雑性削減）
- 時刻は全てJST統一（日本ユーザー最適化）

### データモデル（DynamoDB）7テーブル構成

**最適化されたマルチテーブル設計：**
各テーブルが単一責任を持ち、データ特性に応じた最適化を実現。

**1. prod-homebiyori-users**
- ユーザープロフィール（永続保存）
- PK: `USER#user_id`, SK: `PROFILE`
- プライバシー保護：メールアドレス、実名は保存しない

**2. prod-homebiyori-subscriptions**
- サブスクリプション管理（永続保存）
- Stripeとの同期、TTL制御情報を保持

**3. prod-homebiyori-trees**
- 木の状態管理（永続保存）
- AIキャラクター別テーマカラー対応

**4. prod-homebiyori-fruits**
- 実の情報（永続保存）
- ユーザーとAIの会話内容を完全保存

**5. prod-homebiyori-chats**
- チャット履歴（TTL管理）
- プラン別データ保持期間の動的制御

**6. prod-homebiyori-notifications**
- アプリ内通知（TTL管理）
- メール送信に依存しない確実な通知配信

**7. prod-homebiyori-feedback**
- 解約理由アンケート（永続保存）
- サービス改善のための分析用データ

### AI連携（Amazon Bedrock）- 設計変更版
- コスト最適化のためClaude 3 Haikuを使用
- LangChain統合：DynamoDB直接取得による高速文脈処理
- 入力：ユーザーメッセージ + DynamoDB高速文脈 + AIキャラクター設定（約700トークン）
- 出力：パーソナライズされた褒めメッセージ生成（約150トークン）
- 文脈取得速度：S3方式300ms → DynamoDB方式50ms（6倍高速化）

### コスト最適化機能（設計変更版）
- DynamoDBオンデマンド課金（チャット直接保存）
- TTL自動削除によるストレージコスト管理
- 最適化されたメモリ設定のLambda
- Bedrockトークン使用量を最小化する効率的なプロンプト設計
- 画像機能削除によるS3・CloudFrontコスト削減

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

3. **`.kiro/specs/homebi-yori/stripe_design_doc.md`** - 決済システム設計
   - Stripe連携仕様
   - サブスクリプション管理
   - 料金プラン設計

4. **`.kiro/specs/homebi-yori/tasks.md`** - 開発タスクと進捗管理
   - 週次実装計画
   - タスク優先順位
   - 完了条件

**開発時の注意事項：**
- 実装前に必ず該当ドキュメントを確認すること
- API設計はdesign.mdのエンドポイント仕様に従うこと
- 新機能追加時はrequirements.mdとの整合性を確認すること

## フロントエンド開発方針（Stage 5）

**重要: フロントエンド実装はtasks.mdのStage 5計画に厳密に従って進行してください。**

### **開発戦略: デモ忠実再現 + バックエンド統合**

1. **基本方針**:
   - `demo/`ディレクトリの機能を100%忠実に再現
   - `design_frontend.md`仕様のディレクトリ構成を厳守
   - バックエンド8つのLambdaサービスとの完全統合

2. **技術スタック統一**:
   - **Next.js 14** (App Router) + **TypeScript**
   - **Tailwind CSS 4.0** + **Framer Motion 12.23.6**
   - **Zustand 5.0+** (状態管理) + **Axios 1.7+** (HTTP)
   - **AWS Amplify Auth 6.7+** (認証統合)

3. **ライブラリバージョン管理**:
   - demoバージョンを基準とし、古い場合は最新安定版に更新
   - セキュリティ・パフォーマンス・機能改善を最優先
   - 互換性問題の場合のみdemoバージョンを維持

4. **実装優先順位**:
   ```
   Stage 5.1: プロジェクト基盤 (Day 1-2)
   Stage 5.2: 基本UI移植 (Day 3-5)  
   Stage 5.3: 状態管理・API統合 (Day 6-8)
   Stage 5.4: 認証統合 (Day 9-11)
   Stage 5.5: 機能移植 (Day 12-18)
   Stage 5.6: レイアウト統合 (Day 19-21)
   Stage 5.7: サブスクリプション (Day 22-24)
   Stage 5.8: 統合テスト・最適化 (Day 25-28)
   ```

5. **品質保証**:
   - **デモ機能との100%互換性**: UI/UX完全再現
   - **バックエンド統合**: 8つのAPI完全接続
   - **レスポンシブ対応**: モバイルファースト設計
   - **認証統合**: AWS Cognito + Google OAuth
   - **状態管理**: localStorage → Zustand + API統合

### **必須作業手順**:

1. **tasks.md Stage 5計画を参照**: 各段階の詳細要件確認
2. **demo/分析**: 移植対象コンポーネント・機能の詳細把握  
3. **design_frontend.md準拠**: ディレクトリ構成・技術仕様厳守
4. **段階的実装**: UI基盤 → 状態管理 → 機能統合の順序
5. **テスト駆動**: 各段階で動作確認・統合テスト実行

**⚠️ 重要**: フロントエンド開発中も、tasks.mdの進捗更新を必ず行ってください。各Stage完了時に詳細な実装記録を残すことで、品質とメンテナンス性を確保します。

## 進捗管理ルール（必須）

**tasks.mdの進捗更新は必須要件です：**

### **タスク完了時の必須手順：**
1. **完了チェック**: `- [ ]` を `- [x]` に変更
2. **完了日時記録**: タスクの末尾に完了日を追記
3. **実装詳細記録**: 主要な技術的決定事項を記録
4. **依存関係確認**: 次のタスクの前提条件が満たされているか確認

### **進捗更新のタイミング：**
- ✅ **タスク開始時**: 作業開始をマーク
- ✅ **重要マイルストーン達成時**: 進捗状況を更新
- ✅ **タスク完了時**: 完了状況と詳細を記録
- ✅ **問題発生時**: ブロッカーや課題を記録

### **記録すべき内容：**
- **技術的決定事項**: アーキテクチャ変更、ライブラリ選定など
- **実装上の注意点**: 将来のメンテナンス者への重要情報
- **テスト結果**: 単体テスト、統合テスト、E2Eテストの状況
- **デプロイ状況**: インフラ変更、設定変更の記録

### **例：適切な進捗記録**
```markdown
- [x] **1.1.1 Cognito User Pool設定** (完了: 2024-08-03)
  - Google OAuth 2.0 プロバイダー統合完了
  - JWT設定: アクセストークン1時間、リフレッシュトークン30日
  - 実装詳細: infrastructure/modules/cognito/main.tf
  - テスト: Amplify Auth統合テスト済み
```

**⚠️ 重要**: tasks.mdの更新を怠ると、プロジェクト全体の進捗把握が困難になります。すべての開発作業において、この進捗管理ルールを厳守してください。

## テスト戦略

**フロントエンド：**
- Jest + React Testing Library（単体テスト）
- Playwright（E2Eテスト）
- Chromatic（視覚回帰テスト）

**バックエンド：**
- pytest（APIテスト）
- DynamoDB Local（統合テスト）
- Locust（負荷テスト）

## セキュリティ考慮事項

- Amazon Cognitoによる安全な認証
- 全APIエンドポイントでJWTトークン検証
- フロントエンド・バックエンド間のCORS設定
- DDoS防御とメンテナンスモードのためのAWS WAF
- セキュアなファイルアクセスのためのS3バケットポリシー
- Pydanticモデルによる入力検証

## デプロイとインフラストラクチャ

- **単一環境：** 本番環境のみ（スモールスタートアプローチ）
- **CI/CD：** 自動テストとデプロイのGitHub Actions
- **監視：** アプリケーションパフォーマンス監視にNew Relic
- **インフラ：** 再現可能なデプロイのためのTerraform
- **コスト目標：** アクティブユーザー100名で月額約9ドル

### Terraformインフラストラクチャの詳細
- **3層アーキテクチャ：** datastore → backend → frontend の順序でデプロイ
- **ステート管理：** S3 + DynamoDB ロックを使用
- **前提条件：** Amazon Bedrockモデル（Claude 3 Haiku）の事前有効化が必要
- **セキュリティ：** WAF、IAM最小権限、全通信HTTPS、S3プライベート設定

## 実装優先順位

`.kiro/specs/homebi-yori/tasks.md`に基づき、以下の順序で実装：
1. プロジェクト基盤構築と認証
2. ユーザープロフィールと子供管理
3. AIキャラクター選択システム
4. 投稿作成とAI褒め生成
5. 花畑可視化と進捗追跡
6. ウェルカム体験とレスポンシブデザイン
7. インフラデプロイと監視

## AI褒めレベル

- **ライト：** 簡潔で優しい励まし（1文程度）
- **スタンダード：** 適度なサポートと承認（2-3文程度）  
- **ディープ：** 思慮深く詳細な肯定と共感（4-5文程度）

## コンテンツガイドライン

AI生成コンテンツは以下を満たすべき：
- 子供ではなく親を褒めることに焦点
- 圧倒的または押し付けがましい表現を避ける
- 優しく支援的な励ましを提供
- 異なる育児スタイルや状況を尊重
- 日本のユーザーに対する文化的配慮を維持