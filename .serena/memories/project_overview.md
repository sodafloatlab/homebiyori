# Homebiyori プロジェクト概要

## プロジェクトの目的
**Homebiyori（ほめびより）** は、育児中の親をAIが優しく褒めてくれるWebアプリケーションです。主役は子供ではなく親であり、押し付けがましくない優しさで育児のやる気や自己肯定感を高めることを目的としています。

## 技術スタック

### フロントエンド
- **Next.js 14** (App Router、SSG/ISRモード)
- **TypeScript** 
- **Tailwind CSS**
- **React Hook Form**
- **Framer Motion** (アニメーション)
- **AWS Amplify Auth** (認証クライアント)

### バックエンド
- **AWS Lambda** (Python 3.11+)
- **FastAPI + Mangumアダプター**
- **Pydantic** (データバリデーション)
- **Boto3** (AWS SDK)

### インフラストラクチャ
- **AWS Lambda** (サーバーレス実行環境)
- **Amazon API Gateway** (RESTful API)
- **Amazon DynamoDB** (NoSQLデータベース)
- **Amazon S3** (静的ホスティング、画像ストレージ)
- **Amazon Cognito** (認証・認可)
- **Amazon Bedrock** (AI/LLMサービス - Claude 3 Haiku)
- **AWS CloudFront** (CDN)
- **AWS WAF** (Webアプリケーションファイアウォール)
- **Terraform** (Infrastructure as Code)

## 主要機能
- AIキャラクターシステム（3つのペルソナ：たまさん、まどか姉さん、ヒデじい）
- コンテンツ保存戦略（S3でコスト最適化）
- 木の成長UI（年輪と光る実システム）
- AIによるパーソナライズされた褒めメッセージ生成
- レスポンシブデザイン（モバイルファースト）

## 現在の開発ステータス
- **インフラストラクチャ**: Terraform定義完了、デプロイ済み
- **フロントエンドデモ版**: 全機能動作確認済み、UI/UXコンポーネント完成
- **バックエンド**: Lambda実装進行中（health_check、user_service等）
- **開発方針**: バックエンドファースト戦略で実装中