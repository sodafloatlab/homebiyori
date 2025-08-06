# バックエンド設計書

## Lambda分割戦略

**機能別マイクロサービス + 負荷特性別分割**を採用し、以下のLambda構成とします：

### Lambda Functions構成

```
📱 エンドユーザー向け API Gateway (prod-user-api)
├── Cognito User Pool: prod-homebiyori-users (Google OAuth)
├── /api/chat/*     → chat-service Lambda (1024MB, 60s) [要認証]
├── /api/tree/*     → tree-service Lambda (512MB, 30s) [要認証]
├── /api/users/*    → user-service Lambda (256MB, 15s) [要認証]
└── /api/health     → health-check Lambda (128MB, 5s) [認証不要]

🔧 管理者向け API Gateway (prod-admin-api)
├── Cognito User Pool: homebiyori-admins (Email/Password)
└── /api/admin/*    → admin-service Lambda (512MB, 30s) [管理者認証]

認証フロー:
📱 User Frontend → Amplify Auth → Cognito (users) → User API Gateway
🔧 Admin Panel → Amplify Auth → Cognito (admins) → Admin API Gateway

メンテナンス制御:
Parameter Store (/homebiyori/maintenance/*) ← 全Lambda参照
```

### 各Lambda Functionの責務

| Lambda Function | 主要責務 | メモリ | タイムアウト | 同時実行 | 主要依存関係 |
|----------------|---------|-------|------------|----------|------------|
| **chat-service** | AI応答・チャット | 1024MB | 60秒 | 50 | Bedrock, DynamoDB, Parameter Store |
| **tree-service** | 木の成長管理 | 512MB | 30秒 | 100 | DynamoDB, S3, Parameter Store |
| **user-service** | ユーザー管理 | 256MB | 15秒 | 100 | DynamoDB, Parameter Store |
| **billing-service** | Stripe課金管理 | 512MB | 30秒 | 50 | Stripe API, DynamoDB, Parameter Store |
| **webhook-service** | Webhook処理 | 256MB | 15秒 | 100 | Stripe API, DynamoDB, SQS, Parameter Store |
| **notification-service** | 通知管理 | 256MB | 15秒 | 100 | DynamoDB, Parameter Store |
| **ttl-updater** | TTL一括更新 | 256MB | 300秒 | 10 | DynamoDB, SQS |
| **health-check** | 死活監視 | 128MB | 5秒 | 1000 | Parameter Store |
| **admin-service** | システム管理 | 512MB | 30秒 | 10 | CloudWatch, DynamoDB, Parameter Store |

## Lambda Layers アーキテクチャ

**共通機能の統合とコード重複削減**を目的とした階層化アーキテクチャを採用：

### Lambda Layers構成

```
📦 homebiyori-common-layer
├── 📁 python/homebiyori_common/
│   ├── 📄 __init__.py                    # パッケージエクスポート
│   ├── 📁 utils/                         # 共通ユーティリティ
│   │   ├── datetime_utils.py             # JST時刻処理統一
│   │   ├── validation.py                 # 入力検証統一
│   │   └── constants.py                  # システム定数管理
│   ├── 📁 database/                      # データベース統合
│   │   ├── client.py                     # DynamoDB統一クライアント
│   │   ├── base_models.py               # 基底モデル
│   │   └── query_builder.py             # クエリビルダー
│   ├── 📁 logger/                        # ログ統合
│   │   └── structured_logger.py         # JSON構造化ログ
│   └── 📁 exceptions/                    # 例外統合
│       └── custom_exceptions.py         # 統一例外階層
```

### アーキテクチャ設計原則

#### **責務分離の階層化**

```
🏗️ アーキテクチャ階層
homebiyori-common-layer          ← 共通基盤機能
    ↓ (基盤として活用)
各サービス/database.py          ← サービス固有ビジネスロジック  
各サービス/models.py            ← サービス固有データモデル
    ↓ (特化した操作を提供)
各サービス/handler.py + main.py ← APIエンドポイント実装
```

#### **共通Layer (homebiyori-common-layer) の責務**
- **基盤機能**: DynamoDB基本操作（get_item, query, put_item等）
- **横断的関心事**: ログ、例外処理、バリデーション、時刻処理
- **プロトコル統一**: 全サービス共通のデータアクセスパターン

#### **各サービス/database.py の責務**
- **ビジネスロジック**: サービス固有の複合操作とデータ変換
- **ドメイン知識**: 業務特化したクエリ条件とデータ構造
- **統合処理**: 複数テーブル間の整合性保持とトランザクション

##### **具体例：chat_service/database.py**
```python
class ChatServiceDatabase:
    def __init__(self):
        self.db_client = DynamoDBClient()  # 共通Layer活用
    
    async def save_chat_message(self, chat_message: ChatMessage):
        # チャット特有のビジネスロジック
        # - TTL計算（サブスクリプション連動）
        # - GSI設定（キャラクター検索用）
        # - 統計更新（木の成長連携）
    
    async def get_chat_history(self, user_id: str, request: ChatHistoryRequest):
        # 複合検索条件のビジネスロジック
        # - 期間フィルタ + キャラクター別検索
        # - ページネーション + 件数制限
        # - 権限チェック + プライバシー保護
```

#### **各サービス/models.py の責務**
- **ドメインモデル**: サービス特化のPydanticモデル定義
- **バリデーション**: 業務ルール固有の検証ロジック
- **型安全性**: サービス間の契約仕様とAPI互換性

### 設計利点

#### **保守性の向上**
- **コード重複削除**: 共通機能を一元管理（200行以上の重複コード削除）
- **統一性**: 全サービスで一貫したDB操作とログ出力
- **責務分離**: 基盤とビジネスロジックの明確な分離

#### **開発効率の向上**
- **再利用性**: 新サービス追加時の共通機能流用
- **テスタビリティ**: モック可能な構造によるユニットテスト容易化
- **型安全性**: Pydantic v2統合による実行時エラー削減

#### **運用効率の向上**
- **デプロイサイズ削減**: 各Lambdaから重複ライブラリ削除
- **コールドスタート最適化**: 共通Layerの事前ロード活用
- **監視統一**: 全サービス統一ログフォーマットによる運用性向上

## 認証・セッション管理

**認証方式: 分離されたAPI Gateway + Cognito Authorizer**
- ユーザー認証: Google OAuth (prod-homebiyori-users)
- 管理者認証: Email/Password (homebiyori-admins)
- 管理者APIは別ドメイン・Cognito User Poolで完全分離

**セッション管理: Cognito中心 + 最小限のアプリケーション管理**
```
Cognito User Pool (セッション管理)
├── Access Token (1時間, API認証用)
├── ID Token (1時間, ユーザー情報)
├── Refresh Token (30日, 自動更新)
└── フロントエンド自動更新
```

## Lambda Layers設計（共通コードアーキテクチャ）

**課題**: 現在各サービスで`database.py`、`models.py`が重複実装されており、保守性とコード一貫性に問題がある。

**解決策**: Lambda Layersを活用した共通コードアーキテクチャ

### Lambda Layers構成

```
backend/layers/
├── homebiyori-common-layer/           # 共通基盤レイヤー
│   ├── python/homebiyori_common/
│   │   ├── __init__.py
│   │   ├── database/                  # 統一DynamoDB操作
│   │   │   ├── __init__.py
│   │   │   ├── client.py             # DynamoDBClient
│   │   │   ├── base_models.py        # 共通データモデル
│   │   │   └── query_builder.py      # クエリ構築ヘルパー
│   │   ├── auth/                     # 認証・認可
│   │   │   ├── __init__.py
│   │   │   ├── cognito_utils.py      # Cognito連携
│   │   │   └── jwt_validator.py      # JWT検証
│   │   ├── logger/                   # 構造化ログ
│   │   │   ├── __init__.py
│   │   │   └── structured_logger.py
│   │   ├── exceptions/               # 統一例外処理
│   │   │   ├── __init__.py
│   │   │   └── custom_exceptions.py
│   │   ├── utils/                    # 共通ユーティリティ
│   │   │   ├── __init__.py
│   │   │   ├── datetime_utils.py     # JST時刻処理
│   │   │   ├── validation.py         # 入力検証
│   │   │   └── constants.py          # 共通定数
│   │   └── maintenance/              # メンテナンス制御
│   │       ├── __init__.py
│   │       └── maintenance_check.py
│   └── requirements.txt              # 共通依存関係
│
└── homebiyori-ai-layer/              # AI機能専用レイヤー
    ├── python/homebiyori_ai/
    │   ├── __init__.py
    │   ├── bedrock/                  # Bedrock連携
    │   │   ├── __init__.py
    │   │   ├── client.py
    │   │   └── prompt_templates.py
    │   ├── character/                # AIキャラクターシステム
    │   │   ├── __init__.py
    │   │   ├── personalities.py
    │   │   └── response_generator.py
    │   └── emotion/                  # 感情分析
    │       ├── __init__.py
    │       └── analyzer.py
    └── requirements.txt              # AI関連依存関係
```

### 各サービスの構成（改善後）

```
backend/services/chat_service/
├── main.py              # FastAPI アプリケーション
├── handler.py           # Lambda エントリーポイント
├── routers/            # APIエンドポイント定義
│   ├── __init__.py
│   ├── messages.py     # チャット関連エンドポイント
│   └── emotions.py     # 感情関連エンドポイント
├── services/           # ビジネスロジック（サービス固有）
│   ├── __init__.py
│   ├── chat_service.py # チャット処理ロジック
│   └── ai_integration.py # AI統合処理
├── schemas/            # Pydantic スキーマ（サービス固有）
│   ├── __init__.py
│   ├── requests.py     # リクエストスキーマ
│   └── responses.py    # レスポンススキーマ
└── requirements.txt    # サービス固有依存関係
```

### 共通コード使用例

**Before（重複コード）:**
```python
# chat_service/database.py
class ChatDatabase:
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.dynamodb = boto3.resource('dynamodb')
        # 重複実装...

# billing_service/database.py  
class BillingDatabase:
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.dynamodb = boto3.resource('dynamodb')
        # 同様の重複実装...
```

**After（共通Layer活用）:**
```python
# Lambda Layer: homebiyori_common/database/client.py
class DynamoDBClient:
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.dynamodb = boto3.resource('dynamodb')
        self.logger = get_logger(__name__)
    
    async def get_item(self, pk: str, sk: str) -> Optional[Dict]:
        # 統一実装
    
    async def put_item(self, item: Dict) -> None:
        # 統一実装

# chat_service/services/chat_service.py
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.logger import get_logger
from homebiyori_common.utils.datetime_utils import get_current_jst

class ChatService:
    def __init__(self):
        self.db = DynamoDBClient(os.getenv("DYNAMODB_TABLE"))
        self.logger = get_logger(__name__)
```

### Layer活用のメリット

**1. 保守性向上**
- 共通機能の修正は1箇所のみ
- バージョン管理の一元化
- 一貫したコード品質

**2. 開発効率向上**
- 新サービス開発時の実装工数削減
- テスト済み共通コードの再利用
- 統一されたAPIインターフェース

**3. 運用効率向上**
- デプロイサイズの最適化
- Lambda起動時間の短縮（共通Layerのキャッシュ）
- 統一されたログ・メトリクス

### 段階的移行計画

**Phase 1: 共通Layer作成**
1. `homebiyori-common-layer` 作成
2. 基本的な共通機能移行（Logger, Exceptions, DateTime Utils）

**Phase 2: データベース統一**
1. `DynamoDBClient` 統一実装
2. 各サービスの `database.py` をLayer経由に変更

**Phase 3: 認証統一**
1. Cognito認証処理をLayer統一
2. JWT検証ロジック統一

**Phase 4: AI機能分離**
1. `homebiyori-ai-layer` 作成
2. Bedrock連携・キャラクターシステム統一

## Lambda間内部通信セキュリティ

### 1. SQS経由通信（webhook-service → ttl-updater）
```python
# webhook-service内での通知送信
async def send_ttl_update_message(user_id: str, plan_change: dict):
    """
    SQS経由でTTL更新を依頼（セキュア）
    """
    message = {
        'user_id': user_id,
        'old_plan': plan_change['old_plan'],
        'new_plan': plan_change['new_plan'],
        'timestamp': datetime.now().isoformat(),
        'source': 'webhook-service',
        'request_id': context.aws_request_id  # Lambda context
    }
    
    # SQSメッセージ送信（IAM Roleで認証）
    await sqs_client.send_message(
        QueueUrl=settings.TTL_UPDATE_QUEUE_URL,
        MessageBody=json.dumps(message),
        MessageAttributes={
            'source_lambda': {
                'StringValue': 'webhook-service',
                'DataType': 'String'
            }
        }
    )
```

### 2. 内部API経由の通知作成
```python
# ttl-updater内での通知作成依頼
async def create_completion_notification(user_id: str, plan_info: dict):
    """
    内部API経由で通知作成（統一経路管理）
    """
    payload = {
        'action': 'create_notification',
        'user_id': user_id,
        'type': 'plan_change_completed', 
        'title': 'プラン変更完了',
        'message': f'{plan_info["old_plan"]}から{plan_info["new_plan"]}への変更が完了しました',
        'priority': 'normal',
        'source_lambda': 'ttl-updater'
    }
    
    try:
        # 内部API経由で通知作成（統一経路管理）
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.INTERNAL_API_BASE_URL}/internal/notifications/create",
                json=payload,
                headers={
                    'X-API-Key': settings.INTERNAL_API_KEY,
                    'Content-Type': 'application/json',
                    'X-Source-Lambda': 'ttl-updater'
                }
            )
            response.raise_for_status()
            logger.info(f"Notification created: {response.json()}")
            
    except httpx.HTTPError as e:
        logger.error(f"Internal API error: {e}")
        # 通知作成失敗は非致命的エラーとして処理
        pass
```

## セキュリティレイヤー構成

### Webhook Service セキュリティ
**Stripe署名検証実装:**
```python
async def verify_stripe_signature(request):
    """
    Stripe Webhook署名検証（必須）
    """
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    if not sig_header:
        raise HTTPException(401, "Missing Stripe signature")
    
    try:
        # Stripe署名検証
        event = stripe.Webhook.construct_event(
            payload, 
            sig_header, 
            settings.STRIPE_WEBHOOK_SECRET
        )
        return event
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(401, "Invalid signature")
```

### 内部API保護
```python
@internal_api_only
async def create_notification_internal(request):
    """
    内部API: 他のLambdaからの通知作成
    Lambda間呼び出しのみ許可
    """
    # Lambda間呼び出しの認証ヘッダー確認
    lambda_source = request.headers.get('X-Source-Lambda')
    if lambda_source not in ['ttl-updater', 'webhook-service']:
        raise HTTPException(403, "Access denied: Invalid Lambda source")
    
    # Lambda間のIAM Role認証
    lambda_context = request.headers.get('X-Lambda-Context')
    if not verify_lambda_caller_role(lambda_context):
        raise HTTPException(403, "Invalid Lambda caller")
```

## Lambda責務分離

```
billing-service:
├── Stripe Checkout作成
├── サブスクリプション状態取得
├── 解約・再開処理
└── Customer Portal URL取得

webhook-service:
├── Stripe Webhook受信・検証
├── サブスクリプション状態同期
├── プラン変更検出
└── SQS TTL更新キュー送信

notification-service:
├── 通知作成・管理
├── 未読通知取得
└── 通知既読化

ttl-updater:
├── SQS経由TTL一括更新
├── チャット履歴TTL調整
└── 内部API経由更新完了通知
```