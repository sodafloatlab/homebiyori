# Homebiyori コードベース構造

## ルートディレクトリ構成
```
homebiyori/
├── .claude/              # Claude Code設定
├── .kiro/specs/          # 仕様書（design.md、requirements.md、tasks.md等）
├── backend/              # バックエンド (Python, FastAPI, Lambda)
├── demo/                 # フロントエンドデモ (Next.js)
├── image/                # 画像アセット
├── tests/                # テストコード（統一管理）
├── CLAUDE.md             # Claude Code向け指示書
├── DEV_SETUP.md          # 開発環境構築手順
└── GEMINI.md             # Gemini CLI Agent向けガイドライン
```

## バックエンド構成
```
backend/
├── services/           # Lambda関数群
│   ├── health_check/   # ヘルスチェック専用Lambda
│   │   ├── main.py     # FastAPIアプリケーション
│   │   ├── handler.py  # Lambdaエントリーポイント
│   │   └── requirements.txt
│   ├── user_service/   # ユーザー管理Lambda
│   │   ├── main.py     # FastAPIアプリケーション
│   │   ├── handler.py  # Lambdaエントリーポイント
│   │   ├── models.py   # データモデル
│   │   ├── database.py # DynamoDB操作
│   │   └── requirements.txt
│   └── ...
├── layers/            # 共通Lambda Layers
│   ├── common/        # 共通ライブラリ（FastAPI、boto3等）
│   └── ai/           # AI関連ライブラリ（Bedrock等）
└── scripts/          # デプロイスクリプト等
```

## テスト構成（統一管理）
```
tests/
├── backend/
│   ├── services/
│   │   ├── health_check/
│   │   │   └── test_health_check.py
│   │   ├── user_service/
│   │   │   ├── test_database.py
│   │   │   └── __init__.py
│   │   └── ...
│   └── layers/
├── integration/        # 統合テスト
├── fixtures/          # テストデータ
├── conftest.py        # pytest設定
└── requirements-dev.txt # テスト用依存関係
```

## フロントエンド構成（デモ版）
```
demo/
├── src/
│   ├── app/           # Next.js App Routerページ
│   ├── components/    # UIコンポーネント
│   └── lib/          # ユーティリティ
├── package.json
└── ...Next.js標準構成
```

## インフラストラクチャ
```
infrastructure/
├── environments/
│   └── prod/
│       ├── datastore/    # DynamoDB等
│       ├── backend/      # Lambda、API Gateway等
│       └── frontend/     # S3、CloudFront等
└── modules/             # 再利用可能なTerraformモジュール
```