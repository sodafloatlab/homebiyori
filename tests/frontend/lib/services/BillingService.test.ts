import { BillingService } from '@/lib/services/BillingService';

// Mock APIClient
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

describe('BillingService', () => {
  let billingService: BillingService;

  beforeEach(() => {
    jest.clearAllMocks();
    billingService = new BillingService(mockApiClient);
  });

  describe('getSubscription', () => {
    test('サブスクリプション情報が正しく取得される', async () => {
      const mockResponse = {
        user_id: 'test-user',
        current_plan: 'monthly',
        status: 'active',
        current_period_end: '2024-12-31T23:59:59Z'
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await billingService.getSubscription();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/billing/subscription');
      expect(result).toEqual(mockResponse);
    });

    test('サブスクリプション取得エラー時に適切なエラーが投げられる', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Subscription not found'));

      await expect(
        billingService.getSubscription()
      ).rejects.toThrow();
    });
  });

  describe('getTrialStatus', () => {
    test('トライアル状態が正しく取得される', async () => {
      const mockResponse = {
        trial_status: {
          is_trial_active: true,
          trial_start_date: '2024-01-01T00:00:00Z',
          trial_end_date: '2024-01-08T00:00:00Z',
          days_remaining: 5,
          needs_expiration: false
        },
        current_time: '2024-01-03T12:00:00Z'
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await billingService.getTrialStatus();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/billing/trial-status');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createCheckoutSession', () => {
    test('チェックアウトセッションが正しく作成される', async () => {
      const mockRequest = {
        price_id: 'price_monthly',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel'
      };

      const mockResponse = {
        session_id: 'cs_test_12345',
        checkout_url: 'https://checkout.stripe.com/cs_test_12345'
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await billingService.createCheckoutSession(mockRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/billing/checkout-session',
        mockRequest
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('cancelSubscription', () => {
    test('サブスクリプションキャンセルが正しく処理される', async () => {
      const mockRequest = {
        reason: 'too_expensive',
        feedback: 'テスト理由'
      };

      const mockResponse = {
        success: true,
        message: 'サブスクリプションがキャンセルされました',
        cancel_at_period_end: true,
        effective_until: '2024-12-31T23:59:59Z'
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await billingService.cancelSubscription(mockRequest);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/billing/subscription/cancel',
        mockRequest
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPaymentHistory', () => {
    test('支払い履歴が正しく取得される', async () => {
      const mockResponse = [
        {
          id: 'pi_12345',
          amount: 580,
          currency: 'jpy',
          status: 'succeeded',
          created: 1704067200
        }
      ];
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await billingService.getPaymentHistory();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/billing/history?limit=20'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('canAccessFeature', () => {
    test('アクセス許可時にtrueが返される', async () => {
      const mockAccessControl = {
        access_control: {
          access_allowed: true,
          subscription_status: 'active',
          trial_active: false
        },
        current_time: '2024-01-03T12:00:00Z'
      };
      
      mockApiClient.get.mockResolvedValue(mockAccessControl);

      const result = await billingService.canAccessFeature();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/billing/access-control');
      expect(result).toBe(true);
    });

    test('アクセス拒否時にfalseが返される', async () => {
      const mockAccessControl = {
        access_control: {
          access_allowed: false,
          subscription_status: 'expired',
          trial_active: false
        },
        current_time: '2024-01-03T12:00:00Z'
      };
      
      mockApiClient.get.mockResolvedValue(mockAccessControl);

      const result = await billingService.canAccessFeature();

      expect(result).toBe(false);
    });
  });

  describe('isPremiumUser', () => {
    test('月額プランユーザーがプレミアムと判定される', async () => {
      const mockSubscription = {
        user_id: 'test-user',
        current_plan: 'monthly',
        status: 'active',
        current_period_end: '2024-12-31T23:59:59Z'
      };
      
      mockApiClient.get.mockResolvedValue(mockSubscription);

      const result = await billingService.isPremiumUser();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/billing/subscription');
      expect(result).toBe(true);
    });

    test('年額プランユーザーがプレミアムと判定される', async () => {
      const mockSubscription = {
        user_id: 'test-user',
        current_plan: 'yearly',
        status: 'active',
        current_period_end: '2024-12-31T23:59:59Z'
      };
      
      mockApiClient.get.mockResolvedValue(mockSubscription);

      const result = await billingService.isPremiumUser();

      expect(result).toBe(true);
    });

    test('トライアルユーザーがプレミアムではないと判定される', async () => {
      const mockSubscription = {
        user_id: 'test-user',
        current_plan: 'trial',
        status: 'active',
        current_period_end: '2024-12-31T23:59:59Z'
      };
      
      mockApiClient.get.mockResolvedValue(mockSubscription);

      const result = await billingService.isPremiumUser();

      expect(result).toBe(false);
    });
  });
});