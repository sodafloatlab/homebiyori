/**
 * 最終統一Hook管理システム
 * 最適化された統一アーキテクチャでのHook提供
 */

// ============================================
// 認証・セキュリティ Hooks
// ============================================

// 認証管理
export { useAuth } from './auth/useAuth';

// メンテナンス管理
export { useMaintenance } from './auth/useMaintenance';

// ユーザープロフィール管理
export { useUserProfile } from './user/useUserProfile';

// ============================================
// 課金・サブスクリプション Hooks
// ============================================

export { 
  useBilling,
  useTrialStatus,
  useAccessControl,
  usePageGuard,
  useDetailedSubscriptionStatus,
  useCheckout,
  useBillingGuidance,
  useSubscription
} from './billing/useBilling';

// サブスクリプションキャンセル
export { useSubscriptionCancel } from './billing/useSubscriptionCancel';

// ============================================
// API統合 Hooks
// ============================================

// Chat API統合Hook
export { useChatAPI } from './api/useChatAPI';

// APIサービス統合Hook
export { 
  useAPIServices,
  useChatService,
  useTreeService
} from '../services/api/APIServiceManager';

// ============================================
// ユーティリティ Hooks
// ============================================

// 非同期操作管理
export { useAsyncOperation } from './utils/useAsyncOperation';

// エラーハンドリング
export { useErrorHandler } from './utils/useErrorHandler';