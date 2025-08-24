### 解約フロー実装（通知連携版）

```javascript
/**
 * サブスクリプション解約処理（期間末解約）
 * 即座に解約せず、現在の課金期間終了時に解約する方式
 * 
 * @param {string} userId - 解約するユーザーID
 * @param {string} reason - 解約理由
 * @param {string} feedback - ユーザーからのフィードバック
 * @returns {object} 処理結果オブジェクト
 */
async function scheduleSubscriptionCancellation(userId, reason, feedback) {
  try {
    // 1. ユーザー情報取得
    const user = await User.findOne({ userId });
    if (!user || !user.subscriptionId) {
      throw new Error('有効なサブスクリプションが見つかりません');
    }
    
    // 2. Stripeでサブスクリプションを期間末解約に設定
    const subscription = await stripe.subscriptions.update(
      user.subscriptionId,
      { 
        cancel_at_period_end: true,                     // 期間終了時に解約
        metadata: { 
          cancellation_reason: reason,                  // 解約理由を保存（分析用）
          feedback: feedback || '',                     // フィードバックを保存
          canceled_by: 'user',                         // 解約主体の記録
          canceled_at: new Date().toISOString()        // 解約操作時刻
        }
      }
    );
    
    // 3. アプリ内DB状態を更新
    await User.updateOne(
      { userId },
      { 
        subscriptionStatus: 'cancel_scheduled',         // 解約予定状態
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        lastStatusCheck: new Date(),                    // 最終確認時刻更新
        cancellationReason: reason                      // アプリ側でも解約理由保存
      }
    );
    
    // 4. アプリ内通知作成（メール代替）
    await createCancellationNotification(userId, subscription.current_period_end);
    
    // 5. 解約理由をSlack等に通知（改善のためのフィードバック収集）
    if (process.env.SLACK_WEBHOOK_URL) {
      await notifySlackCancellation(userId, reason, feedback);
    }
    
    console.log(`解約スケジュール完了: user=${userId}, endDate=${new Date(subscription.current_period_end * 1000)}`);
    
    return {
      success: true,
      endDate: new Date(subscription.current_period_end * 1000),
      message: 'プランの解約手続きが完了しました'
    };
    
  } catch (error) {
    console.error('解約処理エラー:', error);
    throw new Error('解約処理に失敗しました: ' + error.message);
  }
}

/**
 * ログイン時のサブスクリプション状態同期
 * StripeとアプリDBの状態を同期し、変更があれば通知作成
 * 
 * @param {string} userId - 確認するユーザーID
 */
async function syncUserSubscriptionStatus(userId) {
  try {
    const user = await User.findOne({ userId });
    
    // サブスクリプションがない場合はスキップ
    if (!user || !user.subscriptionId) {
      return;
    }
    
    // Stripeから最新のサブスクリプション状態を取得
    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
    const currentStatus = subscription.status;
    const hasStatusChanged = user.subscriptionStatus !== currentStatus;
    
    if (hasStatusChanged) {
      console.log(`状態変更検出: ${user.subscriptionStatus} → ${currentStatus} for user: ${userId}`);
      
      // 状態変更に応じた通知作成
      await createStatusChangeNotification(user, subscription);
      
      // ユーザー情報を最新状態に更新
      await User.updateOne(
        { userId },
        {
          subscriptionStatus: currentStatus,
          subscriptionEndDate: new Date(subscription.current_period_end * 1000),
          lastStatusCheck: new Date(),
          
          // アクティブ状態の場合はプレミアムアクセスを有効化
          premiumAccess: ['active', 'trialing'].includes(currentStatus)
        }
      );
    } else {
      // 状態変更がない場合も最終確認時刻は更新
      await User.updateOne(
        { userId },
        { lastStatusCheck: new Date() }
      );
    }
    
  } catch (error) {
    console.error('状態同期エラー:', error);
    // 同期エラーは致命的ではないため、ログのみ出力
  }
}

/**
 * 状態変更時の通知作成
 * サブスクリプション状態の変更内容に応じて適切な通知を作成
 * 
 * @param {object} user - ユーザーオブジェクト
 * @param {object} subscription - Stripeサブスクリプションオブジェクト
 */
async function createStatusChangeNotification(user, subscription) {
  const userId = user.userId;
  const oldStatus = user.subscriptionStatus;
  const newStatus = subscription.status;
  
  // 状態変更パターンに応じて通知内容を決定
  switch (newStatus) {
    case 'canceled':
      // 解約完了時
      await createNotification(
        userId,
        'subscription_canceled',
        'プラン解約完了',
        'プランが正常に解約されました。ご利用ありがとうございました。',
        { priority: 'normal' }
      );
      break;
      
    case 'past_due':
      // 支払い期限超過時
      await createPaymentFailedNotification(userId);
      break;
      
    case 'active':
      if (oldStatus === 'past_due') {
        // 支払い復旧時
        await createNotification(
          userId,
          'payment_succeeded',
          'お支払い確認完了',
          'お支払いが確認できました。プレミアム機能が再開されました。',
          { priority: 'normal' }
        );
      } else if (oldStatus === 'cancel_scheduled') {
        // 解約キャンセル時
        await createNotification(
          userId,
          'subscription_reactivated',
          'プラン継続決定',
          'プランの解約がキャンセルされました。引き続きプレミアム機能をご利用いただけます。',
          { priority: 'normal' }
        );
      }
      break;
      
    default:
      // その他の状態変更
      console.log(`未対応の状態変更: ${oldStatus} → ${newStatus} for user: ${userId}`);
  }
}

/**
 * サブスクリプション解約取り消し
 * 期間終了前であれば解約をキャンセル可能
 * 
 * @param {string} userId - ユーザーID
 * @returns {object} 処理結果
 */
async function reactivateSubscription(userId) {
  try {
    const user = await User.findOne({ userId });
    
    if (!user || !user.subscriptionId) {
      throw new Error('有効なサブスクリプションが見つかりません');
    }
    
    // Stripeで解約予定をキャンセル
    const subscription = await stripe.subscriptions.update(
      user.subscriptionId,
      { 
        cancel_at_period_end: false,                    // 解約予定をキャンセル
        metadata: {
          reactivated_at: new Date().toISOString(),     // 再開時刻記録
          reactivated_by: 'user'
        }
      }
    );
    
    // DB状態更新
    await User.updateOne(
      { userId },
      { 
        subscriptionStatus: 'active',
        premiumAccess: true,
        lastStatusCheck: new Date(),
        $unset: { cancellationReason: 1 }              // 解約理由をクリア
      }
    );
    
    // 再開通知作成
    await createNotification(
      userId,
      'subscription_reactivated',
      'プラン再開完了',
      'プランの解約がキャンセルされました。引き続きプレミアム機能をご利用いただけます。',
      { priority: 'normal' }
    );
    
    console.log(`サブスクリプション再開: user=${userId}`);
    
    return {
      success: true,
      message: 'プランの解約をキャンセルしました'
    };
    
  } catch (error) {
    console.error('再開処理エラー:', error);
    throw new Error('プラン再開に失敗しました: ' + error.message);
  }
}
```# Stripe課金システム設計ドキュメント

## 概要

個人開発アプリケーションにおけるサブスクリプション課金システムの設計方針。月額課金と年額一括払いの2プランを提供し、プライバシー重視（メールアドレス非保存）のアプローチで、段階的な機能実装により開発効率と運用コストを最適化する。

## サービス構成

### 利用するStripeサービス

| サービス | 用途 | 必要度 |
|---------|------|--------|
| **Stripe Billing** | サブスクリプション管理・定期課金処理 | 必須 |
| **Stripe Checkout** | 決済フォーム（ホストされたページ） | 必須 |
| **Customer Portal** | 顧客向けセルフサービス管理画面 | 必須 |
| **Webhooks** | 課金状態のリアルタイム同期 | 必須 |
| **アプリ内通知システム** | メール代替の状態通知機能 | 必須 |

### 提供プラン

- **月額プラン**: ¥580/月
- **年額プラン**: ¥5,800/年（2ヶ月分お得）

## Phase 1（MVP）実装方針

### 機能分担

#### Stripe Customer Portal担当
- ✅ 決済方法の変更・更新
- ✅ プラン変更（月額 ⇔ 年額）
- ✅ 請求履歴の閲覧
- ✅ 次回請求日の確認
- ❌ **解約機能は無効化**

#### 独自実装担当
- ✅ 解約フロー
- ✅ 解約理由の収集
- ✅ 解約確認・警告表示
- ✅ 解約取り消し機能
- ✅ **アプリ内通知システム**
- ✅ **状態変更の可視化**

### Customer Portal設定

```javascript
const portalConfiguration = {
  business_profile: {
    headline: 'アカウント管理',
  },
  features: {
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: false },      // 解約は無効化
    subscription_pause: { enabled: false },
    invoice_history: { enabled: true }
  }
};
```

## 技術実装

### データベース設計

```javascript
// User Schema（プライバシー重視設計）
{
  userId: { type: String, unique: true },    // アプリ独自のユーザーID
  // email: 保存しない（プライバシー重視）
  stripeCustomerId: String,                  // Stripe連携用ID
  subscriptionId: String,                    // サブスクリプションID
  subscriptionStatus: {                      // active, canceled, past_due, etc.
    type: String,
    enum: ['active', 'canceled', 'cancel_scheduled', 'past_due', 'unpaid'],
    default: null
  },
  currentPlan: {                            // monthly, yearly
    type: String,
    enum: ['monthly', 'yearly'],
    default: null
  },
  subscriptionEndDate: Date,                // 次回請求日 or 解約日
  premiumAccess: Boolean,                   // プレミアム機能アクセス権
  lastStatusCheck: Date,                    // 最終状態確認日時
  createdAt: Date,
  updatedAt: Date
}

// Notification Schema（アプリ内通知）
{
  userId: String,                           // 通知対象ユーザー
  type: {                                   // 通知種別
    type: String,
    enum: [
      'subscription_canceled',
      'subscription_reactivated', 
      'payment_succeeded',
      'payment_failed',
      'plan_changed'
    ]
  },
  title: String,                           // 通知タイトル
  message: String,                         // 通知メッセージ
  isRead: { type: Boolean, default: false },
  priority: {                              // 優先度
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  actionUrl: String,                       // アクション用URL（任意）
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date                          // 通知の有効期限
}
```

### Webhook監視イベント

```javascript
const requiredWebhookEvents = [
  'customer.subscription.created',    // 新規登録
  'customer.subscription.updated',    // プラン変更・解約予定設定
  'customer.subscription.deleted',    // 解約完了（期間終了時）
  'invoice.payment_succeeded',        // 決済成功
  'invoice.payment_failed'            // 決済失敗
];
```

### Webhook処理の詳細実装

```javascript
/**
 * Webhook処理 - サブスクリプション更新時
 * 解約予定設定と解約キャンセルを区別して処理
 * 
 * 重要：cancel_at_period_end設定時は即座にWebhookが配信される
 * 実際の解約は期間終了時にsubscription.deletedで配信
 */
async function handleSubscriptionUpdated(subscription) {
  const userId = await getUserIdFromStripeCustomer(subscription.customer);
  
  if (subscription.cancel_at_period_end) {
    // 解約予定が設定された場合（即座に実行される処理）
    console.log(`解約予定設定: user=${userId}, 解約日=${new Date(subscription.current_period_end * 1000)}`);
    
    await User.updateOne(
      { userId },
      {
        subscriptionStatus: 'cancel_scheduled',        // 解約予定状態
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        premiumAccess: true,                          // 期間内はまだアクセス可能
        lastStatusCheck: new Date(),
        cancellationDate: new Date(subscription.current_period_end * 1000)
      }
    );
    
    // 解約予定の通知作成（即座に）
    await createCancellationNotification(userId, subscription.current_period_end);
    
  } else if (subscription.status === 'active' && !subscription.cancel_at_period_end) {
    // 解約予定がキャンセルされた場合
    console.log(`解約キャンセル: user=${userId}`);
    
    await User.updateOne(
      { userId },
      {
        subscriptionStatus: 'active',
        premiumAccess: true,
        lastStatusCheck: new Date(),
        $unset: { 
          cancellationReason: 1,                      // 解約理由をクリア
          cancellationDate: 1
        }
      }
    );
    
    // 解約キャンセルの通知作成
    await createReactivationNotification(userId);
  }
  
  // その他のプラン変更処理...
}

/**
 * Webhook処理 - サブスクリプション削除時
 * 実際の解約実行時の処理（期間終了時に実行）
 */
async function handleSubscriptionDeleted(subscription) {
  const userId = await getUserIdFromStripeCustomer(subscription.customer);
  
  console.log(`サブスクリプション解約完了: user=${userId}`);
  
  await User.updateOne(
    { userId },
    {
      subscriptionStatus: 'canceled',                 // 解約完了
      premiumAccess: false,                          // アクセス権剥奪
      subscriptionEndDate: new Date(subscription.canceled_at * 1000),
      lastStatusCheck: new Date()
    }
  );
  
  // 解約完了の通知作成
  await createSubscriptionDeletedNotification(userId);
}

/**
 * プレミアム機能アクセス判定
 * DBの状態とStripeの期間を両方チェックして正確な判定
 */
async function checkPremiumAccess(userId) {
  try {
    const user = await User.findOne({ userId });
    
    if (!user || !user.subscriptionId) {
      return { hasAccess: false, reason: 'no_subscription' };
    }
    
    // cancel_scheduledの場合は期間終了まで利用可能
    if (user.subscriptionStatus === 'cancel_scheduled') {
      const now = new Date();
      const endDate = user.subscriptionEndDate;
      
      if (now <= endDate) {
        return { 
          hasAccess: true, 
          reason: 'cancel_scheduled',
          expiresAt: endDate,
          warningMessage: `利用期限: ${endDate.toLocaleDateString('ja-JP')}`
        };
      } else {
        // 期間終了後（Webhookが遅延した場合の保険処理）
        console.log(`期間終了検出 - Webhook遅延の可能性: user=${userId}`);
        
        // 強制的にアクセス権を剥奪
        await User.updateOne(
          { userId },
          { 
            subscriptionStatus: 'canceled',
            premiumAccess: false
          }
        );
        
        return { hasAccess: false, reason: 'subscription_expired' };
      }
    }
    
    // アクティブな場合
    if (user.subscriptionStatus === 'active') {
      return { hasAccess: true, reason: 'active' };
    }
    
    return { hasAccess: false, reason: user.subscriptionStatus };
    
  } catch (error) {
    console.error('アクセス判定エラー:', error);
    return { hasAccess: false, reason: 'error' };
  }
}

/**
 * プレミアム機能ミドルウェア
 * API呼び出し時のアクセス制御とタイミング管理
 */
async function requirePremiumAccess(req, res, next) {
  const userId = req.user.userId;
  const accessCheck = await checkPremiumAccess(userId);
  
  if (!accessCheck.hasAccess) {
    return res.status(403).json({
      error: 'プレミアム機能へのアクセスが必要です',
      reason: accessCheck.reason,
      upgrade_url: '/pricing'
    });
  }
  
  // 解約予定の場合は警告ヘッダーを追加
  if (accessCheck.reason === 'cancel_scheduled') {
    res.setHeader('X-Subscription-Warning', accessCheck.warningMessage);
    res.setHeader('X-Expires-At', accessCheck.expiresAt.toISOString());
  }
  
  next();
}
```

### Stripe Customer作成（匿名）

```javascript
/**
 * 匿名Customer作成関数
 * メールアドレスを保存せずにStripe Customerを作成
 * 
 * @param {string} userId - アプリ内のユーザーID
 * @returns {object} Stripe Customer オブジェクト
 */
async function createAnonymousCustomer(userId) {
  try {
    // Stripeで匿名Customerを作成
    // メールアドレスは不要、metadataでアプリユーザーと紐付け
    const customer = await stripe.customers.create({
      metadata: {
        app_user_id: userId,           // アプリ内ユーザーIDで識別
        anonymous: 'true',             // 匿名フラグ
        created_by: 'app_registration' // 作成元の識別
      }
      // email: 意図的に設定しない（プライバシー重視）
    });
    
    // DB内のユーザー情報にStripe Customer IDを保存
    await User.updateOne(
      { userId: userId },
      { stripeCustomerId: customer.id }
    );
    
    console.log(`匿名Customer作成完了: ${customer.id} for user: ${userId}`);
    return customer;
    
  } catch (error) {
    console.error('Customer作成エラー:', error);
    throw new Error('課金アカウントの作成に失敗しました');
  }
}

/**
 * Stripe Checkout セッション作成（匿名対応）
 * メールアドレス収集を無効化して課金フローを開始
 * 
 * @param {string} userId - ユーザーID
 * @param {string} priceId - 選択されたプランのPrice ID
 * @returns {object} Checkout セッションオブジェクト
 */
async function createCheckoutSession(userId, priceId) {
  try {
    const user = await User.findOne({ userId });
    
    // Customer IDが存在しない場合は新規作成
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await createAnonymousCustomer(userId);
      customerId = customer.id;
    }
    
    // Checkoutセッション作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,                    // 事前作成した匿名Customer
      collect_email_addresses: false,         // 重要：メール収集を無効化
      line_items: [{
        price: priceId,                       // monthly or yearly price ID
        quantity: 1,
      }],
      mode: 'subscription',                   // サブスクリプションモード
      
      // 成功時のリダイレクト先
      // session_idを渡してサーバー側で処理確認可能
      success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      
      // キャンセル時のリダイレクト先
      cancel_url: `${process.env.APP_URL}/pricing`,
      
      // セッションメタデータ（デバッグ・分析用）
      metadata: {
        app_user_id: userId,
        flow_type: 'subscription_creation'
      }
    });
    
    console.log(`Checkoutセッション作成: ${session.id} for user: ${userId}`);
    return session;
    
  } catch (error) {
    console.error('Checkoutセッション作成エラー:', error);
    throw new Error('決済フローの開始に失敗しました');
  }
}
```

**重要な注意点:**
- **Customer作成は必須です** - StripeでサブスクリプションはCustomerに紐付く
- 匿名Customer = メールアドレスなしのCustomer（Stripe上では通常のCustomer）
- `collect_email_addresses: false`によりCheckout時のメール入力を回避
- metadataでアプリユーザーとの紐付けを管理

### アプリ内通知システム

```javascript
/**
 * 通知作成ヘルパー関数
 * 様々な種類の通知を統一的に作成・管理
 * 
 * @param {string} userId - 通知対象のユーザーID
 * @param {string} type - 通知種別（enum値）
 * @param {string} title - 通知タイトル
 * @param {string} message - 通知本文
 * @param {object} options - オプション設定
 * @returns {object} 作成された通知オブジェクト
 */
async function createNotification(userId, type, title, message, options = {}) {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      priority: options.priority || 'normal',           // デフォルトは通常優先度
      actionUrl: options.actionUrl || null,             // アクションボタンのURL
      expiresAt: options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // デフォルト30日後に期限切れ
      isRead: false                                     // 初期状態は未読
    });
    
    console.log(`通知作成完了: ${type} for user: ${userId}`);
    return notification;
    
  } catch (error) {
    console.error('通知作成エラー:', error);
    throw error;
  }
}

/**
 * 解約時の通知作成
 * ユーザーがプランを解約した際の重要通知
 * 
 * @param {string} userId - ユーザーID
 * @param {number} endTimestamp - 解約日時（Unix timestamp）
 */
async function createCancellationNotification(userId, endTimestamp) {
  // Unix timestampを日本時間の日付文字列に変換
  const endDate = new Date(endTimestamp * 1000);
  const formattedDate = endDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  await createNotification(
    userId,
    'subscription_canceled',
    'プラン解約のお知らせ',
    `プランの解約手続きが完了しました。${formattedDate}まではプレミアム機能をご利用いただけます。解約をキャンセルすることも可能です。`,
    { 
      priority: 'high',                                 // 高優先度（目立つ表示）
      actionUrl: '/account/reactivate',                 // 解約キャンセル用URL
      expiresAt: new Date(endTimestamp * 1000)          // 解約日まで表示
    }
  );
}

/**
 * 決済失敗時の通知作成
 * 緊急度の高い通知のため、高優先度で作成
 * 
 * @param {string} userId - ユーザーID
 */
async function createPaymentFailedNotification(userId) {
  await createNotification(
    userId,
    'payment_failed',
    'お支払いに問題があります',
    '決済処理に失敗しました。カードの有効期限切れや残高不足の可能性があります。決済方法を更新してください。',
    { 
      priority: 'high',                                 // 高優先度
      actionUrl: '/account/billing',                    // Customer Portal URL
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1週間後に期限切れ
    }
  );
}

/**
 * プラン変更時の通知作成
 * 月額⇔年額変更時の確認通知
 * 
 * @param {string} userId - ユーザーID
 * @param {string} oldPlan - 変更前のプラン
 * @param {string} newPlan - 変更後のプラン
 */
async function createPlanChangeNotification(userId, oldPlan, newPlan) {
  const planNames = {
    monthly: '月額プラン（¥580/月）',
    yearly: '年額プラン（¥5,800/年）'
  };
  
  await createNotification(
    userId,
    'plan_changed',
    'プラン変更完了',
    `プランが${planNames[oldPlan]}から${planNames[newPlan]}に変更されました。次回請求から新料金が適用されます。`,
    { 
      priority: 'normal',
      actionUrl: '/account'                             // アカウント確認用
    }
  );
}

/**
 * 未読通知取得関数
 * ダッシュボード表示用の通知一覧を取得
 * 
 * @param {string} userId - ユーザーID
 * @returns {array} 未読通知の配列
 */
async function getUnreadNotifications(userId) {
  try {
    // 未読かつ有効期限内の通知を優先度順で取得
    const notifications = await Notification.find({
      userId,
      isRead: false,
      expiresAt: { $gt: new Date() }                    // 有効期限内のみ
    })
    .sort({ 
      priority: -1,                                     // 優先度順（high > normal > low）
      createdAt: -1                                     // 新しい順
    })
    .limit(10);                                         // 最大10件まで
    
    return notifications;
    
  } catch (error) {
    console.error('通知取得エラー:', error);
    return [];
  }
}

/**
 * 通知既読化関数
 * ユーザーが通知を確認した際に呼び出し
 * 
 * @param {string} notificationId - 通知ID
 * @param {string} userId - ユーザーID（セキュリティ確認用）
 */
async function markNotificationAsRead(notificationId, userId) {
  try {
    await Notification.updateOne(
      { 
        _id: notificationId, 
        userId                                          // 他ユーザーの通知を操作されないよう確認
      },
      { 
        isRead: true,
        readAt: new Date()                              // 既読時刻も記録（分析用）
      }
    );
    
    console.log(`通知既読化: ${notificationId} by user: ${userId}`);
    
  } catch (error) {
    console.error('通知既読化エラー:', error);
  }
}
```

## ユーザーフロー

### 新規登録フロー
1. アプリでプラン選択（月額 or 年額）
2. 匿名Customer作成（メールアドレス不要）
3. Stripe Checkoutで決済
4. Webhookでアカウント状態更新
5. プレミアム機能解放

### アカウント管理フロー
```
アカウント設定ページ
├── 【通知エリア】未読通知の表示
├── 現在のプラン・状態表示
├── [決済・プラン管理] → Customer Portal
└── [プラン解約] → 独自解約ページ
    ├── 解約理由選択
    ├── フィードバック入力
    ├── 解約確認・実行
    └── アプリ内通知作成
```

### 通知確認フロー
```
ページ共通ヘッダー
├── 画面右上に通知アイコン（🔔）
├── 未読数バッジ表示
├── クリックで通知ドロップダウン表示
└── 各通知にアクションボタン配置

通知ドロップダウン
├── 未読通知一覧（最新5件）
├── 重要な通知（決済失敗等）をハイライト
├── 「すべて表示」リンク → 通知一覧ページ
└── 個別通知の既読化
```

### 解約フロー詳細
1. 独自解約ページで理由・フィードバック収集
2. 期間末解約を設定（即座解約は行わない）
3. **Webhook即座配信**（`subscription.updated`）
4. **アプリ内通知作成**（メール代替）
5. **解約予定状態で期間内は継続利用可能**
6. **期間終了時にWebhook配信**（`subscription.deleted`）
7. **アクセス権剥奪とサービス停止**
8. ログイン時に状態変更を通知表示

### Webhookタイミングの重要な注意点

**期間末解約の場合:**
- `cancel_at_period_end: true`設定時 → **即座に**`subscription.updated`配信
- 実際の期間終了時 → `subscription.deleted`配信
- **アプリ側でタイミング制御が必要**

**状態管理パターン:**
```
1. 解約操作 → cancel_scheduled（即座）
2. 期間内 → プレミアム機能利用可能
3. 期間終了 → canceled（アクセス権剥奪）
```

## セキュリティ・運用

### Webhook検証
```javascript
// 署名検証による偽装防止
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body, 
  sig, 
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### エラーハンドリング
- Webhook処理の冪等性確保
- 決済失敗時の段階的リトライ
- 異常状態の監視・アラート

### データ分析
- 解約理由の収集・分析
- MRR（月次定期収益）追跡
- チャーン率の監視
- **通知の開封率・アクション率追跡**

## Phase 2以降の拡張計画

### 段階的な自作化
- 使用頻度の高い機能から順次自作
- Customer Portalは補完的役割に移行
- より柔軟なUI/UX提供

### 追加機能候補
- プラン一時停止機能
- 使用量ベース課金
- 複数プラン提供
- クーポン・割引機能

## 開発工数見積もり

### Phase 1実装
- Stripe Billing設定: 0.5日
- Checkout統合（匿名Customer対応）: 1日
- Webhook実装（期間末解約対応）: 1.5日
- 独自解約ページ: 1日
- **アプリ内通知システム**: 1.5日
- **状態同期処理**: 0.5日
- **アクセス制御・タイミング管理**: 1日
- テスト・検証: 1日

**総工数: 8日**

### 運用コスト
- Stripe手数料: 3.6%（国内カード）
- 初期費用・月額固定費: なし
- 開発・保守工数: 最小限

## リスク・注意事項

### 技術リスク
- Webhook配信失敗時の状態不整合
- **期間末解約でのWebhookタイミング制御の複雑性**
- 決済失敗時のアカウント状態管理
- **通知の見落とし（ユーザーがログインしない場合）**
- **Webhook遅延時のアクセス制御**
- テスト環境での十分な検証が必要

### ビジネスリスク
- 解約率の監視・改善施策が重要
- Customer Portal UIの制約
- **メール通知なしによる重要情報の伝達漏れ**
- **期間末解約でのユーザー混乱の可能性**
- Stripe規約・手数料変更への対応

### プライバシー・コンプライアンス
- **個人情報保護法・GDPR対応が簡素化**
- **メールアドレス非保存によるデータ漏洩リスク軽減**
- **ユーザー同意の簡素化**

---

# PaymentHistory管理戦略設計（追記）

## 概要

ほめびよりアプリケーションにおける決済履歴管理の3フェーズ戦略。
コンプライアンス要件、ユーザビリティ、運用効率を両立する段階的実装アプローチ。

## 現状と課題

### 現状
- billing_serviceがStripe Customer Portal方式に移行
- webhook_serviceはStripe環境からのみアクセス可能
- フロントエンドからの直接的な決済履歴取得が困難
- Issue #15統一戦略による機能簡素化の流れ

### 課題
- 法的・コンプライアンス要件による決済履歴保存の必要性
- ユーザーの決済履歴アクセス需要
- 内部運用での決済データ分析・管理需要
- システム責任分離とセキュリティの両立

## 3フェーズ戦略

### Phase 1: DB保存機能復旧（webhook_service）

**目的**: 決済データの確実な保存とコンプライアンス対応

**実装範囲**:
- webhook_service/database.pyにsave_payment_history()メソッド復旧
- stripe_webhook.pyで決済成功/失敗イベント時のDB保存処理
- DynamoDB Single Table Designに基づく効率的なデータ保存
- payment_models.pyの復旧（DB保存用モデルのみ）

**データ保存仕様**:
```python
# DynamoDB保存形式
PK: "USER#{user_id}"
SK: "PAYMENT#{timestamp}#{payment_id}"
Type: "payment_history"
```

**保存データ項目**:
- user_id: ユーザーID
- stripe_payment_intent_id: Stripe決済意図ID
- amount: 決済金額（円）
- status: 決済ステータス（succeeded/failed）
- billing_period_start/end: 課金期間
- subscription_id: サブスクリプションID
- created_at: 作成日時（JST）
- metadata: 追加情報（JSON）

### Phase 2: ユーザー向けアクセス（Stripe Customer Portal）

**目的**: セキュアで使いやすい決済履歴アクセス環境の提供

**実装範囲**:
- billing_serviceでStripe Customer Portal Session作成
- フロントエンドからの直接Stripe Portal連携
- ユーザー自身による安全な決済履歴確認
- 請求書ダウンロード機能の活用

**技術仕様**:
- Stripe Billing Portal Session API活用
- HTTPS必須、セッション有効期限管理
- 認証済みユーザーのみアクセス可能
- モバイル対応のレスポンシブUI

**メリット**:
- Stripeの公式UI使用によるセキュリティ強化
- 決済方法変更、領収書発行等の追加機能
- webhook_serviceの負荷軽減
- PCI DSS準拠の確実性

### Phase 3: 内部管理機能（admin_service）

**目的**: 管理者・CS向けの包括的決済データ管理

**実装範囲**:
- admin_service新規作成（管理者専用）
- DynamoDB決済履歴データの検索・分析機能
- CSV/Excel出力による帳票作成
- 決済トレンド分析・レポート生成

**admin_service機能詳細**:
```
/api/admin/payments/
├── GET /list                    # 決済履歴一覧取得
├── GET /user/{user_id}          # 特定ユーザーの決済履歴
├── GET /export/csv              # CSV出力
├── GET /analytics/summary       # 売上サマリー
└── GET /analytics/trends        # トレンド分析
```

**認証・認可**:
- 管理者専用JWT認証
- IP制限によるアクセス制御
- 操作ログの記録と監査

## システム構成図

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Frontend │    │ Admin Interface │    │ Stripe Webhook  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ Phase 2              │ Phase 3              │ Phase 1
          │                      │                      │
    ┌─────▼──────┐         ┌─────▼──────┐         ┌─────▼──────┐
    │  billing   │         │   admin    │         │  webhook   │
    │  service   │         │  service   │         │  service   │
    └─────┬──────┘         └─────┬──────┘         └─────┬──────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                           ┌─────▼──────┐
                           │  DynamoDB  │
                           │ (Payment   │
                           │ History)   │
                           └────────────┘
```

## 実装優先順位

1. **Phase 1 (高)**: 決済データ保存の確実性確保
2. **Phase 2 (中)**: ユーザビリティ向上
3. **Phase 3 (低)**: 運用効率化・分析機能

## セキュリティ・コンプライアンス

### データ保護
- DynamoDB暗号化（保存時・転送時）
- 最小権限の原則によるIAM設定
- 決済データアクセスの監査ログ

### データ保持ポリシー
- 法的要件: 7年間保存（会計法準拠）
- DynamoDB TTL: 法定保存期間後の自動削除
- GDPR対応: ユーザー削除時の関連データ削除

### API セキュリティ
- 全API通信HTTPS必須
- JWT認証による適切な認可制御
- Rate Limiting による過度なアクセス防止

## 運用・監視

### ログ・監視
- 決済処理の成功/失敗ログ
- CloudWatch Alarms によるエラー検知
- 月次決済データ整合性チェック

### バックアップ・災害復旧
- DynamoDB Point-in-Time Recovery有効化
- Cross-Region レプリケーション（必要に応じて）
- 決済データ復旧手順の文書化

## コスト見積

### Phase 1
- DynamoDB書き込み: $0.05/月（100ユーザー想定）
- Lambda実行時間増加: $0.02/月

### Phase 2  
- 追加コストなし（Stripe標準機能活用）

### Phase 3
- Lambda新規作成: $0.10/月
- DynamoDB読み取り追加: $0.03/月

**合計**: 約$0.20/月の増加（想定ユーザー数100名）

---

## 実装状況

### Phase 1: DB保存機能復旧 ✅ 完了（2025-08-23）
- webhook_service PaymentHistory復旧完了
- DynamoDB Single Table Design対応
- 7年保存TTL設定
- Stripe Webhook連携による自動DB保存

### Phase 2: Stripe Customer Portal ✅ 完了（既存機能確認済み）
- billing_service/main.py `/api/billing/portal` エンドポイント確認
- stripe_client.py Customer Portal session作成機能確認
- ユーザー向け決済履歴アクセス機能完備

### Phase 3: admin_service決済履歴管理機能 ✅ 完了（2025-08-23）
- admin_service/models.py PaymentHistory管理モデル追加
- admin_service/main.py Phase 3 APIエンドポイント実装:
  - `GET /api/admin/payments/list` - 決済履歴一覧取得
  - `GET /api/admin/payments/user/{user_id}` - 特定ユーザー決済履歴
  - `GET /api/admin/payments/analytics/summary` - 決済分析サマリー
  - `GET /api/admin/payments/analytics/trends` - 決済トレンド分析
  - `POST /api/admin/payments/export` - CSV/Excel エクスポート
- admin_service/database.py 決済データアクセス機能実装
- 管理者認証・操作ログ記録対応

**PaymentHistory 3フェーズ戦略実装完了**: コンプライアンス対応、ユーザーアクセス、内部管理機能の包括的PaymentHistory管理システム構築達成

---

## まとめ

この設計により、個人開発でも本格的なSaaSレベルのサブスクリプション機能を短期間・低コストで実現可能。**プライバシー重視のアプローチ**により、個人情報保護規制への対応を簡素化し、**アプリ内通知システム**でメール代替の確実な情報伝達を実現。段階的な機能拡張により、事業成長に応じて柔軟にシステムを進化させることができる。

**PaymentHistory管理の3フェーズ戦略**により、決済履歴管理における以下を実現：

1. **コンプライアンス**: 法的要件を満たす確実なデータ保存
2. **ユーザビリティ**: Stripe Portal活用によるセキュアなアクセス
3. **運用効率**: admin_service による包括的な内部管理機能
4. **コスト効率**: 段階的実装による最小限のコスト増加
5. **セキュリティ**: 各フェーズでの適切なセキュリティ対策

### 主な特徴
- **メールアドレス非保存**でプライバシー保護
- **アプリ内通知**による確実な状態変更通知
- **段階的実装**による開発リスク軽減
- **Stripe生態系**を活用した保守性の高い設計
- **決済履歴管理の3フェーズ戦略**による完全性とシステム保守性の両立