# コードスタイル・規約

## Python コードスタイル

### ツール構成
- **Ruff**: リンター・フォーマッター（高速）
- **mypy**: 型チェッカー
- **pytest**: テストフレームワーク

### コーディング規約

#### 基本方針
- **型安全性**: 全ての関数に型ヒントを必須
- **構造化ログ**: structlogを使用（CloudWatch統合）
- **エラーハンドリング**: 適切な例外処理と情報隠蔽
- **ドキュメント**: 関数・クラスにdocstring必須

#### ファイル構成パターン
```python
# Lambda サービス構成例
backend/services/{service_name}/
├── main.py         # FastAPIアプリケーション
├── handler.py      # Lambdaエントリーポイント  
├── models.py       # Pydanticデータモデル
├── database.py     # DynamoDB操作（該当する場合）
└── requirements.txt
```

#### 命名規約
```python
# ファイル・ディレクトリ名
snake_case           # user_service, health_check

# 変数・関数名
snake_case           # get_user_profile, user_id

# クラス名
PascalCase           # UserProfile, HealthCheckResponse

# 定数名
UPPER_SNAKE_CASE     # MAX_RETRY_COUNT, API_VERSION
```

#### 関数の型ヒント例
```python
from typing import Dict, Any, Optional
from datetime import datetime

async def get_user_profile(user_id: str) -> Dict[str, Any]:
    """
    ユーザープロフィール取得
    
    Args:
        user_id: Cognito User ID
        
    Returns:
        Dict[str, Any]: ユーザープロフィール情報
        
    Raises:
        UserNotFoundError: ユーザーが存在しない場合
    """
    pass
```

#### ログ出力パターン
```python
import structlog

logger = structlog.get_logger(__name__)

# 構造化ログの例
logger.info(
    "User profile retrieved",
    user_id=user_id,
    response_time_ms=response_time,
    service="user-service"
)
```

## TypeScript コードスタイル（フロントエンド）

### ツール構成
- **ESLint**: コード品質チェック（Next.js標準設定）
- **TypeScript**: 型安全性確保
- **Tailwind CSS**: スタイリング

### 命名規約
```typescript
// ファイル名
kebab-case          // user-profile.tsx, health-check.ts

// 変数・関数名  
camelCase           // getUserProfile, userId

// コンポーネント名
PascalCase          // UserProfile, HealthCheck

// 型・インターフェース名
PascalCase          // UserProfileProps, ApiResponse
```

## ディレクトリ構造規約

### バックエンド
```
backend/services/{service_name}/
├── main.py         # FastAPIアプリ（必須）
├── handler.py      # Lambdaハンドラー（必須）
├── models.py       # Pydanticモデル（データがある場合）
├── database.py     # DB操作（DynamoDB使用時）
└── requirements.txt # 依存関係（共通レイヤー以外）
```

### テスト
```
tests/backend/services/{service_name}/
├── test_{service_name}.py    # main.py + handler.py のテスト
├── test_models.py           # models.py のテスト（該当時）
└── test_database.py         # database.py のテスト（該当時）
```

## コミット規約

### コミットメッセージ形式
```
{type}: {subject}

{body}

{footer}
```

### Type一覧
- **feat**: 新機能追加
- **fix**: バグ修正
- **docs**: ドキュメント更新
- **style**: コードスタイル修正
- **refactor**: リファクタリング
- **test**: テスト追加・修正
- **chore**: その他の変更

### 例
```
feat: user_serviceにプロフィール取得API追加

- GET /api/users/profile エンドポイント実装
- DynamoDB からユーザー情報取得機能
- 適切なエラーハンドリングと型安全性を確保

Closes #123
```

## AWS・インフラ規約

### Terraform
- **ファイル名**: kebab-case（main.tf, variables.tf）
- **リソース名**: kebab-case + プロジェクトプレフィックス
- **タグ**: 必須（Project, Environment, Service）

### Lambda関数
- **メモリ**: 128MB〜512MB（コスト最適化）
- **タイムアウト**: 30秒以内（API Gateway制限）
- **環境変数**: 必要最小限、機密情報はParameter Store使用

## セキュリティ規約

### 共通事項
- **機密情報**: ログ出力禁止、エラーメッセージでの漏洩防止
- **入力検証**: Pydanticモデルで全入力データ検証
- **認証**: 全APIエンドポイントでCognitoトークン検証
- **CORS**: 必要最小限のオリジンのみ許可