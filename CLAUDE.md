# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**重要：このプロジェクトでのやり取りは常に日本語で行ってください。**

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

**注意：** このプロジェクトは仕様策定段階で、まだ実装は開始されていません。以下のコマンドは実装開始後に使用予定です：

**フロントエンド（Next.js）：**
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
pytest               # Pythonテスト実行
ruff check          # Pythonコードリント
ruff format         # Pythonコードフォーマット
python -m pytest --cov  # カバレッジ付きテスト
```

**インフラストラクチャ：**
```bash
terraform init       # Terraform初期化
terraform plan       # インフラ変更プレビュー
terraform apply      # インフラ変更適用
terraform destroy    # インフラ削除
```

## 主要機能とアーキテクチャ設計

### AIキャラクターシステム
- 3つのAIペルソナ：たまさん（優しい）、まどか姉さん（お姉さん的）、ヒデじい（おじいちゃん的）
- 各キャラクターは独自の褒め方とパーソナリティを持つ

### コンテンツ保存戦略
- 投稿内容はS3に保存（DynamoDBではなく）してコスト最適化
- DynamoDBにはメタデータとS3キーのみ保存
- 画像は専用S3バケットにアップロード、CloudFront経由で配信

### データモデル（DynamoDB）

**Usersテーブル：**
- PK: `USER#user_id`, SK: `PROFILE`
- ユーザープロフィール、AIロール設定、褒めレベル設定を保存

**Postsテーブル：**
- PK: `USER#user_id`, SK: `POST#timestamp`
- 投稿メタデータを保存、実際のコンテンツは`content_s3_key`でS3参照

**Childrenテーブル：**
- PK: `USER#user_id`, SK: `CHILD#child_id`
- 子供の情報（名前、生年月日）を保存

### AI連携（Amazon Bedrock）
- コスト最適化のためClaude 3 Haikuを使用
- ユーザーの選択したAIキャラクターと褒めレベルに基づく構造化プロンプト
- 入力：ユーザーコンテンツ + AIロールコンテキスト + システムプロンプト（約700トークン）
- 出力：パーソナライズされた褒めメッセージ生成（約150トークン）

### コスト最適化機能
- DynamoDBオンデマンド課金
- S3 Intelligent Tieringとライフサイクルポリシー
- 最適化されたメモリ設定のLambda
- Bedrockトークン使用量を最小化する効率的なプロンプト設計

## ファイル構造

**フロントエンド構造（実装時）：**
```
src/
├── app/                   # Next.js App Routerページ
│   ├── (auth)/           # 認証関連ルート
│   ├── dashboard/        # 花畑UIメインダッシュボード
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

## 開発ワークフロー

1. **認証フロー：** Amazon Cognito経由のGoogle OAuth
2. **コンテンツ作成：** テキスト/画像投稿とAI分析
3. **AI処理：** Bedrock APIでパーソナライズされた褒め生成
4. **可視化：** 花畑UIで育児努力の進捗表示
5. **レスポンシブデザイン：** 忙しい親のためのモバイルファースト

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