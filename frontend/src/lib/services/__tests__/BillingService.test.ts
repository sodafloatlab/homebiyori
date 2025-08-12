import { BillingService } from '../BillingService';

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

  describe('createSubscription', () => {
    test('月額プランのサブスクリプション作成が成功する', async () => {
      const mockResponse = {
        client_secret: 'pi_test_12345_secret_abc',
        subscription_id: 'sub_12345',
        redirect_url: 'https://checkout.stripe.com/pay/test_12345'
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await billingService.createSubscription({
        plan: 'monthly'
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/billing/subscription/create',
        {
          plan: 'monthly',
          price_id: undefined
        }
      );

      expect(result).toEqual({
        client_secret: 'pi_test_12345_secret_abc',
        subscription_id: 'sub_12345',
        redirect_url: 'https://checkout.stripe.com/pay/test_12345'
      });
    });

    test('年額プランのサブスクリプション作成が成功する', async () => {
      const mockResponse = {
        client_secret: 'pi_test_yearly_secret_xyz',
        subscription_id: 'sub_yearly_67890',
        redirect_url: 'https://checkout.stripe.com/pay/yearly_test_67890'
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await billingService.createSubscription({
        plan: 'yearly',
        price_id: 'price_yearly_test'
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/billing/subscription/create',
        {
          plan: 'yearly',
          price_id: 'price_yearly_test'
        }
      );

      expect(result).toEqual(mockResponse);
    });

    test('サブスクリプション作成エラー時に適切なエラーが投げられる', async () => {
      const apiError = new Error('API Error');
      mockApiClient.post.mockRejectedValue(apiError);

      await expect(
        billingService.createSubscription({ plan: 'monthly' })
      ).rejects.toThrow('サブスクリプション作成に失敗しました: Error: API Error');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/billing/subscription/create',
        {
          plan: 'monthly',
          price_id: undefined
        }
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    test('アクティブなサブスクリプション状態が正しく取得される', async () => {
      const mockResponse = {
        subscription: {
          status: 'active' as const,
          current_plan: 'premium_monthly',
          current_period_end: '2024-09-12T00:00:00Z',
          cancel_at_period_end: false,
          monthly_amount: 580
        }
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await billingService.getSubscriptionStatus();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/billing/subscription/status'
      );

      expect(result).toEqual({
        status: 'active',
        current_plan: 'premium_monthly',
        current_period_end: '2024-09-12T00:00:00Z',
        cancel_at_period_end: false,
        monthly_amount: 580
      });
    });

    test('サブスクリプションがない場合にnullが返される', async () => {
      const mockResponse = {
        subscription: null
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await billingService.getSubscriptionStatus();

      expect(result).toBeNull();
    });

    test('解約予定のサブスクリプション状態が正しく取得される', async () => {
      const mockResponse = {
        subscription: {
          status: 'active' as const,
          current_plan: 'premium_yearly',
          current_period_end: '2024-12-12T00:00:00Z',
          cancel_at_period_end: true,
          monthly_amount: 483
        }
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await billingService.getSubscriptionStatus();

      expect(result).toEqual({
        status: 'active',
        current_plan: 'premium_yearly',
        current_period_end: '2024-12-12T00:00:00Z',
        cancel_at_period_end: true,
        monthly_amount: 483
      });
    });

    test('サブスクリプション状態取得エラー時に適切なエラーが投げられる', async () => {
      const apiError = new Error('Network Error');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(
        billingService.getSubscriptionStatus()
      ).rejects.toThrow('サブスクリプション状態の取得に失敗しました: Error: Network Error');
    });
  });

  describe('cancelSubscription', () => {
    test('理由ありでサブスクリプション解約が成功する', async () => {
      const mockResponse = {
        success: true,
        message: 'サブスクリプションが正常に解約されました'
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await billingService.cancelSubscription('価格が高い');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/billing/subscription/cancel',
        {
          cancellation_reason: '価格が高い'
        }
      );

      expect(result).toEqual(mockResponse);
    });

    test('理由なしでサブスクリプション解約が成功する', async () => {
      const mockResponse = {
        success: true,
        message: 'サブスクリプションが正常に解約されました'
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await billingService.cancelSubscription();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/billing/subscription/cancel',
        {
          cancellation_reason: null
        }
      );

      expect(result).toEqual(mockResponse);
    });

    test('サブスクリプション解約エラー時に適切なエラーが投げられる', async () => {
      const apiError = new Error('Cancellation failed');
      mockApiClient.post.mockRejectedValue(apiError);

      await expect(
        billingService.cancelSubscription('テスト理由')
      ).rejects.toThrow('サブスクリプション解約に失敗しました: Error: Cancellation failed');
    });
  });

  describe('getCustomerPortalUrl', () => {
    test('顧客ポータルURLが正しく取得される', async () => {
      const mockResponse = {
        url: 'https://billing.stripe.com/session/abc123'
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await billingService.getCustomerPortalUrl();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/billing/customer-portal',
        {}
      );

      expect(result).toEqual(mockResponse);
    });

    test('顧客ポータルURL取得エラー時に適切なエラーが投げられる', async () => {
      const apiError = new Error('Portal access denied');
      mockApiClient.post.mockRejectedValue(apiError);

      await expect(
        billingService.getCustomerPortalUrl()
      ).rejects.toThrow('顧客ポータルURL取得に失敗しました: Error: Portal access denied');
    });
  });

  describe('getPlans', () => {
    test('料金プラン一覧が正しく取得される', async () => {
      const mockResponse = {
        plans: [
          {
            id: 'price_monthly',
            name: '月額プラン',
            price: 580,
            currency: 'jpy',
            interval: 'month' as const,
            features: ['グループチャット', 'ディープモード', '180日履歴保存']
          },
          {
            id: 'price_yearly',
            name: '年額プラン',
            price: 5800,
            currency: 'jpy',
            interval: 'year' as const,
            features: ['グループチャット', 'ディープモード', '180日履歴保存', '17%割引']
          }
        ]
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await billingService.getPlans();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/billing/plans');
      expect(result).toEqual(mockResponse.plans);
    });

    test('料金プラン取得エラー時に適切なエラーが投げられる', async () => {
      const apiError = new Error('Plans not found');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(
        billingService.getPlans()
      ).rejects.toThrow('料金プラン取得に失敗しました: Error: Plans not found');
    });
  });

  describe('changePlan', () => {
    test('プラン変更が成功する', async () => {
      const mockResponse = {
        success: true,
        message: 'プランが正常に変更されました'
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await billingService.changePlan('price_yearly');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/billing/subscription/change-plan',
        {
          plan_id: 'price_yearly'
        }
      );

      expect(result).toEqual(mockResponse);
    });

    test('プラン変更エラー時に適切なエラーが投げられる', async () => {
      const apiError = new Error('Plan change failed');
      mockApiClient.post.mockRejectedValue(apiError);

      await expect(
        billingService.changePlan('price_yearly')
      ).rejects.toThrow('プラン変更に失敗しました: Error: Plan change failed');
    });
  });

  describe('getInvoices', () => {
    test('請求履歴が正しく取得される', async () => {
      const mockResponse = {
        invoices: [
          {
            id: 'in_123',
            amount: 580,
            currency: 'jpy',
            status: 'paid',
            created: '2024-08-12T10:00:00Z',
            pdf_url: 'https://pay.stripe.com/invoice/123/pdf'
          },
          {
            id: 'in_456',
            amount: 580,
            currency: 'jpy',
            status: 'paid',
            created: '2024-07-12T10:00:00Z'
          }
        ]
      };
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await billingService.getInvoices();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/billing/invoices');
      expect(result).toEqual(mockResponse.invoices);
    });

    test('請求履歴取得エラー時に適切なエラーが投げられる', async () => {
      const apiError = new Error('Invoices not accessible');
      mockApiClient.get.mockRejectedValue(apiError);

      await expect(
        billingService.getInvoices()
      ).rejects.toThrow('請求履歴取得に失敗しました: Error: Invoices not accessible');
    });
  });

  describe('constructor', () => {
    test('デフォルトbaseURLでインスタンスが作成される', () => {
      const service = new BillingService(mockApiClient);
      expect(service).toBeInstanceOf(BillingService);
    });

    test('カスタムbaseURLでインスタンスが作成される', () => {
      const service = new BillingService(mockApiClient, '/custom/billing');
      expect(service).toBeInstanceOf(BillingService);
    });
  });

  describe('createBillingService factory function', () => {
    test('ファクトリー関数でBillingServiceインスタンスが作成される', () => {
      const { createBillingService } = require('../BillingService');
      const service = createBillingService(mockApiClient);
      expect(service).toBeInstanceOf(BillingService);
    });
  });
});