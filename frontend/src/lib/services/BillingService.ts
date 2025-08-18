/**
 * Billing Service - Issue #15 新戦略対応版
 * 
 * ■変更概要■
 * - フリーミアム廃止 → 1週間トライアル + 必須有料化
 * - 初回300円 → 2ヶ月目以降580円/月の戦略対応
 * - 全機能統一体験（機能制限なし）
 * - 期限切れユーザーは課金画面のみアクセス可能
 */

// =====================================
// 型定義（新戦略）
// =====================================

export interface TrialStatus {
  is_trial_active: boolean;
  trial_start_date: string | null;
  trial_end_date: string | null;
  days_remaining: number;
  needs_expiration: boolean;
}

export interface AccessControl {
  access_allowed: boolean;
  access_level: 'full' | 'billing_only' | 'none';
  restriction_reason: string | null;
  redirect_url: string | null;
}

export interface SubscriptionGuidance {
  guidance_message: {
    title: string;
    description: string;
    benefits: string[];
  };
  trial_info: TrialStatus;
  plan_options: PlanOption[];
  access_info: AccessControl;
  next_steps: {
    primary_action: string;
    secondary_action: string;
    billing_portal_available: boolean;
  };
}

export interface PlanOption {
  plan_id: 'monthly' | 'yearly';
  name: string;
  price: number;
  special_price?: number;
  is_promotion: boolean;
  promotion_description?: string;
  savings_description?: string;
  billing_cycle: 'monthly' | 'yearly';
  monthly_equivalent?: number;
  features: string[];
}

export interface CheckoutSessionRequest {
  plan: 'monthly' | 'yearly';
  payment_method_id?: string;
  coupon_code?: string;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
  plan: string;
  applied_promotions: string[];
}

export interface CheckoutSuccessRequest {
  session_id: string;
}

export interface CheckoutSuccessResponse {
  success: boolean;
  message: string;
  subscription: {
    plan: string;
    status: string;
    current_period_end: string;
    features_unlocked: string[];
  };
  next_steps: {
    dashboard_url: string;
    billing_portal_url: string;
  };
}

export interface DetailedSubscriptionStatus {
  subscription: UserSubscription | null;
  trial_status: TrialStatus;
  access_control: AccessControl;
  plan_details: {
    current_plan: string;
    plan_name: string;
    is_trial: boolean;
    is_premium: boolean;
  };
  billing_info?: {
    next_billing_date: string | null;
    recent_payments: PaymentHistory[];
    billing_portal_available: boolean;
  };
  recommendations: Recommendation[];
  timestamp: string;
}

export interface UserSubscription {
  user_id: string;
  subscription_id: string | null;
  customer_id: string | null;
  current_plan: 'trial' | 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing' | 'expired';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  ttl_days: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistory {
  payment_id: string;
  user_id: string;
  subscription_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'canceled';
  billing_period_start: string;
  billing_period_end: string;
  payment_method_type: string | null;
  card_last4: string | null;
  card_brand: string | null;
  description: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Recommendation {
  type: 'upgrade_required' | 'trial_ending' | 'payment_failed';
  title: string;
  description: string;
  action_url: string;
}

export interface CancelSubscriptionRequest {
  cancel_at_period_end?: boolean;
  cancellation_reason?: string;
}

export interface BillingPortalRequest {
  return_url: string;
}

export interface BillingPortalResponse {
  portal_url: string;
}

export interface SubscriptionBenefits {
  premium_features: {
    [key: string]: {
      title: string;
      description: string;
      icon: string;
    };
  };
  plan_comparison: {
    trial: {
      name: string;
      duration: string;
      price: string;
      features: string[];
    };
    premium: {
      name: string;
      duration: string;
      price: string;
      features: string[];
    };
  };
  success_stories: Array<{
    comment: string;
    user_type: string;
  }>;
}

// =====================================
// APIクライアントインターface
// =====================================

interface APIClient {
  get<T>(url: string): Promise<T>;
  post<T>(url: string, data: any): Promise<T>;
  put<T>(url: string, data: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

// =====================================
// BillingService実装（新戦略）
// =====================================

export class BillingService {
  private apiClient: APIClient;
  private baseURL: string;

  constructor(apiClient: APIClient, baseURL = '/api/billing') {
    this.apiClient = apiClient;
    this.baseURL = baseURL;
  }

  // =====================================
  // サブスクリプション管理
  // =====================================

  /**
   * サブスクリプション状態取得
   * バックエンドAPI: GET /api/billing/subscription
   */
  async getSubscription(): Promise<UserSubscription> {
    try {
      return await this.apiClient.get<UserSubscription>(`${this.baseURL}/subscription`);
    } catch (error) {
      throw new Error(`サブスクリプション情報の取得に失敗しました: ${error}`);
    }
  }

  /**
   * 詳細サブスクリプション状態取得
   * バックエンドAPI: GET /api/billing/subscription-status
   */
  async getDetailedSubscriptionStatus(): Promise<DetailedSubscriptionStatus> {
    try {
      return await this.apiClient.get<DetailedSubscriptionStatus>(`${this.baseURL}/subscription-status`);
    } catch (error) {
      throw new Error(`詳細サブスクリプション状態の取得に失敗しました: ${error}`);
    }
  }

  /**
   * トライアル状態確認
   * バックエンドAPI: GET /api/billing/trial-status
   */
  async getTrialStatus(): Promise<{ trial_status: TrialStatus; current_time: string }> {
    try {
      return await this.apiClient.get<{ trial_status: TrialStatus; current_time: string }>(`${this.baseURL}/trial-status`);
    } catch (error) {
      throw new Error(`トライアル状態の確認に失敗しました: ${error}`);
    }
  }

  /**
   * アクセス制御チェック
   * バックエンドAPI: GET /api/billing/access-control
   */
  async checkAccessControl(): Promise<{ access_control: AccessControl; current_time: string }> {
    try {
      return await this.apiClient.get<{ access_control: AccessControl; current_time: string }>(`${this.baseURL}/access-control`);
    } catch (error) {
      throw new Error(`アクセス制御の確認に失敗しました: ${error}`);
    }
  }

  // =====================================
  // 課金誘導・チェックアウト
  // =====================================

  /**
   * 課金誘導情報取得
   * バックエンドAPI: GET /api/billing/subscription-guidance
   */
  async getSubscriptionGuidance(): Promise<SubscriptionGuidance> {
    try {
      return await this.apiClient.get<SubscriptionGuidance>(`${this.baseURL}/subscription-guidance`);
    } catch (error) {
      throw new Error(`課金誘導情報の取得に失敗しました: ${error}`);
    }
  }

  /**
   * チェックアウトセッション作成
   * バックエンドAPI: POST /api/billing/checkout-session
   */
  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    try {
      return await this.apiClient.post<CheckoutSessionResponse>(`${this.baseURL}/checkout-session`, request);
    } catch (error) {
      throw new Error(`チェックアウトセッションの作成に失敗しました: ${error}`);
    }
  }

  /**
   * チェックアウト成功処理
   * バックエンドAPI: POST /api/billing/checkout-success
   */
  async handleCheckoutSuccess(request: CheckoutSuccessRequest): Promise<CheckoutSuccessResponse> {
    try {
      return await this.apiClient.post<CheckoutSuccessResponse>(`${this.baseURL}/checkout-success`, request);
    } catch (error) {
      throw new Error(`チェックアウト成功処理に失敗しました: ${error}`);
    }
  }

  /**
   * サブスクリプション特典情報取得
   * バックエンドAPI: GET /api/billing/subscription-benefits
   */
  async getSubscriptionBenefits(): Promise<SubscriptionBenefits> {
    try {
      return await this.apiClient.get<SubscriptionBenefits>(`${this.baseURL}/subscription-benefits`);
    } catch (error) {
      throw new Error(`サブスクリプション特典情報の取得に失敗しました: ${error}`);
    }
  }

  // =====================================
  // サブスクリプション操作
  // =====================================

  /**
   * サブスクリプションキャンセル
   * バックエンドAPI: POST /api/billing/subscription/cancel
   */
  async cancelSubscription(request: CancelSubscriptionRequest): Promise<{ success: boolean; message: string; cancel_at_period_end: boolean; effective_until: string | null }> {
    try {
      return await this.apiClient.post<{ success: boolean; message: string; cancel_at_period_end: boolean; effective_until: string | null }>(`${this.baseURL}/subscription/cancel`, request);
    } catch (error) {
      throw new Error(`サブスクリプションのキャンセルに失敗しました: ${error}`);
    }
  }

  /**
   * 課金ポータルセッション作成
   * バックエンドAPI: POST /api/billing/portal
   */
  async createBillingPortalSession(request: BillingPortalRequest): Promise<BillingPortalResponse> {
    try {
      return await this.apiClient.post<BillingPortalResponse>(`${this.baseURL}/portal`, request);
    } catch (error) {
      throw new Error(`課金ポータルセッションの作成に失敗しました: ${error}`);
    }
  }

  /**
   * 支払い履歴取得
   * バックエンドAPI: GET /api/billing/history
   */
  async getPaymentHistory(limit: number = 20, nextToken?: string): Promise<PaymentHistory[]> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (nextToken) {
        params.append('next_token', nextToken);
      }
      
      return await this.apiClient.get<PaymentHistory[]>(`${this.baseURL}/history?${params}`);
    } catch (error) {
      throw new Error(`支払い履歴の取得に失敗しました: ${error}`);
    }
  }

  // =====================================
  // ユーティリティメソッド
  // =====================================

  /**
   * アクセス許可チェック（ページガード用）
   */
  async canAccessFeature(): Promise<boolean> {
    try {
      const { access_control } = await this.checkAccessControl();
      return access_control.access_allowed;
    } catch (error) {
      console.error('アクセス許可チェック失敗:', error);
      return false;
    }
  }

  /**
   * トライアル期間残り日数取得
   */
  async getTrialDaysRemaining(): Promise<number> {
    try {
      const { trial_status } = await this.getTrialStatus();
      return trial_status.days_remaining;
    } catch (error) {
      console.error('トライアル期間確認失敗:', error);
      return 0;
    }
  }

  /**
   * 課金誘導が必要かどうか判定
   */
  async needsBillingUpgrade(): Promise<boolean> {
    try {
      const { access_control } = await this.checkAccessControl();
      return access_control.restriction_reason === 'trial_expired';
    } catch (error) {
      console.error('課金誘導判定失敗:', error);
      return false;
    }
  }

  /**
   * プレミアムユーザーかどうか判定
   */
  async isPremiumUser(): Promise<boolean> {
    try {
      const subscription = await this.getSubscription();
      return subscription.current_plan === 'monthly' || subscription.current_plan === 'yearly';
    } catch (error) {
      console.error('プレミアムユーザー判定失敗:', error);
      return false;
    }
  }
}

// =====================================
// ファクトリー関数・シングルトン
// =====================================

export function createBillingService(apiClient: APIClient): BillingService {
  return new BillingService(apiClient);
}

// デフォルトのサービスインスタンス
import apiClient from '@/lib/api';
export const billingService = createBillingService(apiClient);