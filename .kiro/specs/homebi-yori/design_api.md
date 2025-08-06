# API設計書

## エンドポイント一覧

**認証 (分離されたCognito連携)**
- **ユーザー認証**: AWS Amplify Auth + Google OAuth (prod-homebiyori-users)
- **管理者認証**: AWS Amplify Auth + Email/Password (homebiyori-admins)
- JWT自動更新・管理、API Gateway経由で各Lambdaに渡される

## エンドポイント詳細

### チャット機能
- `POST /api/chat/messages` - メッセージ送信
- `GET /api/chat/history` - チャット履歴取得
- `PUT /api/chat/mood` - 気分変更
- `POST /api/chat/emotions` - 感情スタンプ送信

### 木の成長管理
- `GET /api/tree/status` - 木の現在状態取得
- `GET /api/tree/fruits` - 実の一覧取得
- `POST /api/tree/fruits/{fruit_id}/view` - 実の詳細表示

### ユーザー管理
- `GET /api/users/profile` - プロフィール取得
- `PUT /api/users/profile` - プロフィール更新
- `DELETE /api/users/account` - アカウント削除

### 課金・サブスクリプション管理（billing-service）
- `POST /api/billing/checkout` - Stripe Checkout セッション作成 🔐認証必須
- `GET /api/billing/subscription` - サブスクリプション状態取得 🔐認証必須
- `POST /api/billing/cancel` - サブスクリプション解約（期間末解約） 🔐認証必須
- `POST /api/billing/reactivate` - サブスクリプション再開 🔐認証必須
- `GET /api/billing/portal` - Customer Portal URL取得 🔐認証必須

### Webhook処理（webhook-service）
- `POST /api/webhook/stripe` - Stripe Webhook処理 🔒Stripe署名検証のみ
- `GET /api/webhook/health` - Webhook エンドポイント死活確認 ⚡認証不要

### 通知管理（notification-service）
- `GET /api/notifications` - 未読通知一覧取得 🔐認証必須
- `PUT /api/notifications/{id}/read` - 通知既読化 🔐認証必須
- `GET /api/notifications/unread-count` - 未読通知数取得 🔐認証必須
- `POST /api/notifications/create` - 通知作成 🔒Lambda間呼び出しのみ

### システム
- `GET /api/health` - ヘルスチェック

### ユーザーオンボーディング
- `GET /api/users/onboarding-status` - オンボーディング状態確認
- `POST /api/users/complete-onboarding` - ニックネーム登録・オンボーディング完了
- `PUT /api/users/nickname` - ニックネーム変更

### 管理者機能 (admin-api.homebiyori.com)
- `GET /api/admin/dashboard` - 管理者ダッシュボード統計
- `GET /api/admin/users` - ユーザー一覧・詳細統計 (ニックネームのみ表示)
- `GET /api/admin/metrics` - システムメトリクス
- `POST /api/admin/maintenance` - メンテナンス制御
- `GET /api/admin/maintenance` - メンテナンス状態取得

## リクエスト/レスポンス例

### オンボーディング完了
```json
// POST /api/users/complete-onboarding
{
  "nickname": "ほのぼのママ"
}

// Response
{
  "success": true,
  "user": {
    "user_id": "a1b2c3d4-...",
    "nickname": "ほのぼのママ",
    "onboarding_completed": true
  }
}
```

### チャットメッセージ送信
```json
// POST /api/chat/messages
{
  "message": "今日は子供の寝かしつけが大変でした",
  "ai_role": "tama",
  "mood": "listen",
  "chat_type": "individual"
}

// Response
{
  "message_id": "msg_123",
  "ai_response": "お疲れ様でした。寝かしつけって本当に大変ですよね...",
  "emotion_detected": "fatigue",
  "fruit_generated": true,
  "tree_growth": {
    "previous_stage": 2,
    "current_stage": 2,
    "total_characters": 145
  }
}
```

### 木の状態取得
```json
// GET /api/tree/status
// Response
{
  "tree": {
    "current_stage": 3,
    "total_characters": 2450,
    "total_messages": 28,
    "total_fruits": 12,
    "theme_color": "warm_pink"
  },
  "recent_fruits": [
    {
      "fruit_id": "fruit_123",
      "emotion": "joy",
      "created_at": "2024-01-01T12:00:00+09:00"
    }
  ]
}
```

### サブスクリプション状態取得
```json
// GET /api/billing/subscription
// Response
{
  "subscription": {
    "current_plan": "monthly",
    "status": "active",
    "current_period_end": "2024-02-01T00:00:00+09:00",
    "cancel_at_period_end": false
  },
  "features": {
    "chat_retention_days": 180,
    "unlimited_characters": true
  }
}
```

### Stripe Checkout セッション作成
```json
// POST /api/billing/checkout
{
  "plan_type": "monthly",
  "success_url": "https://homebiyori.com/success",
  "cancel_url": "https://homebiyori.com/cancel"
}

// Response
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_...",
  "session_id": "cs_..."
}
```