interface CreateSubscriptionRequest {
  plan: 'monthly' | 'yearly';
  price_id?: string; // Stripe Price ID (optional)
}

interface CreateSubscriptionResponse {
  client_secret: string;
  subscription_id: string;
  redirect_url?: string; // Stripe Checkout URL
}

interface SubscriptionStatus {
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing';
  current_plan: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  monthly_amount: number | null;
}

interface APIClient {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: any): Promise<T>;
  put<T>(url: string, data: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

export class BillingService {
  private apiClient: APIClient;
  private baseURL: string;

  constructor(apiClient: APIClient, baseURL = '/api/billing') {
    this.apiClient = apiClient;
    this.baseURL = baseURL;
  }

  /**
   * サブスクリプション作成 - Stripe Checkout Session
   * バックエンドAPI: POST /billing/subscription/create
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> {
    try {
      const response = await this.apiClient.post<{
        client_secret: string;
        subscription_id: string;
        redirect_url?: string;
      }>(`${this.baseURL}/subscription/create`, {
        plan: request.plan,
        price_id: request.price_id
      });

      return {
        client_secret: response.client_secret,
        subscription_id: response.subscription_id,
        redirect_url: response.redirect_url
      };
    } catch (error) {
      throw new Error(`サブスクリプション作成に失敗しました: ${error}`);
    }
  }

  /**
   * サブスクリプション状態取得
   * バックエンドAPI: GET /billing/subscription/status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    try {
      const response = await this.apiClient.get<{
        subscription: {
          status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing';
          current_plan: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          monthly_amount: number | null;
        } | null;
      }>(`${this.baseURL}/subscription/status`);

      return response.subscription;
    } catch (error) {
      throw new Error(`サブスクリプション状態の取得に失敗しました: ${error}`);
    }
  }

  /**
   * サブスクリプション解約
   * バックエンドAPI: POST /billing/subscription/cancel
   */
  async cancelSubscription(reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.apiClient.post<{
        success: boolean;
        message: string;
      }>(`${this.baseURL}/subscription/cancel`, {
        cancellation_reason: reason || null
      });

      return response;
    } catch (error) {
      throw new Error(`サブスクリプション解約に失敗しました: ${error}`);
    }
  }

  /**
   * 顧客ポータル URL取得 (Stripe Customer Portal)
   * バックエンドAPI: POST /billing/customer-portal
   */
  async getCustomerPortalUrl(): Promise<{ url: string }> {
    try {
      const response = await this.apiClient.post<{
        url: string;
      }>(`${this.baseURL}/customer-portal`, {});

      return response;
    } catch (error) {
      throw new Error(`顧客ポータルURL取得に失敗しました: ${error}`);
    }
  }

  /**
   * 料金プラン一覧取得
   * バックエンドAPI: GET /billing/plans
   */
  async getPlans(): Promise<Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
  }>> {
    try {
      const response = await this.apiClient.get<{
        plans: Array<{
          id: string;
          name: string;
          price: number;
          currency: string;
          interval: 'month' | 'year';
          features: string[];
        }>;
      }>(`${this.baseURL}/plans`);

      return response.plans;
    } catch (error) {
      throw new Error(`料金プラン取得に失敗しました: ${error}`);
    }
  }

  /**
   * プラン変更
   * バックエンドAPI: POST /billing/subscription/change-plan
   */
  async changePlan(planId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.apiClient.post<{
        success: boolean;
        message: string;
      }>(`${this.baseURL}/subscription/change-plan`, {
        plan_id: planId
      });

      return response;
    } catch (error) {
      throw new Error(`プラン変更に失敗しました: ${error}`);
    }
  }

  /**
   * 請求履歴取得
   * バックエンドAPI: GET /billing/invoices
   */
  async getInvoices(): Promise<Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: string;
    pdf_url?: string;
  }>> {
    try {
      const response = await this.apiClient.get<{
        invoices: Array<{
          id: string;
          amount: number;
          currency: string;
          status: string;
          created: string;
          pdf_url?: string;
        }>;
      }>(`${this.baseURL}/invoices`);

      return response.invoices;
    } catch (error) {
      throw new Error(`請求履歴取得に失敗しました: ${error}`);
    }
  }
}

// シングルトンインスタンス用のファクトリ関数
export function createBillingService(apiClient: APIClient): BillingService {
  return new BillingService(apiClient);
}

// デフォルトのサービスインスタンス
import apiClient from '@/lib/api';
export const billingService = createBillingService(apiClient);

// 型エクスポート
export type {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  SubscriptionStatus
};