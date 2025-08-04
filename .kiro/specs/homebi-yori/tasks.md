# 実装計画（バックエンドファースト戦略版）

## 現在の状況 (2024年8月時点)

### ✅ 完了済み
- **フロントエンドデモ版**: 全機能動作確認済み、UI/UXコンポーネント完成
- **インフラストラクチャ**: Terraform定義完成、AWS環境構築済み
- **設計書**: 最新のベストプラクティスに基づく設計完成
- **技術選定**: Next.js 14 + FastAPI + DynamoDB + Bedrock構成確定

### 🎯 実装方針: バックエンドファースト戦略

**実装期間**: 6週間
**開発順序**: バックエンド先行 → フロントエンド統合 → 本番リリース

---

## Phase 1: バックエンド基盤構築 (Week 1-3)

### ✅ Week 1: API Gateway + Cognito認証設定・基盤Lambda実装 (完了: 2024-08-03)

#### **1.1 API Gateway + Cognito Authorizer設定**
```
Priority: 🔴 CRITICAL
認証はLambda不要、API Gatewayで処理
```

- [x] **1.1.1 Cognito User Pool設定** (完了: 2024-08-03)
  - Google OAuth 2.0 プロバイダー統合: 既存Terraformで定義済み
  - JWT設定 (アクセス・IDトークン): Cognito標準設定
  - リフレッシュトークンローテーション: 30日設定
  - 実装場所: infrastructure/modules/cognito/main.tf

- [x] **1.1.2 API Gateway分離設定** (完了: 2024-08-03)
  - **ユーザー向けAPI Gateway**: 分離設計で実装完了
    - Cognito Authorizer設定: COGNITO_USER_POOLS型で実装
    - CORS設定: 全エンドポイントで設定済み
    - design.md準拠: `/api/` プレフィックス構造に修正完了
  - **管理者向けAPI Gateway**: 完全分離構成で実装
    - 管理者専用Cognito User Pool対応
    - `/api/admin/*` エンドポイント構造
  - 実装場所: infrastructure/modules/api-gateway/main.tf
  - 注意: Webhook専用API Gatewayは将来のStripe統合時に実装予定

- [x] **1.1.3 Lambda共通ユーザー情報取得** (完了: 2024-08-03)
  - 共通ヘルパー関数実装: Lambda Layersで提供
  - get_user_id_from_event(), get_user_email_from_event()実装
  - エラーハンドリング: 認証失敗時の適切な例外処理
  - 実装場所: backend/layers/common/python/homebiyori_common/auth.py

  ```python
  # 共通ヘルパー関数
  def get_user_id_from_event(event) -> str:
      claims = event['requestContext']['authorizer']['claims']
      return claims['sub']  # Cognito UUID
  
  def get_user_email_from_event(event) -> str:
      claims = event['requestContext']['authorizer']['claims'] 
      return claims.get('email', '')
  ```


#### **1.2 health-check Lambda実装**
```
Priority: 🟡 HIGH
Resources: 128MB, 5秒, 1000並列
IAM権限: CloudWatch Logs最小権限
```

- [x] **1.2.1 ヘルスチェックAPI実装** (完了: 2024-08-03)
  - `/api/health` エンドポイント実装完了
  - 基本死活監視機能: タイムスタンプ、ステータス、サービス情報
  - 認証不要設定: パブリックアクセス可能
  - 実装場所: backend/services/health_check/main.py
  - 注意: 詳細システム状態は管理者機能で将来実装予定

- [x] **1.2.2 システム監視実装** (完了: 2024-08-03)
  - 基本ヘルスチェック実装: サービス稼働状況確認
  - テスト: 7つのテストケースで検証済み
  - メンテナンス状態連携: Parameter Store参照機能
  - 実装場所: backend/services/health_check/
  - 注意: DynamoDB/Bedrock疎通確認は管理者機能で将来実装

#### **1.3 Lambda Layers構築**
```
Priority: 🔴 CRITICAL
共通ライブラリの効率的管理
```

- [x] **1.3.1 homebiyori-common-layer** (完了: 2024-08-03)
  - 包含ライブラリ: boto3, fastapi, pydantic, structlog, httpx
  - DynamoDB共通アクセス: Single Table Design対応
  - ユーザー情報取得ヘルパー: auth.pyで実装完了
  - メンテナンス状態チェック: Parameter Store連携
  - 例外処理クラス: 統一例外ヒエラルキー実装
  - 構造化ログ設定: CloudWatch連携対応
  - プライバシー保護: 一時取得のみ、永続化禁止実装
  - 実装場所: backend/layers/common/python/homebiyori_common/

- [x] **1.3.2 homebiyori-ai-layer** (完了: 2024-08-03)
  - 包含ライブラリ: langchain-aws, jinja2, orjson, regex
  - Bedrock共通クライアント: Claude 3 Haiku専用最適化
  - AIキャラクター管理: 3キャラクター（たまさん、まどか姉さん、ヒデじい）
  - 感情検出システム: 日本語特化キーワード分析
  - AI応答処理チェーン: エンドツーエンド処理
  - プロンプトテンプレート: Jinja2ベース動的生成
  - 実装場所: backend/layers/ai/python/homebiyori_ai/

### Week 2: データ管理Lambda実装

#### **2.1 user-service Lambda実装** (完了: 2024-08-03)
```
Priority: 🟡 HIGH
Resources: 256MB, 15秒, 100並列
IAM権限: DynamoDB読み書きのみ (ユーザー情報はAPI Gateway経由で取得)
```

- [x] **2.1.1 ユーザープロフィールAPI実装** (完了: 2024-08-03)
  - 実装済みエンドポイント:
    ```
    GET    /users/profile              - プロフィール取得
    PUT    /users/profile              - プロフィール更新
    PUT    /users/ai-preferences       - AIロール・褒めレベル設定
    GET    /users/children             - 子供一覧取得
    POST   /users/children             - 子供追加
    PUT    /users/children/{child_id}  - 子供情報更新
    DELETE /users/children/{child_id}  - 子供削除
    ```
  - 実装場所: backend/services/user_service/main.py
  - アーキテクチャ: FastAPI + Mangum, Lambda Layers統合
  - 認証: API Gateway + Cognito Authorizer統合
  - GEMINI.md準拠: 包括的ドキュメント完備

- [x] **2.1.2 DynamoDB操作実装** (完了: 2024-08-03)
  - **User Profile CRUD**: Single Table Design実装完了
    - PK: "USER#{user_id}", SK: "PROFILE"
    - AIキャラクター・褒めレベル設定管理
    - オンボーディング状態管理
    - プライバシーファースト: Cognito subのみ保存
  - **Children管理**: 子供情報の完全CRUD実装
    - PK: "USER#{user_id}", SK: "CHILD#{child_id}"
    - 年齢自動計算、生年月日順ソート
    - 認可制御: ユーザー自身の子供のみアクセス可能
  - 実装場所: backend/services/user_service/database.py
  - アーキテクチャ: Lambda Layers統合、非同期処理、UTC時刻統一
  - テスト: 包括的テストスイート実装済み
    - 10種類のテストケース (database, models, handler)
    - 非同期テスト、モック環境、エラーハンドリング検証
    - 実装場所: tests/backend/services/user_service/

  ```python
  # 実装済み: プライバシー重視のユーザー管理
  class UserServiceDatabase:
      async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
          # Cognito subでのプロフィール取得、個人情報は非保存
      
      async def save_user_profile(self, profile: UserProfile) -> UserProfile:
          # プロフィール保存、updated_at自動更新
      
      async def create_child(self, user_id: str, child_data: ChildInfoCreate) -> ChildInfo:
          # 子供情報作成、UUID自動生成、認可制御
  ```

#### **2.2 tree-service Lambda実装**
```
Priority: 🟡 HIGH
Resources: 512MB, 30秒, 100並列
IAM権限: DynamoDB読み書き、S3読み取り
```

- [ ] **2.2.1 木の成長管理API実装**
  ```
  GET  /api/tree/status              - 木の現在状態取得
  GET  /api/tree/fruits              - 実の一覧取得
  POST /api/tree/fruits/{id}/view    - 実の詳細表示
  GET  /api/tree/growth-history      - 成長履歴取得
  ```

- [ ] **2.2.2 成長システム実装**
  - 文字数ベース成長計算（6段階）
  - 実の生成・管理（1日1回制限）
  - AIロール別テーマカラー対応

### Week 3: AI機能・課金システムLambda実装

#### **3.1 chat-service Lambda実装**
```
Priority: 🔴 CRITICAL (最重要)
Resources: 1024MB, 60秒, 50並列
IAM権限: DynamoDB読み書き、Bedrock、S3読み書き
```

- [ ] **3.1.1 チャット機能API実装**
  ```
  POST /api/chat/messages      - メッセージ送信・AI応答
  GET  /api/chat/history       - チャット履歴取得
  PUT  /api/chat/mood          - 気分変更
  POST /api/chat/emotions      - 感情スタンプ送信
  ```

- [ ] **3.1.2 Bedrock統合実装**
  - Claude 3 Haiku API連携
  - プロンプト効率化（700トークン入力、150トークン出力）
  - エラーハンドリング・リトライ機能
  - レスポンスキャッシュ

- [ ] **3.1.3 AIキャラクターシステム実装**
  ```python
  # 3つのキャラクター設定
  CHARACTERS = {
      "tama": {
          "theme_color": "rose",
          "personality": "下町のベテランおばちゃん",
          "strength": "圧倒的受容力"
      },
      "madoka": {
          "theme_color": "sky", 
          "personality": "バリキャリ共働きママ",
          "strength": "論理的共感"
      },
      "hide": {
          "theme_color": "amber",
          "personality": "元教師の詩人",
          "strength": "静かな言葉の薬"
      }
  }
  ```

- [ ] **3.1.4 感情検出システム実装**
  - キーワードベース + 文脈分析
  - 感情強度スコア計算（1-5段階）
  - 実生成判定ロジック
  - フォールバック機能

- [ ] **3.1.5 気分別応答制御実装**
  - 褒めモード: 具体的行動 + 人間性評価
  - 聞いてモード: 共感・受容重視
  - 助言禁止・比較禁止フィルター

- [ ] **3.1.6 TTL管理実装**
  ```python
  def calculate_ttl(subscription_plan: str, created_at: datetime) -> int:
      """サブスクリプションプランに基づくTTL計算"""
      if subscription_plan in ["monthly", "yearly"]:
          ttl_datetime = created_at + timedelta(days=180)
      else:  # free plan
          ttl_datetime = created_at + timedelta(days=30)
      return int(ttl_datetime.timestamp())
      
  # チャットメッセージ保存時にTTL設定
  chat_item["TTL"] = calculate_ttl(user_subscription_plan, created_at)
  ```

#### **3.2 billing-service Lambda実装**
```
Priority: 🟡 HIGH
Resources: 512MB, 30秒, 50並列
IAM権限: DynamoDB読み書き、Stripe API
```

- [ ] **3.2.1 Stripe課金API実装**
  ```
  POST /api/billing/checkout        - Stripe Checkout セッション作成
  GET  /api/billing/subscription    - サブスクリプション状態取得
  POST /api/billing/cancel          - サブスクリプション解約（期間末解約）
  POST /api/billing/reactivate      - サブスクリプション再開
  GET  /api/billing/portal          - Customer Portal URL取得
  ```

- [ ] **3.2.2 Stripe統合実装**
  - 匿名Customer作成（メールアドレス非保存）
  - 月額¥580・年額¥5,800プラン設定
  - 期間末解約フロー実装
  - プレミアム機能アクセス制御

#### **3.3 webhook-service Lambda実装**
```
Priority: 🔴 CRITICAL（セキュリティ重要）
Resources: 256MB, 15秒, 100並列
IAM権限: DynamoDB読み書き、SQS送信、Stripe API
```

- [ ] **3.3.1 Stripe Webhook処理実装**
  ```
  POST /api/webhook/stripe      - Stripe Webhook処理（署名検証）
  GET  /api/webhook/health      - Webhook エンドポイント死活確認
  ```

- [ ] **3.3.2 セキュリティ実装**
  ```python
  async def verify_stripe_signature(request):
      """Stripe Webhook署名検証（必須）"""
      payload = await request.body()
      sig_header = request.headers.get('stripe-signature')
      
      event = stripe.Webhook.construct_event(
          payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
      )
      return event
  ```

- [ ] **3.3.3 期間末解約対応**
  - `subscription.updated`: 解約予定設定（即座実行）
  - `subscription.deleted`: 解約完了（期間終了時）
  - cancel_scheduled状態管理

#### **3.4 notification-service Lambda実装**
```
Priority: 🟡 HIGH
Resources: 256MB, 15秒, 100並列
IAM権限: DynamoDB読み書き
```

- [ ] **3.4.1 通知管理API実装**
  ```
  GET  /api/notifications               - 未読通知一覧取得
  PUT  /api/notifications/{id}/read     - 通知既読化
  GET  /api/notifications/unread-count  - 未読通知数取得
  POST /internal/notifications/create   - 通知作成（内部API経由のみ）
  ```

- [ ] **3.4.2 通知テーブル操作実装**
  - 課金状態変更通知（解約・再開・決済失敗）
  - プラン変更完了通知
  - 優先度別表示制御

#### **3.5 ttl-updater Lambda実装**
```
Priority: 🟡 HIGH
Resources: 256MB, 300秒, 10並列
IAM権限: DynamoDB読み書き、SQS受信
Trigger: SQSキュー
```

- [ ] **3.5.1 TTL一括更新実装**
  ```python
  async def update_user_chat_ttl(user_id: str, ttl_adjustment: int):
      """プラン切り替え時のTTL一括更新"""
      # ユーザーの全チャット履歴を取得
      response = table.query(
          KeyConditionExpression=Key('PK').eq(f'USER#{user_id}') &
                               Key('SK').begins_with('CHAT#')
      )
      
      # バッチでTTL更新
      with table.batch_writer() as batch:
          for item in response['Items']:
              current_ttl = item.get('TTL')
              if current_ttl:
                  new_ttl = current_ttl + ttl_adjustment
                  batch.put_item(Item={**item, 'TTL': new_ttl})
  ```

- [ ] **3.5.2 内部API経由通知実装**
  - SQS経由での非同期TTL処理
  - 内部API経由でnotification-serviceへ完了通知

#### **3.6 admin-service Lambda実装 (Week 6で詳細実装)**
```
Priority: 🟢 LOW (Week 6で実装予定)
Resources: 512MB, 30秒, 10並列
IAM権限: CloudWatch、DynamoDB、Parameter Store
分離構成: 管理者専用API Gateway + Cognito User Pool
```

- [ ] **3.2.1 管理者専用認証基盤**
  - 管理者専用Cognito User Pool作成
  - Email/Password認証設定
  - 管理者専用API Gateway設定

- [ ] **3.2.2 管理機能API実装**
  ```
  GET  /api/admin/dashboard    - 管理者ダッシュボード
  GET  /api/admin/users        - ユーザー統計・一覧
  GET  /api/admin/metrics      - システムメトリクス
  POST /api/admin/maintenance  - メンテナンス制御
  GET  /api/admin/maintenance  - メンテナンス状態
  ```

- [ ] **3.2.3 Parameter Store連携**
  - メンテナンスフラグ制御
  - 他Lambda共通メンテナンス状態チェック実装

---

## Phase 2: フロントエンド統合 (Week 4-5)

### Week 4: API統合・認証連携

#### **4.1 APIクライアント実装**
```
Priority: 🔴 CRITICAL
フロントエンドからバックエンドへの移行
```

- [ ] **4.1.1 APIクライアント基盤実装**
  ```typescript
  // Before: DemoStorage (localStorage)
  // After: APIClient (REST API)
  
  export class APIClient {
    async getUser(): Promise<User>
    async sendMessage(req: ChatRequest): Promise<ChatResponse>
    async getTreeStatus(): Promise<TreeStatus>
    async updateProfile(profile: UserProfile): Promise<void>
  }
  ```

- [ ] **4.1.2 型定義統合**
  - OpenAPI仕様書からTypeScript型生成
  - フロントエンド・バックエンド型定義統一
  - API契約の厳密な実装

#### **4.2 認証システム統合**
```
Priority: 🔴 CRITICAL
AWS Amplify Auth + Cognito統合 (バックエンドauth-service不要)
```

- [ ] **4.2.1 Amplify Auth統合**
  ```typescript
  // 認証フック実装 - 自動リフレッシュ対応
  export const useAuth = () => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      // 認証状態監視・自動更新
      const unsubscribe = Hub.listen('auth', ({ payload }) => {
        switch (payload.event) {
          case 'signedIn': handleSignedIn(payload.data); break;
          case 'signedOut': handleSignedOut(); break;
          case 'tokenRefresh': handleTokenRefresh(); break;
          case 'tokenRefresh_failure': handleTokenRefreshFailure(); break;
        }
      });
      return unsubscribe;
    }, []);
    
    const getValidToken = async () => {
      try {
        const session = await fetchAuthSession();
        return session.tokens?.accessToken?.toString() || '';
      } catch (error) {
        await signOut(); // トークン失敗時は再認証
        return '';
      }
    };
    
    return { user, loading, getValidToken, signOut };
  };
  ```

- [ ] **4.2.2 認証状態管理**
  - JWT自動更新・ヘッダー自動付与
  - 認証エラーハンドリング (401 → 再認証)
  - ルート保護実装
  - API呼び出し時のトークン自動添付

- [ ] **4.2.3 Cognito トークン設定**
  ```json
  {
    "access_token_validity": "1 hour",
    "id_token_validity": "1 hour",
    "refresh_token_validity": "30 days",
    "refresh_token_rotation": true
  }
  ```


- [ ] **4.2.4 オンボーディングフロー実装**
  ```typescript
  // オンボーディング状態管理
  export const useOnboarding = () => {
    const [onboardingStatus, setOnboardingStatus] = useState<'loading' | 'required' | 'completed'>('loading');
    
    const checkOnboardingStatus = async () => {
      const response = await apiClient.get('/api/users/onboarding-status');
      setOnboardingStatus(response.data.onboarding_completed ? 'completed' : 'required');
    };
    
    const completeOnboarding = async (nickname: string) => {
      await apiClient.post('/api/users/complete-onboarding', { nickname });
      setOnboardingStatus('completed');
    };
    
    return { onboardingStatus, checkOnboardingStatus, completeOnboarding };
  };
  ```

- [ ] **4.2.5 メンテナンス処理実装**
  ```typescript
  // API Interceptorでメンテナンス検知
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 503) {
        useMaintenanceStore.getState().setMaintenance(error.response.data);
      }
      return Promise.reject(error);
    }
  );
  ```
  - 503エラー検知とメンテナンス画面表示
  - グローバル状態管理 (Zustand)
  - 復旧予定時刻表示
  - 自動リロード機能

#### **4.3 状態管理最適化**
```
Priority: 🟡 HIGH
Zustand導入による軽量化
```

- [ ] **4.3.1 グローバル状態設計**
  ```typescript
  interface AppState {
    user: User | null;
    selectedAiRole: AiRole;
    currentMood: MoodType;
    treeStatus: TreeStatus;
    chatHistory: ChatMessage[];
    maintenance: MaintenanceState;  // メンテナンス状態追加
  }
  
  interface MaintenanceState {
    isMaintenanceMode: boolean;
    maintenanceInfo: MaintenanceInfo | null;
  }
  ```

### Week 5: UI/UX最適化・本番対応

#### **5.1 エラーハンドリング強化**
```
Priority: 🟡 HIGH
本番環境での信頼性確保
```

- [ ] **5.1.1 エラー境界実装**
  - React Error Boundary
  - API エラー統一処理
  - ユーザーフレンドリーエラー表示
  - メンテナンス画面コンポーネント実装

- [ ] **5.1.2 オンボーディング画面実装**
  ```typescript
  // components/onboarding/NicknameRegistration.tsx
  export const NicknameRegistration = ({ onComplete }) => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          ニックネームを教えてください
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          アプリ内で表示される名前です。いつでも変更できます。
        </p>
        <form onSubmit={handleSubmit}>
          <input 
            type="text"
            placeholder="例: ほのぼのママ"
            maxLength={20}
            required
          />
          <button type="submit">はじめる</button>
        </form>
      </div>
    </div>
  );
  ```

- [ ] **5.1.3 リトライ・フォールバック**
  - API呼び出しリトライ
  - オフライン対応
  - 部分的機能停止対応

#### **5.2 パフォーマンス最適化**
```
Priority: 🟡 HIGH
UX向上とコスト削減
```

- [ ] **5.2.1 コード分割実装**
  ```javascript
  // Dynamic Import最適化
  const ChatScreen = lazy(() => import('./ChatScreen'));
  const TreeView = lazy(() => import('./TreeView'));
  ```

- [ ] **5.2.2 キャッシュ戦略実装**
  - React Query導入検討
  - API レスポンスキャッシュ
  - 画像最適化

#### **5.3 本番環境設定**
```
Priority: 🔴 CRITICAL
本番リリース準備
```

- [ ] **5.3.1 環境変数管理**
  ```bash
  NEXT_PUBLIC_API_URL=https://api.homebiyori.com
  NEXT_PUBLIC_COGNITO_USER_POOL_ID=...
  NEXT_PUBLIC_COGNITO_CLIENT_ID=...
  ```

- [ ] **5.3.2 Build設定最適化**
  - Next.js本番ビルド設定
  - バンドルサイズ最適化
  - 静的アセット最適化

---

## Phase 3: 本番リリース準備 (Week 6)

### Week 6: テスト・監視・運用準備・管理者機能

#### **6.1 テスト実装**
```
Priority: 🔴 CRITICAL
品質保証とリリース準備
```

- [ ] **6.1.1 ローカルテスト環境構築**
  ```bash
  # テスト環境セットアップ
  # DynamoDB Local + Lambda Local環境
  
  # 必要なツール
  pip install python-lambda-local pytest pytest-asyncio moto
  npm install -g dynamodb-local
  ```

- [ ] **6.1.2 DynamoDB Localテスト環境**
  ```python
  # conftest.py - pytest設定
  import pytest
  import boto3
  from moto import mock_dynamodb
  import subprocess
  import time
  import os
  
  @pytest.fixture(scope="session")
  def dynamodb_local():
      """DynamoDB Localプロセス起動"""
      # DynamoDB Local起動
      process = subprocess.Popen([
          'java', '-Djava.library.path=./DynamoDBLocal_lib',
          '-jar', 'DynamoDBLocal.jar', '-sharedDb', '-port', '8000'
      ])
      time.sleep(3)  # 起動待機
      
      yield
      
      # プロセス終了
      process.terminate()
      process.wait()
  
  @pytest.fixture
  def dynamodb_client(dynamodb_local):
      """DynamoDB Local接続クライアント"""
      return boto3.client(
          'dynamodb',
          endpoint_url='http://localhost:8000',
          region_name='us-east-1',
          aws_access_key_id='test',
          aws_secret_access_key='test'
      )
  
  @pytest.fixture
  def setup_test_table(dynamodb_client):
      """テスト用テーブル作成"""
      table_name = 'homebiyori-data-test'
      
      try:
          dynamodb_client.create_table(
              TableName=table_name,
              KeySchema=[
                  {'AttributeName': 'PK', 'KeyType': 'HASH'},
                  {'AttributeName': 'SK', 'KeyType': 'RANGE'}
              ],
              AttributeDefinitions=[
                  {'AttributeName': 'PK', 'AttributeType': 'S'},
                  {'AttributeName': 'SK', 'AttributeType': 'S'},
                  {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
                  {'AttributeName': 'GSI1SK', 'AttributeType': 'S'}
              ],
              GlobalSecondaryIndexes=[
                  {
                      'IndexName': 'GSI1',
                      'KeySchema': [
                          {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                          {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
                      ],
                      'Projection': {'ProjectionType': 'ALL'},
                      'BillingMode': 'PAY_PER_REQUEST'
                  }
              ],
              BillingMode='PAY_PER_REQUEST'
          )
          
          # テーブル作成完了待機
          waiter = dynamodb_client.get_waiter('table_exists')
          waiter.wait(TableName=table_name)
          
      except dynamodb_client.exceptions.ResourceInUseException:
          pass  # テーブルが既に存在
      
      yield table_name
      
      # テーブル削除
      try:
          dynamodb_client.delete_table(TableName=table_name)
      except:
          pass
  ```

- [ ] **6.1.3 Lambda Localテスト実装**
  ```python
  # test_chat_service.py
  import pytest
  import json
  import os
  from lambda_local.main import run
  from unittest.mock import patch, MagicMock
  
  class TestChatServiceLambda:
      @pytest.fixture
      def lambda_event(self):
          """Lambda実行用イベント"""
          return {
              "httpMethod": "POST",
              "path": "/api/chat/messages",
              "headers": {
                  "Authorization": "Bearer test-jwt-token",
                  "Content-Type": "application/json"
              },
              "body": json.dumps({
                  "message": "今日は疲れました",
                  "ai_role": "tama",
                  "mood": "listen",
                  "chat_type": "individual"
              })
          }
      
      @pytest.fixture
      def lambda_context(self):
          """Lambda実行コンテキスト"""
          class MockContext:
              function_name = "chat-service"
              function_version = "$LATEST"
              invoked_function_arn = "arn:aws:lambda:us-east-1:123456789012:function:chat-service"
              memory_limit_in_mb = 1024
              remaining_time_in_millis = lambda: 30000
              
          return MockContext()
      
      def test_send_message_success_local(self, lambda_event, lambda_context, setup_test_table):
          """メッセージ送信成功テスト（Lambda Local）"""
          # 環境変数設定
          os.environ.update({
              'DYNAMODB_ENDPOINT': 'http://localhost:8000',
              'DYNAMODB_TABLE': setup_test_table,
              'AWS_DEFAULT_REGION': 'us-east-1'
          })
          
          # Bedrock APIモック
          with patch('boto3.client') as mock_boto:
              mock_bedrock = MagicMock()
              mock_bedrock.invoke_model.return_value = {
                  'body': MagicMock(read=lambda: json.dumps({
                      'completion': 'お疲れ様でした。今日も一日頑張りましたね。'
                  }).encode())
              }
              mock_boto.return_value = mock_bedrock
              
              # Lambda Local実行
              result = run(
                  file_path='chat-service/handler.py',
                  event=lambda_event,
                  context=lambda_context
              )
              
              # 結果検証
              assert result['statusCode'] == 200
              response_body = json.loads(result['body'])
              assert 'ai_response' in response_body
              assert response_body['ai_response'] != ''
      
      def test_bedrock_api_failure_fallback_local(self, lambda_event, lambda_context, setup_test_table):
          """Bedrock API障害時のフォールバック検証"""
          os.environ.update({
              'DYNAMODB_ENDPOINT': 'http://localhost:8000',
              'DYNAMODB_TABLE': setup_test_table
          })
          
          # Bedrock API障害をシミュレート
          with patch('boto3.client') as mock_boto:
              mock_bedrock = MagicMock()
              mock_bedrock.invoke_model.side_effect = Exception("Bedrock API Error")
              mock_boto.return_value = mock_bedrock
              
              result = run(
                  file_path='chat-service/handler.py',
                  event=lambda_event,
                  context=lambda_context
              )
              
              # フォールバック応答の確認
              assert result['statusCode'] == 200
              response_body = json.loads(result['body'])
              assert 'ai_response' in response_body
              # フォールバック応答が含まれることを確認
              assert 'お話を聞かせてくれてありがとう' in response_body['ai_response']
  ```

- [ ] **6.1.4 統合テスト実装**
  ```python
  # test_integration.py
  import pytest
  import requests
  import json
  import subprocess
  import time
  
  class TestLambdaIntegration:
      @pytest.fixture(scope="class")
      def lambda_services(self, setup_test_table):
          """複数Lambdaサービスの起動"""
          processes = []
          
          # 各Lambda関数をローカルで起動 (auth-serviceは不要)
          services = [
              {'name': 'chat-service', 'port': 3002},
              {'name': 'tree-service', 'port': 3003},
              {'name': 'user-service', 'port': 3004},
              {'name': 'health-check', 'port': 3005}
          ]
          
          for service in services:
              # SAM Local または python-lambda-local でサービス起動
              process = subprocess.Popen([
                  'python-lambda-local',
                  f"{service['name']}/handler.py",
                  f"--port={service['port']}"
              ])
              processes.append(process)
              time.sleep(2)  # 起動待機
          
          yield services
          
          # プロセス終了
          for process in processes:
              process.terminate()
              process.wait()
      
      def test_full_chat_flow_integration(self, lambda_services, setup_test_table):
          """完全なチャットフロー統合テスト"""
          base_url = "http://localhost"
          
          # 1. Cognito認証トークン（モック）
          # テスト環境では有効なJWTトークンを直接生成
          jwt_token = "mock-cognito-jwt-token-for-test"
          headers = {"Authorization": f"Bearer {jwt_token}"}
          
          # 2. ユーザープロフィール取得
          profile_response = requests.get(f"{base_url}:3004/api/users/profile", headers=headers)
          assert profile_response.status_code == 200
          
          # 3. チャットメッセージ送信
          chat_response = requests.post(f"{base_url}:3002/api/chat/messages", 
              headers=headers,
              json={
                  "message": "今日は子供と公園で遊びました",
                  "ai_role": "tama",
                  "mood": "praise"
              }
          )
          assert chat_response.status_code == 200
          chat_data = chat_response.json()
          assert 'ai_response' in chat_data
          
          # 4. 木の状態確認
          tree_response = requests.get(f"{base_url}:3003/api/tree/status", headers=headers)
          assert tree_response.status_code == 200
          tree_data = tree_response.json()
          assert tree_data['total_characters'] > 0
  ```

- [ ] **6.1.5 フロントエンドテスト**
  ```typescript
  // __tests__/ChatScreen.test.tsx
  import { render, screen, fireEvent, waitFor } from '@testing-library/react';
  import { rest } from 'msw';
  import { setupServer } from 'msw/node';
  import ChatScreen from '@/components/features/ChatScreen';
  
  // MSW サーバー設定
  const server = setupServer(
    rest.post('/api/chat/messages', (req, res, ctx) => {
      return res(ctx.json({
        message_id: 'test-123',
        ai_response: 'テスト応答です',
        emotion_detected: 'joy',
        fruit_generated: true,
        tree_growth: {
          previous_stage: 1,
          current_stage: 2,
          total_characters: 50
        }
      }));
    })
  );
  
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  
  describe('ChatScreen', () => {
    test('メッセージ送信が正常に動作する', async () => {
      render(<ChatScreen />);
      
      const input = screen.getByPlaceholderText('メッセージを入力...');
      const sendButton = screen.getByRole('button', { name: /送信/ });
      
      fireEvent.change(input, { target: { value: 'テストメッセージ' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('テスト応答です')).toBeInTheDocument();
      });
    });
    
    test('AI応答エラー時のフォールバック表示', async () => {
      server.use(
        rest.post('/api/chat/messages', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
        })
      );
      
      render(<ChatScreen />);
      
      const input = screen.getByPlaceholderText('メッセージを入力...');
      const sendButton = screen.getByRole('button', { name: /送信/ });
      
      fireEvent.change(input, { target: { value: 'エラーテスト' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText(/申し訳ございません/)).toBeInTheDocument();
      });
    });
  });
  ```

- [ ] **6.1.6 E2Eテスト（本番環境類似）**
  ```typescript
  // e2e/chat-flow.spec.ts
  import { test, expect } from '@playwright/test';
  
  test.describe('チャット機能E2E', () => {
    test.beforeEach(async ({ page }) => {
      // DynamoDB Local + Lambda Local環境への接続
      await page.goto('http://localhost:3000');
    });
    
    test('完全なチャットフロー', async ({ page }) => {
      // 1. 認証（Google OAuth モック）
      await page.click('[data-testid="google-login"]');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // 2. AIキャラクター選択
      await page.click('[data-testid="character-tama"]');
      await page.click('[data-testid="start-chat"]');
      
      // 3. メッセージ送信
      await page.fill('[data-testid="chat-input"]', '今日は疲れました');
      await page.click('[data-testid="send-button"]');
      
      // 4. AI応答確認
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 10000 });
      
      // 5. 木の成長確認
      await expect(page.locator('[data-testid="tree-growth"]')).toContainText('成長');
      
      // 6. 実の生成確認（感情検出された場合）
      const fruitElement = page.locator('[data-testid="fruit-notification"]');
      if (await fruitElement.isVisible()) {
        await expect(fruitElement).toContainText('実ができました');
      }
    });
    
    test('複数キャラクターでのグループチャット', async ({ page }) => {
      await page.click('[data-testid="group-chat"]');
      
      // キャラクター選択
      await page.click('[data-testid="select-tama"]');
      await page.click('[data-testid="select-madoka"]');
      
      // メッセージ送信
      await page.fill('[data-testid="chat-input"]', '今日は良い一日でした');
      await page.click('[data-testid="send-button"]');
      
      // 複数AI応答確認
      await expect(page.locator('[data-testid="ai-message-tama"]')).toBeVisible();
      await expect(page.locator('[data-testid="ai-message-madoka"]')).toBeVisible();
    });
  });
  ```

#### **6.2 監視・ログ実装**
```
Priority: 🟡 HIGH
運用監視体制構築
```

- [ ] **6.2.1 構造化ログ実装**
  ```python
  # AWS Lambda Powertools
  from aws_lambda_powertools import Logger, Tracer, Metrics
  
  logger = Logger(service="homebiyori")
  tracer = Tracer(service="homebiyori") 
  metrics = Metrics(service="homebiyori")
  ```

- [ ] **6.2.2 CloudWatch ダッシュボード**
  - Lambda メトリクス監視
  - API エラー率監視
  - Bedrock API使用量監視
  - ユーザーアクティビティ監視

#### **6.3 CI/CD パイプライン**
```
Priority: 🟡 HIGH
自動デプロイ体制構築
```

- [ ] **6.3.1 GitHub Actions設定**
  ```yaml
  # .github/workflows/deploy.yml
  name: Deploy Production
  on:
    push:
      branches: [main]
  
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - name: Run Backend Tests
          run: pytest
        - name: Run Frontend Tests
          run: npm test
    
    deploy:
      needs: test
      runs-on: ubuntu-latest
      steps:
        - name: Deploy Infrastructure
          run: terraform apply -auto-approve
        - name: Deploy Applications
          run: |
            # Lambda functions deployment
            # Frontend build & S3 deployment
  ```

#### **6.4 管理者機能実装 (優先度低)**
```
Priority: 🟢 LOW
管理者専用システム構築
```

- [ ] **6.4.1 管理者認証基盤構築**
  - 管理者専用Cognito User Pool作成
  - admin-api.homebiyori.com ドメイン設定
  - 管理者専用API Gateway設定

- [ ] **6.4.2 管理者ダッシュボードAPI実装**
  ```python
  # ユーザー統計レスポンス例
  {
    "total_users": 127,
    "premium_users": 23,
    "weekly_new_users": 8,
    "db_usage_mb": 45.2,
    "recent_users": [
      {"user_id": "a1b2c3d4-...", "nickname": "ほのぼのママ", "subscription_plan": "premium", "created_at": "2024-08-01"},
      ...
    ]
  }
  ```

- [ ] **6.4.3 メンテナンス制御実装**
  ```python
  # Parameter Store設定
  /homebiyori/maintenance/enabled = false
  /homebiyori/maintenance/message = "システムメンテナンス中です"
  /homebiyori/maintenance/end_time = "2024-08-01T15:00:00Z"
  ```

- [ ] **6.4.4 全Lambda共通メンテナンスチェック**
  - FastAPIミドルウェアでメンテナンス状態確認
  - メンテナンス中は503エラーとメッセージ返却
  - Parameter Store値のキャッシュ最適化

- [ ] **6.4.5 フロントエンド メンテナンス連携テスト**
  - 503エラー応答の動作確認
  - メンテナンス画面表示テスト
  - 復旧後の自動復帰テスト
  - 異なるメンテナンスメッセージの表示確認

#### **6.5 セキュリティ検証**
```
Priority: 🔴 CRITICAL
本番環境セキュリティ確保
```

- [ ] **6.5.1 セキュリティスキャン**
  - 依存関係脆弱性スキャン
  - コードセキュリティ分析
  - インフラセキュリティ検証

- [ ] **6.5.2 ペネトレーションテスト**
  - API セキュリティテスト
  - 認証フロー検証 (ユーザー・管理者両方)
  - データ保護確認

- [ ] **6.5.3 プライバシー・データ保護監査**
  - 個人情報がDynamoDBに保存されていないことの確認
  - ニックネーム以外の個人識別情報の非保存確認
  - JWTクレームからの一時取得機能のみの確認
  - GDPR/個人情報保護法準拠性チェック
  - ログに個人情報が含まれていないことの確認

---

## 実装マイルストーン & 成功指標

### 📊 週次マイルストーン

| Week | マイルストーン | 成功指標 |
|------|-------------|---------|
| **Week 1** | API Gateway + Cognito認証完成 | Google OAuth認証成功率 > 95% |
| **Week 2** | データ管理完成 | API レスポンス時間 < 500ms |
| **Week 3** | AI機能完成 | Bedrock API成功率 > 99% |
| **Week 4** | API統合完成 | フロントエンド・バックエンド統合成功 |
| **Week 5** | UI最適化完成 | Core Web Vitals すべて Good |
| **Week 6** | 本番リリース | 全機能正常動作、監視体制完備 |

### 💰 コスト目標

**月間100アクティブユーザー想定コスト: $15.85**

| サービス | 月額コスト | 最適化ポイント |
|---------|----------|-------------|
| Amazon Bedrock | $1.20 | プロンプト効率化 |
| DynamoDB | $2.50 | Single Table Design |
| Lambda (8 functions) | $0.45 | 負荷特性別最適化 |
| API Gateway | $0.35 | 効率的なルーティング |
| CloudFront | $8.50 | CDN最適化 |
| Cognito | $0.55 | 認証サービス |
| その他 | $2.75 | 運用・監視コスト |

### 🎯 技術品質指標

**性能目標:**
- API レスポンス時間: < 2秒 (95th percentile)
- フロントエンド初期表示: < 3秒
- Bedrock API成功率: > 99%
- システム稼働率: > 99.9%

**プライバシー目標:**
- 個人情報のDB保存: 0件 (ニックネームのみ)
- 個人識別可能情報の漏洩: 0件
- GDPR準拠率: 100%

**開発効率:**
- コードカバレッジ: > 80%
- ビルド時間: < 5分
- デプロイ時間: < 10分
- 障害復旧時間: < 30分

### 🚀 リリース後展開

**Phase 4: 機能拡張 (Month 2-3)**
- グループチャット機能強化
- 新AIキャラクター追加
- 高度な感情分析

**Phase 5: スケーリング (Month 4-6)**
- マルチリージョン展開
- パフォーマンス最適化
- コスト最適化

---

## 開発方針と品質保証

### 🧪 定期的ローカルテスト戦略

**テストファースト開発**: バックエンド機能は切りの良いところまで作成した時点で**必ず**ローカルテストを実行

#### **ローカルテスト実施タイミング**
- [ ] **Lambda関数1つ完成時**: 単体テスト + DynamoDB Local統合テスト
- [ ] **API エンドポイント2-3個完成時**: APIテスト + レスポンス検証
- [ ] **認証・権限周り完成時**: 認証フロー統合テスト
- [ ] **データモデル変更時**: データ整合性テスト
- [ ] **エラーハンドリング追加時**: 異常系テスト

#### **ローカルテスト環境構築**
```bash
# 必須ツールセットアップ（初回のみ）
pip install pytest pytest-asyncio moto python-lambda-local boto3-stubs
npm install -g dynamodb-local

# テスト実行（各Lambda完成時）
pytest tests/ -v --tb=short                    # 単体テスト
pytest tests/integration/ -v                   # 統合テスト
python-lambda-local handler.py event.json      # Lambda Local実行テスト
```

#### **継続的品質チェック**
```bash
# コード品質チェック（毎回実施）
ruff check --fix                              # Python コードリント・自動修正
ruff format                                   # Python コードフォーマット
mypy app/                                     # 型チェック
pytest --cov=app --cov-report=html           # カバレッジ測定
```

### 📋 コーディング標準（GEMINI.md準拠）

#### **1. 包括的コメント記述**
```python
# ✅ 良い例：初心者でも理解できる詳細コメント
async def calculate_ttl(subscription_plan: str, created_at: datetime) -> int:
    """
    サブスクリプションプランに基づいてチャットメッセージのTTL（Time To Live）を計算
    
    Args:
        subscription_plan: ユーザーのサブスクリプションプラン
                          - "free": 無料プラン（30日保持）
                          - "monthly"/"yearly": プレミアムプラン（180日保持）
        created_at: メッセージ作成日時（UTCタイムスタンプ）
    
    Returns:
        TTL値（UNIX タイムスタンプ形式）
        DynamoDBが自動削除に使用する値
        
    Note:
        - DynamoDBのTTLは秒単位のUNIXタイムスタンプを要求
        - プラン変更時のTTL調整はttl-updater Lambdaで処理
    """
    # プレミアムプランの場合：6ヶ月（180日）保持
    if subscription_plan in ["monthly", "yearly"]:
        retention_days = 180
    else:
        # 無料プランの場合：1ヶ月（30日）保持
        retention_days = 30
    
    # 作成日時に保持期間を加算してTTL算出
    ttl_datetime = created_at + timedelta(days=retention_days)
    
    # DynamoDB TTL形式（UNIX秒）に変換
    return int(ttl_datetime.timestamp())
```

#### **2. 変更意図の明確化**
```python
# ✅ 変更理由と選択根拠を明記
class ChatRequest(BaseModel):
    """
    チャットメッセージリクエストモデル
    
    設計意図：
    - プライバシー保護：個人識別情報は一切含まない
    - Bedrock最適化：プロンプト長制限（700トークン）を考慮
    - 感情検出支援：AIが文脈理解しやすい構造化データ
    """
    message: str = Field(
        ..., 
        min_length=1, 
        max_length=1000,
        description="ユーザーメッセージ（1000文字制限でBedrock効率化）"
    )
    
    ai_role: Literal["tama", "madoka", "hide"] = Field(
        ...,
        description="選択AIキャラクター（プロンプト最適化のため制限）"
    )
    
    mood: Literal["praise", "listen"] = Field(
        default="praise",
        description="期待する応答タイプ（AI応答品質向上のため）"
    )
    
    # 変更履歴：chat_typeフィールドを削除
    # 理由：グループチャット機能は後のフェーズで実装予定
    # 現在は個人チャットのみサポートしてコード複雑性を削減
```

#### **3. テストコード包括的文書化**
```python
"""
chat-service Lambda テストスイート

テスト項目一覧：
[T001] メッセージ送信成功（正常系）
[T002] Bedrock API障害時フォールバック
[T003] 不正なJWTトークン検証
[T004] DynamoDB書き込み失敗処理
[T005] プレミアムユーザーTTL設定
[T006] 無料ユーザーTTL設定
[T007] 感情検出による実生成
[T008] 文字数制限エラー
[T009] AIロール不正値エラー
[T010] レスポンス時間性能テスト
"""

class TestChatService:
    def test_send_message_success(self, lambda_event, setup_test_table):
        """
        [T001] メッセージ送信成功（正常系）
        
        テスト観点：
        - 正常なメッセージがBedrockに送信される
        - AI応答がDynamoDBに正しく保存される
        - TTLが適切に設定される
        - レスポンス形式が仕様通り
        """
        # テスト実装...
        
    def test_bedrock_api_failure_fallback(self, lambda_event, setup_test_table):
        """
        [T002] Bedrock API障害時フォールバック
        
        テスト観点：
        - Bedrock API障害をシミュレート
        - フォールバック応答が返される
        - エラーがCloudWatchに適切にログ出力される
        - ユーザーには障害を感じさせない
        """
        # テスト実装...
```

### 🔧 実装時の具体的ワークフロー

#### **Lambda関数実装サイクル**
1. **設計**: 機能要件→API仕様→データモデル設計
2. **実装**: コメント重視のコード作成
3. **単体テスト**: pytest実行（毎回）
4. **統合テスト**: DynamoDB Local連携（毎回）
5. **ローカル動作確認**: python-lambda-local実行
6. **コード品質チェック**: ruff + mypy実行
7. **次の機能へ**: または統合フェーズへ

#### **エラー対応時の記録**
```python
# 実装時に遭遇した問題と解決方法をコメントで記録
async def invoke_bedrock_api(prompt: str) -> str:
    """
    実装メモ：
    - 問題: Bedrock APIのレート制限でThrottlingExceptionが頻発
    - 解決: exponential backoffによるリトライ実装
    - 参考: AWS公式ドキュメント xxx
    """
    for attempt in range(3):
        try:
            # Bedrock API呼び出し
            pass
        except ClientError as e:
            if e.response['Error']['Code'] == 'ThrottlingException':
                # 指数バックオフでリトライ
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                await asyncio.sleep(wait_time)
                continue
```

## 重要な技術決定事項

### ✅ 確定事項
1. **Lambda分割**: 8つの機能別Lambda Functions（課金システム統合）
2. **認証**: 分離されたAPI Gateway + Cognito Authorizer + Google OAuth
3. **AI**: Amazon Bedrock Claude 3 Haiku
4. **DB**: DynamoDB簡素化設計（単一チャットテーブル+動的TTL管理）
5. **フロントエンド**: Next.js 14 + TypeScript + Tailwind
6. **プライバシー**: 個人情報（email, name）のDB非保存、ニックネーム方式採用
7. **課金システム**: Stripe統合（期間末解約対応）、アプリ内通知システム
8. **セキュリティ**: 3つのAPI Gateway分離、Webhook専用保護
9. **開発品質**: GEMINI.md準拠コーディング標準、定期的ローカルテスト必須

### 🔄 検証・調整事項
1. **Lambda メモリサイズ**: 本番負荷での調整
2. **Bedrock プロンプト**: A/Bテストによる最適化
3. **キャッシュ戦略**: ユーザー行動分析による調整
4. **感情検出精度**: 継続的な改善
5. **プライバシー保護**: 定期的な個人情報保存状況監査

この実装計画により、**高品質なコードと包括的テストを含む6週間での本番環境構築**を実現し、月額$15.85の効率的な運用を達成します。