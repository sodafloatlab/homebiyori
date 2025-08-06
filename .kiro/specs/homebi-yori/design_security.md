# セキュリティ設計書

## 認証・認可

### 1. Amazon Cognito設定
- Google OAuth 2.0統合
- JWT トークンベース認証
- リフレッシュトークンローテーション有効

### 2. トークン有効期限設定
```json
{
  "access_token_validity": "1 hour",
  "id_token_validity": "1 hour", 
  "refresh_token_validity": "30 days",
  "refresh_token_rotation": true
}
```

### 3. API Gateway認証
- Cognito Authorizerを使用
- 全APIエンドポイントで認証必須
- レート制限: 100req/min/user

### 4. セッション管理戦略

**基本方針: Cognito JWT中心**
- 認証状態はフロントエンドのJWTで管理
- 自動リフレッシュによる透明な認証更新
- サーバー側は状態を持たない (ステートレス)

## Cognito ユーザー識別システム

### 基本原則: Cognito `sub` をプライマリーキーとして使用

**1. 認証フロー:**
```
Google OAuth → Cognito User Pool → JWT発行
JWT.sub = "uuid-4" (Cognito固有のユーザーID)
```

**2. Lambda内ユーザー識別:**
```python
# utils/auth.py
def get_user_id_from_event(event) -> str:
    """API Gateway Cognito AuthorizerからユーザーID取得"""
    try:
        claims = event['requestContext']['authorizer']['claims']
        user_id = claims['sub']  # Cognito UUID (例: "a1b2c3d4-...")
        return user_id
    except KeyError:
        raise UnauthorizedError("User not authenticated")

def get_user_email_from_event(event) -> str:
    """ユーザーメールアドレス取得"""
    claims = event['requestContext']['authorizer']['claims']
    return claims.get('email', '')
```

**3. DynamoDB データ構造 (プライバシー重視):**
```
Users テーブル:
PK: "USER#{cognito_sub}"     # 例: "USER#a1b2c3d4-e5f6-..."
SK: "PROFILE"

データ:
{
  "user_id": "a1b2c3d4-e5f6-...",  # Cognito sub
  "nickname": "ほのぼのママ",        # ユーザー設定ニックネーム
  "onboarding_completed": true,     # オンボーディング完了フラグ
  "created_at": "2024-08-01T10:00:00Z",
  "nickname_updated_at": "2024-08-01T10:05:00Z"
}

注意: Googleアカウント情報（email, name）はDynamoDBに保存しない
```

### 4. 初回ログイン時の処理 (オンボーディング必須)
```python
# user-service/handlers/profile.py
async def ensure_user_exists(user_id: str):
    """初回ログイン時に最小限のユーザー記録作成"""
    existing = await get_user_profile(user_id)
    if not existing:
        # 個人情報を含まない最小限の記録のみ作成
        await create_user_profile({
            "user_id": user_id,
            "onboarding_completed": False,  # ニックネーム登録待ち
            "created_at": datetime.utcnow().isoformat()
        })
        return "onboarding_required"
    elif not existing.get("onboarding_completed"):
        return "onboarding_required"
    else:
        return "user_ready"

async def complete_onboarding(user_id: str, nickname: str):
    """オンボーディング完了とニックネーム設定"""
    # ニックネーム検証 (不適切な文字列チェック等)
    validated_nickname = validate_nickname(nickname)
    
    await update_user_profile(user_id, {
        "nickname": validated_nickname,
        "onboarding_completed": True,
        "nickname_updated_at": datetime.utcnow().isoformat()
    })
```

### 5. フロントエンド認証状態管理

**Amplify Auth設定:**
```typescript
// amplify/auth/resource.ts
export const authConfig = {
  loginWith: {
    oauth: {
      domain: 'homebiyori-auth',
      scopes: ['openid', 'email', 'profile'],
      redirectSignIn: ['http://localhost:3000/', 'https://homebiyori.com/'],
      redirectSignOut: ['http://localhost:3000/', 'https://homebiyori.com/'],
      responseType: 'code',
    },
  },
  userAttributes: {
    email: { required: true },
    name: { required: false },
  },
};
```

## データ保護

### 1. プライバシー保護原則
- **最小限データ収集**: Cognito subとニックネームのみ保存
- **個人識別情報排除**: メールアドレス、実名、子供情報は保存しない
- **データ匿名化**: 必要に応じてユーザーIDの匿名化が可能

### 2. データ暗号化
- **転送時暗号化**: 全通信でHTTPS/TLS 1.2以上を使用
- **保存時暗号化**: DynamoDB、S3で暗号化有効
- **API Gateway**: AWS WAFによる保護

### 3. アクセス制御
- **IAM最小権限**: 各Lambda関数に必要最小限の権限のみ付与
- **VPC分離**: Lambda関数をVPC内に配置（必要に応じて）
- **セキュリティグループ**: 適切なネットワーク制限

### 4. 監査・ログ
- **CloudTrail**: API呼び出しの完全ログ記録
- **CloudWatch**: アプリケーションログとメトリクス
- **AWS Config**: 設定変更の追跡