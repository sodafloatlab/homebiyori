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

// PaymentHistory機能削除（2024-08-22）
// 理由: webhook_serviceはStripe環境からのアクセスのみ
// 課金履歴はStripe Customer Portalから各ユーザーが直接参照する方式に統一

export interface Recommendation {
  type: 'upgrade_required' | 'trial_ending' | 'payment_failed';
  title: string;
  description: string;
  action_url: string;
}

export interface CancelSubscriptionRequest {
  cancel_at_period_end?: boolean;
  
  // 解約理由（個別フィールド）- design_database.md準拠
  reason_category?: 'price' | 'features' | 'usability' | 'competitors' | 'other';
  reason_text?: string;
  satisfaction_score?: number; // 1-5
  improvement_suggestions?: string;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  canceled_at?: string;
  will_cancel_at_period_end: boolean;
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

  // checkAccessControl削除（2024-08-22）
  // 理由: homebiyori_common統合によりアクセス制御は共通Layer化
  // 代替: getDetailedSubscriptionStatus()のaccess_control情報を使用

  // =====================================
  // 課金誘導・チェックアウト
  // =====================================

  // getSubscriptionGuidance削除（2024-08-22）
  // 理由: 静的な課金誘導情報はフロントエンドで管理すべき
  // フロントエンドでプラン情報・価格・特典を定義し、不要なAPI呼び出しを削減

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

  // getSubscriptionBenefits削除（2024-08-22）
  // 理由: 静的な特典情報はフロントエンドで管理すべき
  // AIキャラクター説明・プラン比較・成功事例等はフロントエンドで定義し、
  // 不要なAPI呼び出しを削減してパフォーマンス向上を図る

  // =====================================
  // サブスクリプション操作
  // =====================================

  /**
   * サブスクリプションキャンセル（解約理由収集機能付き）
   * バックエンドAPI: POST /api/billing/cancel-subscription
   * 
   * ■実装方針■
   * - Portal経由ではなくAPI実行でキャンセルを行う
   * - 理由：解約理由の収集がサービス改善に重要なため
   * - フィードバック収集 → Stripe APIキャンセル → 状態同期の順序で実行
   */
  async cancelSubscription(request: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse> {
    try {
      return await this.apiClient.post<CancelSubscriptionResponse>(`${this.baseURL}/cancel-subscription`, request);
    } catch (error) {
      throw new Error(`サブスクリプションキャンセルに失敗しました: ${error}`);
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


  // =====================================
  // ユーティリティメソッド
  // =====================================

  /**
   * アクセス許可チェック（ページガード用）
   * 修正: getDetailedSubscriptionStatusでaccess_control情報を取得
   */
  async canAccessFeature(): Promise<boolean> {
    try {
      const { access_control } = await this.getDetailedSubscriptionStatus();
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
   * 修正: getDetailedSubscriptionStatusでaccess_control情報を取得
   */
  async needsBillingUpgrade(): Promise<boolean> {
    try {
      const { access_control } = await this.getDetailedSubscriptionStatus();
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