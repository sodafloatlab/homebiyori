# API設計書

## エンドポイント一覧

**認証 (分離されたCognito連携)**
- **ユーザー認証**: AWS Amplify Auth + Google OAuth (prod-homebiyori-users)
- **管理者認証**: AWS Amplify Auth + Email/Password (homebiyori-admins)
- JWT自動更新・管理、API Gateway経由で各Lambdaに渡される

## エンドポイント詳細

### チャット機能
- `POST /api/chat/messages` - メッセージ送信・AI応答生成 🔐認証必須
- `GET /api/chat/history` - チャット履歴取得 🔐認証必須
- `PUT /api/chat/mood` - 気分変更 🔐認証必須
- `POST /api/chat/emotions` - 感情スタンプ送信 🔐認証必須

### 木の成長管理
- `GET /api/tree/status` - 木の現在状態取得 🔐認証必須
- `POST /api/tree/update-growth` - 木の成長更新 🔒内部API認証のみ
- `PUT /api/tree/theme` - 木のテーマカラー更新 🔐認証必須
- `POST /api/tree/generate-fruit` - 実の生成 🔒内部API認証のみ
- `GET /api/tree/fruits` - 実の一覧取得 🔐認証必須
- `GET /api/tree/fruits/{fruit_id}` - 実の詳細取得 🔐認証必須
- `GET /api/tree/history` - 成長履歴取得 🔐認証必須

### ユーザー管理
- `GET /users/profile` - ユーザープロフィール取得 🔐認証必須
- `PUT /users/profile` - ユーザープロフィール更新 🔐認証必須
- `PUT /users/ai-preferences` - AI設定（キャラクター・褒めレベル）更新 🔐認証必須
- `GET /users/account-status` - アカウント・サブスクリプション状態取得 🔐認証必須
- `POST /users/request-deletion` - アカウント削除要求（段階的プロセス開始） 🔐認証必須
- `POST /users/confirm-deletion` - アカウント削除実行（最終確認後） 🔐認証必須


### 課金・サブスクリプション管理（billing-service）
- `GET /api/billing/subscription` - ユーザーサブスクリプション状態取得 🔐認証必須
- `POST /api/billing/subscription` - サブスクリプション作成（Stripe Checkout） 🔐認証必須
- `POST /api/billing/subscription/cancel` - サブスクリプション解約（期間末） 🔐認証必須
- `PUT /api/billing/payment-method` - 支払方法更新 🔐認証必須
- `GET /api/billing/history` - 支払履歴取得 🔐認証必須
- `POST /api/billing/portal` - Customer Portal セッション作成 🔐認証必須

### Webhook処理（webhook-service）
- `POST /api/webhook/stripe` - Stripe Webhook処理 🔒Stripe署名検証のみ
- `GET /api/webhook/health` - Webhook エンドポイント死活確認 ⚡認証不要

### 通知管理（notification-service）
#### ユーザー向け通知API
- `GET /api/notifications` - ユーザー通知一覧取得 🔐認証必須
- `GET /api/notifications/stats` - ユーザー通知統計取得 🔐認証必須
- `GET /api/notifications/{notification_id}` - 通知詳細取得 🔐認証必須
- `PUT /api/notifications/{notification_id}/read` - 通知既読化 🔐認証必須

#### 内部API（Lambda間連携）
- `POST /internal/notifications` - 通知作成 🔒内部API認証のみ
- `POST /internal/notifications/bulk` - 一括通知作成 🔒内部API認証のみ
- `DELETE /internal/notifications/{user_id}/{notification_id}` - 通知削除 🔒内部API認証のみ

#### 管理者通知機能
- `POST /admin/notifications` - 管理者通知作成 🔐管理者認証必須
- `POST /admin/notifications/maintenance` - メンテナンス通知作成 🔐管理者認証必須
- `GET /admin/notifications` - 管理者通知一覧取得 🔐管理者認証必須
- `POST /admin/notifications/{notification_id}/send` - 管理者通知配信実行 🔐管理者認証必須
- `DELETE /admin/notifications/{notification_id}` - 管理者通知削除 🔐管理者認証必須
- `GET /admin/notifications/stats` - 管理者通知統計取得 🔐管理者認証必須

### システム・ヘルスチェック
- `GET /api/health` - 基本ヘルスチェック（health_check_service） ⚡認証不要
- `GET /health` - 各サービス個別ヘルスチェック ⚡認証不要
  - admin_service
  - billing_service  
  - tree_service
  - user_service
  - webhook_service

### ユーザーオンボーディング
- `GET /users/onboarding-status` - オンボーディング状態確認 🔐認証必須
- `POST /users/complete-onboarding` - ニックネーム登録・オンボーディング完了 🔐認証必須

### 問い合わせ機能（contact-service）
- `POST /api/contact/submit` - 問い合わせ送信・運営者通知 🔓認証任意（認証時はuser_id自動設定）
- `GET /api/contact/categories` - 問い合わせカテゴリ一覧取得 ⚡認証不要
- `POST /api/contact/test-notification` - テスト通知送信（開発環境のみ） 🔐管理者認証必須

### 管理者機能 (admin-api.homebiyori.com)
- `GET /api/admin/dashboard/metrics` - システムメトリクス取得 🔐管理者認証必須
- `GET /api/admin/users/statistics` - ユーザー統計情報取得 🔐管理者認証必須
- `GET /api/admin/maintenance/status` - メンテナンス状態取得 🔐管理者認証必須
- `POST /api/admin/maintenance/control` - メンテナンス制御 🔐管理者認証必須

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
  "ai_role": "mittyan",
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

### アカウント・サブスクリプション状態取得
```json
// GET /users/account-status
// Response
{
  "account": {
    "user_id": "user123",
    "nickname": "ほのぼのママ",
    "created_at": "2024-01-01T00:00:00+09:00",
    "status": "active"
  },
  "subscription": {
    "status": "active",
    "current_plan": "monthly",
    "current_period_end": "2024-02-01T00:00:00+09:00",
    "cancel_at_period_end": false
  },
  "data_summary": {
    "total_chat_messages": 150,
    "tree_growth_characters": 5420,
    "total_fruits": 12,
    "data_size_mb": 2.3
  }
}
```

### アカウント削除要求（段階的プロセス開始）
```json
// POST /users/request-deletion
{
  "deletion_type": "account_with_subscription", // "account_only", "subscription_only", "account_with_subscription"
  "reason": "service_no_longer_needed", // オプション
  "feedback": "ありがとうございました" // オプション
}

// Response
{
  "deletion_request_id": "del_req_abc123",
  "process_steps": [
    {
      "step": 1,
      "title": "サブスクリプション状態確認",
      "completed": true
    },
    {
      "step": 2,
      "title": "削除内容詳細説明",
      "completed": false,
      "next": true
    },
    {
      "step": 3,
      "title": "最終確認と実行",
      "completed": false
    }
  ],
  "subscription_action_required": true,
  "data_to_be_deleted": [
    "チャット履歴 (150メッセージ)",
    "木の成長データ (5,420文字)",
    "ユーザープロフィール",
    "AI設定情報",
    "ほめの実データ (12個)"
  ],
  "warning": "この操作は元に戻せません"
}
```

### アカウント削除実行（最終確認後）
```json
// POST /users/confirm-deletion
{
  "deletion_request_id": "del_req_abc123",
  "confirmation_text": "削除", // ユーザーが入力する確認文字
  "final_consent": true
}

// Response
{
  "deletion_started": true,
  "estimated_completion": "2024-01-01T12:05:00+09:00",
  "process_id": "proc_xyz789",
  "actions_performed": [
    {
      "action": "subscription_cancelled",
      "status": "completed",
      "timestamp": "2024-01-01T12:00:30+09:00"
    },
    {
      "action": "dynamodb_data_deletion",
      "status": "in_progress",
      "estimated_completion": "2024-01-01T12:02:00+09:00"
    },
    {
      "action": "cognito_account_deletion", 
      "status": "pending",
      "estimated_completion": "2024-01-01T12:05:00+09:00"
    }
  ],
  "message": "アカウント削除処理を開始しました。完了後、自動的にログアウトされます。",
  "support_contact": "support@homebiyori.com"
}
```

### アカウント削除エラーレスポンス例
```json
// エラーケース：サブスクリプション解約失敗
{
  "error": "subscription_cancellation_failed",
  "error_message": "サブスクリプションの自動解約に失敗しました",
  "error_details": {
    "stripe_error": "card_declined",
    "next_steps": [
      "Stripeカスタマーポータルから手動で解約してください",
      "解約完了後、再度アカウント削除をお試しください"
    ],
    "customer_portal_url": "https://billing.stripe.com/p/session/...",
    "support_contact": "support@homebiyori.com"
  },
  "can_retry": true,
  "account_deletion_blocked": true
}
```