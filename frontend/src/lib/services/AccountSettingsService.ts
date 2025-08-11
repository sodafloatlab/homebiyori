interface AccountStatus {
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

interface DeletionRequest {
  deletion_type: 'account_delete' | 'subscription_cancel';
  reason: string | null;
  feedback: string | null;
}

interface DeletionConfirmation {
  deletion_request_id: string;
  final_consent: boolean;
}

interface DeletionResponse {
  deletion_request_id: string;
  subscription_action_required: boolean;
}

interface DeletionProgressResponse {
  deletion_started: boolean;
  process_id: string;
  profile_deleted: boolean;
  async_tasks_queued: boolean;
  estimated_completion: string;
}

interface APIClient {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: any): Promise<T>;
  put<T>(url: string, data: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

export class AccountSettingsService {
  private apiClient: APIClient;
  private baseURL: string;

  constructor(apiClient: APIClient, baseURL = '/api') {
    this.apiClient = apiClient;
    this.baseURL = baseURL;
  }

  /**
   * アカウント状態を取得
   * バックエンドAPI: GET /users/account-status
   */
  async getAccountStatus(): Promise<AccountStatus> {
    try {
      const response = await this.apiClient.get<{
        account: {
          user_id: string;
          nickname: string | null;
          created_at: string;
          status: string;
        };
        subscription: {
          status: 'active' | 'inactive' | 'cancelled';
          current_plan: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          monthly_amount: number | null;
        } | null;
      }>(`${this.baseURL}/users/account-status`);

      // レスポンスの正規化
      return {
        account: {
          userId: response.account.user_id,
          nickname: response.account.nickname,
          createdAt: response.account.created_at,
          status: response.account.status
        },
        subscription: response.subscription ? {
          status: response.subscription.status,
          currentPlan: response.subscription.current_plan,
          currentPeriodEnd: response.subscription.current_period_end,
          cancelAtPeriodEnd: response.subscription.cancel_at_period_end,
          monthlyAmount: response.subscription.monthly_amount
        } : null
      };
    } catch (error) {
      throw new Error(`アカウント状態の取得に失敗しました: ${error}`);
    }
  }

  /**
   * アカウント削除をリクエスト
   * バックエンドAPI: POST /users/request-deletion
   */
  async requestAccountDeletion(request: DeletionRequest): Promise<DeletionResponse> {
    try {
      const response = await this.apiClient.post<{
        deletion_request_id: string;
        subscription_action_required: boolean;
      }>(`${this.baseURL}/users/request-deletion`, {
        deletion_type: request.deletion_type,
        reason: request.reason,
        feedback: request.feedback
      });

      return {
        deletion_request_id: response.deletion_request_id,
        subscription_action_required: response.subscription_action_required
      };
    } catch (error) {
      throw new Error(`削除リクエストに失敗しました: ${error}`);
    }
  }

  /**
   * アカウント削除を確認・実行
   * バックエンドAPI: POST /users/confirm-deletion
   */
  async confirmAccountDeletion(confirmation: DeletionConfirmation): Promise<DeletionProgressResponse> {
    try {
      const response = await this.apiClient.post<{
        deletion_started: boolean;
        process_id: string;
        profile_deleted: boolean;
        async_tasks_queued: boolean;
        estimated_completion: string;
      }>(`${this.baseURL}/users/confirm-deletion`, {
        deletion_request_id: confirmation.deletion_request_id,
        final_consent: confirmation.final_consent
      });

      return {
        deletion_started: response.deletion_started,
        process_id: response.process_id,
        profile_deleted: response.profile_deleted,
        async_tasks_queued: response.async_tasks_queued,
        estimated_completion: response.estimated_completion
      };
    } catch (error) {
      throw new Error(`削除確認に失敗しました: ${error}`);
    }
  }

  /**
   * サブスクリプション解約
   * 既存のサブスクリプション系APIを使用
   */
  async cancelSubscription(reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.apiClient.post<{
        success: boolean;
        message: string;
      }>(`${this.baseURL}/subscription/cancel`, {
        reason: reason || null
      });

      return response;
    } catch (error) {
      throw new Error(`サブスクリプション解約に失敗しました: ${error}`);
    }
  }

  /**
   * 利用期間を計算するヘルパーメソッド
   */
  private calculateUsagePeriod(createdAt: string): string {
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
  getDefaultDeletionActions() {
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

// シングルトンインスタンス用のファクトリ関数
export function createAccountSettingsService(apiClient: APIClient): AccountSettingsService {
  return new AccountSettingsService(apiClient);
}

// デフォルトのサービスインスタンス
import apiClient from '@/lib/api';
export const accountSettingsService = createAccountSettingsService(apiClient);

// 型エクスポート
export type {
  AccountStatus,
  DeletionRequest,
  DeletionConfirmation,
  DeletionResponse,
  DeletionProgressResponse
};