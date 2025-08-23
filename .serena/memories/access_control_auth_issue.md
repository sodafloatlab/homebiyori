# 全サービス共通 @require_basic_access() 認証問題

## 🚨 重大な問題発見

### 問題の概要
全サービスで使用されている`@require_basic_access()`デコレーターにおいて、`AccessControlClient`がbilling_serviceへのHTTP通信でJWT認証を実装していない。

### 影響範囲
- **chat_service**: 4エンドポイント
- **billing_service**: 12エンドポイント  
- **tree_service**: 6エンドポイント
- **user_service**: 6エンドポイント
- **notification_service**: 6エンドポイント

**合計: 34エンドポイント**が影響を受ける

### 問題のメカニズム

```
フロントエンド → API Gateway → Cognito認証 → サービス
                                     ↓         ↓
                                 JWT検証   @require_basic_access()
                                              ↓
                           billing_service ← HTTP (JWT認証なし) ← AccessControlClient
                                 ↓
                            認証エラー
```

### 現在の実装問題

#### AccessControlClient.check_user_access()
```python
async with http_client.get(
    f"{self.billing_service_url}/api/billing/access-control",
    headers={"X-User-ID": user_id}  # JWT認証ヘッダーなし
) as response:
```

### 必要な修正

1. **AccessControlClient修正**
   - JWT認証ヘッダー追加機能
   - require_access()からJWTトークン受け渡し

2. **require_access()デコレーター修正**
   - JWT抽出機能統合
   - AccessControlClientへのJWT転送

3. **全サービス影響**
   - 実装は共通Layerなので一箇所修正で全サービス対応

### 緊急度
- **HIGH**: 全サービスの認証機能に影響
- 現在はエラーフォールバック（アクセス拒否）で動作中
- 本格運用開始前に修正必須