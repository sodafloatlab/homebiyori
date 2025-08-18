/**
 * Billing Hooks - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - アクセス制御チェック
 * - トライアル状態管理
 * - 課金誘導判定
 * - サブスクリプション状態管理
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { billingService, type AccessControl, type TrialStatus, type UserSubscription, type DetailedSubscriptionStatus } from '@/lib/services/BillingService';

// =====================================
// アクセス制御Hook
// =====================================

export function useAccessControl() {
  const [accessControl, setAccessControl] = useState<AccessControl | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const checkAccess = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { access_control } = await billingService.checkAccessControl();
      setAccessControl(access_control);
      
      // アクセス拒否の場合は自動リダイレクト
      if (!access_control.access_allowed && access_control.redirect_url) {
        router.push(access_control.redirect_url);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アクセス制御チェックに失敗しました');
      console.error('Access control check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    accessControl,
    isLoading,
    error,
    canAccess: accessControl?.access_allowed ?? false,
    restrictionReason: accessControl?.restriction_reason,
    recheckAccess: checkAccess
  };
}

// =====================================
// トライアル状態Hook
// =====================================

export function useTrialStatus() {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkTrialStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { trial_status } = await billingService.getTrialStatus();
      setTrialStatus(trial_status);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'トライアル状態の確認に失敗しました');
      console.error('Trial status check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkTrialStatus();
  }, [checkTrialStatus]);

  return {
    trialStatus,
    isLoading,
    error,
    isTrialActive: trialStatus?.is_trial_active ?? false,
    daysRemaining: trialStatus?.days_remaining ?? 0,
    needsExpiration: trialStatus?.needs_expiration ?? false,
    refreshTrialStatus: checkTrialStatus
  };
}

// =====================================
// サブスクリプション状態Hook
// =====================================

export function useSubscription() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const subscriptionData = await billingService.getSubscription();
      setSubscription(subscriptionData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'サブスクリプション情報の取得に失敗しました');
      console.error('Subscription fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    isLoading,
    error,
    isTrialUser: subscription?.current_plan === 'trial',
    isPremiumUser: subscription?.current_plan === 'monthly' || subscription?.current_plan === 'yearly',
    isExpired: subscription?.status === 'expired',
    refreshSubscription: fetchSubscription
  };
}

// =====================================
// 詳細サブスクリプション状態Hook
// =====================================

export function useDetailedSubscriptionStatus() {
  const [status, setStatus] = useState<DetailedSubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetailedStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const statusData = await billingService.getDetailedSubscriptionStatus();
      setStatus(statusData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '詳細サブスクリプション状態の取得に失敗しました');
      console.error('Detailed subscription status fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetailedStatus();
  }, [fetchDetailedStatus]);

  return {
    status,
    isLoading,
    error,
    refreshStatus: fetchDetailedStatus
  };
}

// =====================================
// ページガードHook
// =====================================

interface UsePageGuardOptions {
  redirectTo?: string;
  requiresPremium?: boolean;
  allowDuringTrial?: boolean;
}

export function usePageGuard(options: UsePageGuardOptions = {}) {
  const {
    redirectTo = '/billing/subscribe',
    requiresPremium = false,
    allowDuringTrial = true
  } = options;

  const { accessControl, isLoading: accessLoading, canAccess } = useAccessControl();
  const { subscription, isLoading: subscriptionLoading, isPremiumUser, isTrialUser } = useSubscription();
  const router = useRouter();

  const isLoading = accessLoading || subscriptionLoading;

  useEffect(() => {
    if (isLoading) return;

    // アクセス制御チェック
    if (!canAccess) {
      router.push(accessControl?.redirect_url || redirectTo);
      return;
    }

    // プレミアム必須チェック
    if (requiresPremium && !isPremiumUser) {
      if (!allowDuringTrial || !isTrialUser) {
        router.push(redirectTo);
        return;
      }
    }

  }, [isLoading, canAccess, requiresPremium, isPremiumUser, isTrialUser, allowDuringTrial, router, redirectTo, accessControl]);

  return {
    isLoading,
    canAccess: canAccess && (!requiresPremium || isPremiumUser || (allowDuringTrial && isTrialUser)),
    subscription,
    accessControl
  };
}

// =====================================
// 課金誘導Hook
// =====================================

export function useBillingGuidance() {
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkUpgradeNeeded = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const upgradeNeeded = await billingService.needsBillingUpgrade();
      setNeedsUpgrade(upgradeNeeded);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '課金誘導判定に失敗しました');
      console.error('Billing guidance check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUpgradeNeeded();
  }, [checkUpgradeNeeded]);

  return {
    needsUpgrade,
    isLoading,
    error,
    recheckUpgrade: checkUpgradeNeeded
  };
}

// =====================================
// チェックアウトHook
// =====================================

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = useCallback(async (plan: 'monthly' | 'yearly') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { checkout_url } = await billingService.createCheckoutSession({ plan });
      
      // Stripe Checkoutページにリダイレクト
      window.location.href = checkout_url;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チェックアウトセッションの作成に失敗しました');
      console.error('Checkout session creation failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCheckoutSuccess = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await billingService.handleCheckoutSuccess({ session_id: sessionId });
      return result;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チェックアウト成功処理に失敗しました');
      console.error('Checkout success handling failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    createCheckoutSession,
    handleCheckoutSuccess
  };
}

// =====================================
// 統合Billing Hook（メイン）
// =====================================

export function useBilling() {
  const accessControl = useAccessControl();
  const trialStatus = useTrialStatus();
  const subscription = useSubscription();
  const billingGuidance = useBillingGuidance();
  const checkout = useCheckout();

  const refresh = useCallback(async () => {
    await Promise.all([
      accessControl.recheckAccess(),
      trialStatus.refreshTrialStatus(),
      subscription.refreshSubscription(),
      billingGuidance.recheckUpgrade()
    ]);
  }, [accessControl, trialStatus, subscription, billingGuidance]);

  return {
    // アクセス制御
    canAccess: accessControl.canAccess,
    restrictionReason: accessControl.restrictionReason,
    
    // トライアル状態
    isTrialActive: trialStatus.isTrialActive,
    daysRemaining: trialStatus.daysRemaining,
    
    // サブスクリプション状態
    subscription: subscription.subscription,
    isTrialUser: subscription.isTrialUser,
    isPremiumUser: subscription.isPremiumUser,
    isExpired: subscription.isExpired,
    
    // 課金誘導
    needsUpgrade: billingGuidance.needsUpgrade,
    
    // チェックアウト
    createCheckoutSession: checkout.createCheckoutSession,
    handleCheckoutSuccess: checkout.handleCheckoutSuccess,
    
    // ローディング・エラー状態
    isLoading: accessControl.isLoading || trialStatus.isLoading || subscription.isLoading,
    error: accessControl.error || trialStatus.error || subscription.error || checkout.error,
    
    // リフレッシュ
    refresh
  };
}