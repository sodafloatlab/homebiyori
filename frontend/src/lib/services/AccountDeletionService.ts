interface AccountStatus {
  account: {
    userId: string;
    nickname: string | null;
    aiCharacter: 'tama' | 'madoka' | 'hide';
    createdAt: string;
    usagePeriod: string;
  };
  subscription: {
    status: 'active' | 'inactive' | 'cancelled';
    currentPlan: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    monthlyAmount: number | null;
  } | null;
  data_summary: {
    chatCount: number;
    fruitCount: number;
    treeLevel: number;
    dataSizeMB: number;
  };
}

interface DeletionRequest {
  deletion_type: 'account_only' | 'subscription_only' | 'account_with_subscription';
  reason: string | null;
  feedback: string | null;
}

interface DeletionConfirmation {
  deletion_request_id: string;
  confirmation_text: string;
  final_consent: boolean;
}

interface DeletionResponse {
  success: boolean;
  deletion_request_id: string;
  message: string;
  estimated_completion_time: string;
}

interface DeletionProgressResponse {
  success: boolean;
  process_id: string;
  status: 'processing' | 'completed' | 'failed';
  actions_performed: Array<{
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    completedAt?: string;
    estimatedCompletion?: string;
    error?: string;
  }>;
  estimated_completion: string;
  completion_time?: string;
}

interface APIClient {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: any): Promise<T>;
  put<T>(url: string, data: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

export class AccountDeletionService {
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
        account: any;
        subscription: any | null;
        data_summary: any;
      }>(`${this.baseURL}/users/account-status`);

      // レスポンスの正規化
      return {
        account: {
          userId: response.account.user_id,
          nickname: response.account.nickname,
          aiCharacter: response.account.ai_character,
          createdAt: response.account.created_at,
          usagePeriod: this.calculateUsagePeriod(response.account.created_at)
        },
        subscription: response.subscription ? {
          status: response.subscription.status,
          currentPlan: response.subscription.current_plan,
          currentPeriodEnd: response.subscription.current_period_end,
          cancelAtPeriodEnd: response.subscription.cancel_at_period_end,
          monthlyAmount: response.subscription.monthly_amount
        } : null,
        data_summary: {
          chatCount: response.data_summary.chat_count,
          fruitCount: response.data_summary.fruit_count,
          treeLevel: response.data_summary.tree_level,
          dataSizeMB: response.data_summary.data_size_mb
        }
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
        success: boolean;
        deletion_request_id: string;
        message: string;
        estimated_completion_time: string;
      }>(`${this.baseURL}/users/request-deletion`, {
        deletion_type: request.deletion_type,
        reason: request.reason,
        feedback: request.feedback
      });

      return {
        success: response.success,
        deletion_request_id: response.deletion_request_id,
        message: response.message,
        estimated_completion_time: response.estimated_completion_time
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
        success: boolean;
        process_id: string;
        status: string;
        actions_performed: Array<{
          id: string;
          name: string;
          status: string;
          completed_at?: string;
          estimated_completion?: string;
          error?: string;
        }>;
        estimated_completion: string;
        completion_time?: string;
      }>(`${this.baseURL}/users/confirm-deletion`, {
        deletion_request_id: confirmation.deletion_request_id,
        confirmation_text: confirmation.confirmation_text,
        final_consent: confirmation.final_consent
      });

      return {
        success: response.success,
        process_id: response.process_id,
        status: response.status as 'processing' | 'completed' | 'failed',
        actions_performed: response.actions_performed.map(action => ({
          id: action.id,
          name: action.name,
          status: action.status as 'pending' | 'in_progress' | 'completed' | 'failed',
          completedAt: action.completed_at,
          estimatedCompletion: action.estimated_completion,
          error: action.error
        })),
        estimated_completion: response.estimated_completion,
        completion_time: response.completion_time
      };
    } catch (error) {
      throw new Error(`削除確認に失敗しました: ${error}`);
    }
  }

  /**
   * 削除進行状況をチェック
   * 実装上は confirm-deletion のレスポンスと同じ構造を期待
   */
  async checkDeletionProgress(processId: string): Promise<DeletionProgressResponse> {
    try {
      // バックエンドに進行状況チェック専用のエンドポイントがない場合、
      // processIdを使って状況確認を行う（実装に応じて調整）
      const response = await this.apiClient.get<{
        success: boolean;
        process_id: string;
        status: string;
        actions_performed: Array<{
          id: string;
          name: string;
          status: string;
          completed_at?: string;
          estimated_completion?: string;
          error?: string;
        }>;
        estimated_completion: string;
        completion_time?: string;
      }>(`${this.baseURL}/users/deletion-status/${processId}`);

      return {
        success: response.success,
        process_id: response.process_id,
        status: response.status as 'processing' | 'completed' | 'failed',
        actions_performed: response.actions_performed.map(action => ({
          id: action.id,
          name: action.name,
          status: action.status as 'pending' | 'in_progress' | 'completed' | 'failed',
          completedAt: action.completed_at,
          estimatedCompletion: action.estimated_completion,
          error: action.error
        })),
        estimated_completion: response.estimated_completion,
        completion_time: response.completion_time
      };
    } catch (error) {
      // エラーの場合は現在の状況をそのまま返す（進行状況チェックは失敗してもフロー継続）
      console.warn('削除進行状況の取得に失敗:', error);
      throw new Error(`削除進行状況の取得に失敗しました: ${error}`);
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
export function createAccountDeletionService(apiClient: APIClient): AccountDeletionService {
  return new AccountDeletionService(apiClient);
}

// 型エクスポート
export type {
  AccountStatus,
  DeletionRequest,
  DeletionConfirmation,
  DeletionResponse,
  DeletionProgressResponse
};