# Homebiyori プロジェクト概要 (2024-08-06更新)

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

### バックエンド ✅ **完成済み**
- **AWS Lambda** (Python 3.11+) - 9サービス完全実装
- **FastAPI + Mangumアダプター**
- **Pydantic** (データバリデーション)
- **Boto3** (AWS SDK)
- **Lambda Layers**: homebiyori_common + homebiyori_ai

### インフラストラクチャ ✅ **完成済み**
- **AWS Lambda** (9サービス: health_check, user, chat, tree, webhook, notification, ttl_updater, billing, admin)
- **Amazon API Gateway** (3分離構成: ユーザー・管理者・webhook)
- **Amazon DynamoDB** (7テーブル構成: users, subscriptions, trees, fruits, chats, notifications, feedback)
- **Amazon SQS** (非同期処理: ttl-updates, webhook-events, DLQ)
- **Amazon Cognito** (認証・認可)
- **Amazon Bedrock** (AI/LLMサービス - Claude 3 Haiku)
- **AWS CloudFront** (CDN)
- **AWS WAF** (Webアプリケーションファイアウォール)
- **Terraform** (Infrastructure as Code) - 最新化完了

### ストレージ・データ戦略 (設計変更版)
- **DynamoDB直接保存**: チャット内容・AI応答の高速アクセス
- **画像機能削除**: コスト・複雑性削減のため削除
- **TTL動的管理**: サブスクリプションプラン別データ保持期間制御
- **時刻統一**: 全システムJST統一

## 主要機能 ✅ **バックエンド実装完了**

### AIシステム
- **AIキャラクター**: 3キャラクター（たまさん、まどか姉さん、ヒデじい）
- **感情検出**: キーワード + 文脈分析・実生成判定
- **褒めレベル**: ライト・スタンダード・ディープ対応
- **Bedrock最適化**: Claude 3 Haiku・プロンプト効率化

### データ管理
- **ユーザー管理**: プロフィール・子供情報CRUD
- **チャット機能**: AI会話・履歴・TTL管理
- **木の成長システム**: 年輪・実システム・テーマカラー対応
- **通知システム**: アプリ内通知・内部API・管理者メンテナンス

### 課金・運用
- **Stripe統合**: サブスクリプション・期間末解約・webhook処理
- **管理者ダッシュボード**: システムメトリクス・ユーザー統計・メンテナンス制御
- **SQS非同期処理**: TTL更新・webhook処理

## 現在の開発ステータス (2024-08-06)

### ✅ **完了済み**
- **インフラストラクチャ**: Terraform定義完了、7テーブル+9サービス構成
- **バックエンド**: Lambda 9サービス完全実装・テスト済み
- **API Gateway**: 3分離構成（ユーザー・管理者・webhook）
- **認証システム**: Cognito + Google OAuth統合
- **課金システム**: Stripe完全統合・期間末解約対応
- **管理者機能**: ダッシュボード・メトリクス・メンテナンス制御
- **テストスイート**: 100+ テストケース・包括的テスト
- **コード品質**: Lambda Layers統合・命名統一・リファクタリング

### 🎯 **次のフェーズ: フロントエンド統合**
- **APIクライアント**: バックエンドAPI統合準備完了
- **認証フロー**: Amplify Auth + JWT統合準備完了
- **状態管理**: Zustand統合準備完了
- **エラー境界**: 503メンテナンス・401認証エラー対応準備完了

## 技術的達成事項
- **プライバシー保護**: 個人情報DB保存0件（ニックネーム方式）
- **コスト最適化**: 月額100ユーザーで約$9（目標$15以下達成）
- **高速化**: DynamoDB直接保存・SQS非同期処理
- **運用性**: Parameter Store統合・CloudWatch監視・構造化ログ

## 開発方針
- **バックエンドファースト戦略**: ✅ 完了（予定6週間→3日で完成）
- **日本語最適化**: JST統一・日本語感情検出・文化的配慮
- **品質重視**: GEMINI.md準拠・包括的テスト・定期ローカルテスト