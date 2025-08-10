import { AccountDeletionService } from '../../../../../frontend/src/lib/services/AccountDeletionService';

// モックAPIクライアント
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

describe('AccountDeletionService', () => {
  let service: AccountDeletionService;

  beforeEach(() => {
    service = new AccountDeletionService(mockApiClient, '/api');
    jest.clearAllMocks();
  });

  describe('getAccountStatus', () => {
    it('正常にアカウント状態を取得できる', async () => {
      const mockResponse = {
        account: {
          user_id: 'user123',
          nickname: 'テストユーザー',
          ai_character: 'tama',
          created_at: '2024-01-15T09:30:00Z'
        },
        subscription: {
          status: 'active',
          current_plan: '月額プラン',
          current_period_end: '2024-09-15T09:30:00Z',
          cancel_at_period_end: false,
          monthly_amount: 980
        },
        data_summary: {
          chat_count: 150,
          fruit_count: 12,
          tree_level: 5,
          data_size_mb: 2.3
        }
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getAccountStatus();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/users/account-status');
      expect(result).toEqual({
        account: {
          userId: 'user123',
          nickname: 'テストユーザー',
          aiCharacter: 'tama',
          createdAt: '2024-01-15T09:30:00Z',
          usagePeriod: expect.any(String)
        },
        subscription: {
          status: 'active',
          currentPlan: '月額プラン',
          currentPeriodEnd: '2024-09-15T09:30:00Z',
          cancelAtPeriodEnd: false,
          monthlyAmount: 980
        },
        data_summary: {
          chatCount: 150,
          fruitCount: 12,
          treeLevel: 5,
          dataSizeMB: 2.3
        }
      });
    });

    it('サブスクリプションがnullの場合も正常に処理できる', async () => {
      const mockResponse = {
        account: {
          user_id: 'user123',
          nickname: 'テストユーザー',
          ai_character: 'tama',
          created_at: '2024-01-15T09:30:00Z'
        },
        subscription: null,
        data_summary: {
          chat_count: 150,
          fruit_count: 12,
          tree_level: 5,
          data_size_mb: 2.3
        }
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getAccountStatus();

      expect(result.subscription).toBeNull();
    });

    it('APIエラーの場合、適切なエラーメッセージを投げる', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getAccountStatus()).rejects.toThrow(
        'アカウント状態の取得に失敗しました'
      );
    });
  });

  describe('requestAccountDeletion', () => {
    it('正常に削除リクエストを送信できる', async () => {
      const mockRequest = {
        deletion_type: 'account_only' as const,
        reason: 'サービスが不要になった',
        feedback: 'ありがとうございました'
      };

      const mockResponse = {
        success: true,
        deletion_request_id: 'req_123',
        message: '削除リクエストを受け付けました',
        estimated_completion_time: '2024-08-10T02:00:00Z'
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await service.requestAccountDeletion(mockRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/users/request-deletion', {
        deletion_type: 'account_only',
        reason: 'サービスが不要になった',
        feedback: 'ありがとうございました'
      });

      expect(result).toEqual(mockResponse);
    });

    it('reasonとfeedbackがnullの場合も正常に送信できる', async () => {
      const mockRequest = {
        deletion_type: 'account_only' as const,
        reason: null,
        feedback: null
      };

      const mockResponse = {
        success: true,
        deletion_request_id: 'req_123',
        message: '削除リクエストを受け付けました',
        estimated_completion_time: '2024-08-10T02:00:00Z'
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await service.requestAccountDeletion(mockRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/users/request-deletion', {
        deletion_type: 'account_only',
        reason: null,
        feedback: null
      });
    });
  });

  describe('confirmAccountDeletion', () => {
    it('正常に削除確認を送信できる', async () => {
      const mockConfirmation = {
        deletion_request_id: 'req_123',
        confirmation_text: '削除',
        final_consent: true
      };

      const mockResponse = {
        success: true,
        process_id: 'proc_456',
        status: 'processing',
        actions_performed: [
          {
            id: 'user_profile',
            name: 'ユーザープロフィール削除',
            status: 'completed',
            completed_at: '2024-08-10T01:45:32Z'
          },
          {
            id: 'chat_history',
            name: 'チャット履歴削除',
            status: 'in_progress',
            estimated_completion: '2024-08-10T01:48:00Z'
          }
        ],
        estimated_completion: '2024-08-10T01:50:00Z'
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await service.confirmAccountDeletion(mockConfirmation);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/users/confirm-deletion', mockConfirmation);

      expect(result).toEqual({
        success: true,
        process_id: 'proc_456',
        status: 'processing',
        actions_performed: [
          {
            id: 'user_profile',
            name: 'ユーザープロフィール削除',
            status: 'completed',
            completedAt: '2024-08-10T01:45:32Z',
            estimatedCompletion: undefined,
            error: undefined
          },
          {
            id: 'chat_history',
            name: 'チャット履歴削除',
            status: 'in_progress',
            completedAt: undefined,
            estimatedCompletion: '2024-08-10T01:48:00Z',
            error: undefined
          }
        ],
        estimated_completion: '2024-08-10T01:50:00Z',
        completion_time: undefined
      });
    });
  });

  describe('checkDeletionProgress', () => {
    it('正常に削除進行状況を取得できる', async () => {
      const processId = 'proc_456';
      const mockResponse = {
        success: true,
        process_id: 'proc_456',
        status: 'completed',
        actions_performed: [
          {
            id: 'user_profile',
            name: 'ユーザープロフィール削除',
            status: 'completed',
            completed_at: '2024-08-10T01:45:32Z'
          }
        ],
        estimated_completion: '2024-08-10T01:50:00Z',
        completion_time: '2024-08-10T01:50:23Z'
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await service.checkDeletionProgress(processId);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/users/deletion-status/proc_456');
      expect(result.status).toBe('completed');
      expect(result.completion_time).toBe('2024-08-10T01:50:23Z');
    });

    it('API呼び出し失敗時にエラーを投げる', async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.checkDeletionProgress('proc_456')).rejects.toThrow(
        '削除進行状況の取得に失敗しました'
      );
    });
  });

  describe('cancelSubscription', () => {
    it('正常にサブスクリプション解約を実行できる', async () => {
      const mockResponse = {
        success: true,
        message: 'サブスクリプションを解約しました'
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await service.cancelSubscription('料金が高い');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/subscription/cancel', {
        reason: '料金が高い'
      });

      expect(result).toEqual(mockResponse);
    });

    it('理由なしでも解約を実行できる', async () => {
      const mockResponse = {
        success: true,
        message: 'サブスクリプションを解約しました'
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await service.cancelSubscription();

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/subscription/cancel', {
        reason: null
      });
    });
  });

  describe('ヘルパーメソッド', () => {
    it('getDefaultDeletionActions が正しいデフォルトアクション一覧を返す', () => {
      const actions = service.getDefaultDeletionActions();

      expect(actions).toHaveLength(6);
      expect(actions.every(action => action.status === 'pending')).toBe(true);
      expect(actions.map(a => a.id)).toEqual([
        'user_profile',
        'chat_history', 
        'fruit_data',
        'tree_data',
        'ai_settings',
        'account_info'
      ]);
    });
  });

  describe('利用期間計算', () => {
    it('日数ベースの利用期間が正しく計算される', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 15);

      const mockResponse = {
        account: {
          user_id: 'user123',
          nickname: 'テストユーザー',
          ai_character: 'tama',
          created_at: recentDate.toISOString()
        },
        subscription: null,
        data_summary: {
          chat_count: 10,
          fruit_count: 1,
          tree_level: 1,
          data_size_mb: 0.1
        }
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getAccountStatus();

      expect(result.account.usagePeriod).toMatch(/約\d+日/);
    });

    it('月数ベースの利用期間が正しく計算される', async () => {
      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - 3);

      const mockResponse = {
        account: {
          user_id: 'user123',
          nickname: 'テストユーザー',
          ai_character: 'tama',
          created_at: monthsAgo.toISOString()
        },
        subscription: null,
        data_summary: {
          chat_count: 100,
          fruit_count: 5,
          tree_level: 3,
          data_size_mb: 1.5
        }
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getAccountStatus();

      expect(result.account.usagePeriod).toMatch(/約\d+ヶ月/);
    });
  });
});