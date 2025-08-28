/**
 * Integrated Account Service
 * 既存APIの組み合わせでアカウント設定機能を提供
 */

import apiClient from '@/lib/api';
import UserService from './userService';

// ============================================
// Types (from original AccountSettingsService)
// ============================================

export interface AccountStatus {
  account: {
    userId: string;
    nickname: string | null;
    createdAt: string;
    status: string;
  };
  subscription: {
    status: 'active' | 'inactive' | 'cancelled';
    currentPlan: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    monthlyAmount: number | null;
  } | null;
}

export interface DeletionRequest {
  deletion_type: 'account_delete' | 'subscription_cancel';
  reason: string | null;
  feedback: string | null;
}

// ============================================
// Integrated Account Service Implementation
// ============================================

export class IntegratedAccountService {
  /**
   * アカウント状態を取得 - 既存APIの組み合わせで実装
   */
  static async getAccountStatus(): Promise<AccountStatus> {
    try {
      // ✅ 既存API活用: UserService + BillingService
      const [profile, subscriptionStatus] = await Promise.all([
        UserService.getProfile(),                           // GET /api/user/profile
        apiClient.get('/api/billing/subscription-status')    // GET /api/billing/subscription-status
      ]);

      return {
        account: {
          userId: profile.user_id,
          nickname: profile.nickname || null,
          createdAt: profile.created_at || new Date().toISOString(),
          status: 'active'
        },
        subscription: subscriptionStatus.subscription ? {
          status: subscriptionStatus.subscription.status,
          currentPlan: subscriptionStatus.subscription.current_plan,
          currentPeriodEnd: subscriptionStatus.subscription.current_period_end,
          cancelAtPeriodEnd: subscriptionStatus.subscription.cancel_at_period_end,
          monthlyAmount: subscriptionStatus.subscription.monthly_amount
        } : null
      };
    } catch (error) {
      throw new Error(`アカウント状態の取得に失敗しました: ${error}`);
    }
  }

  /**
   * アカウント削除リクエスト - 既存APIを活用
   */
  static async requestAccountDeletion(request: DeletionRequest): Promise<{
    deletion_request_id: string;
    subscription_action_required: boolean;
  }> {
    try {
      // ✅ 既存API活用: UserService統合処理
      // 注意: バックエンドの実装状況により調整が必要
      const response = await apiClient.post('/api/user/account/request-deletion', {
        deletion_type: request.deletion_type,
        reason: request.reason,
        feedback: request.feedback
      });

      return response;
    } catch (error) {
      throw new Error(`削除リクエストに失敗しました: ${error}`);
    }
  }

  /**
   * サブスクリプション解約 - 既存APIを活用
   */
  static async cancelSubscription(reason?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // ✅ 既存API活用: BillingService
      const result = await apiClient.post('/api/billing/subscription/cancel', {
        cancel_at_period_end: true,
        reason_category: 'other',
        reason_text: reason || null
      });

      return { 
        success: true, 
        message: 'サブスクリプションを解約しました'
      };
    } catch (error) {
      throw new Error(`サブスクリプション解約に失敗しました: ${error}`);
    }
  }

  /**
   * 利用期間を計算するヘルパーメソッド
   */
  static calculateUsagePeriod(createdAt: string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `約${diffDays}日`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `約${months}ヶ月`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return remainingMonths > 0 ? `約${years}年${remainingMonths}ヶ月` : `約${years}年`;
    }
  }

  /**
   * デフォルトの削除アクション一覧を返す
   */
  static getDefaultDeletionActions() {
    return [
      {
        id: 'user_profile',
        name: 'ユーザープロフィール削除',
        status: 'pending' as const
      },
      {
        id: 'chat_history',
        name: 'チャット履歴削除',
        status: 'pending' as const
      },
      {
        id: 'fruit_data',
        name: 'ほめの実データ削除',
        status: 'pending' as const
      },
      {
        id: 'tree_data',
        name: '木の成長記録削除',
        status: 'pending' as const
      },
      {
        id: 'ai_settings',
        name: 'AI設定情報削除',
        status: 'pending' as const
      },
      {
        id: 'account_info',
        name: 'アカウント情報削除',
        status: 'pending' as const
      }
    ];
  }
}

export default IntegratedAccountService;