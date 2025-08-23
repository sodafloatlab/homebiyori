/**
 * サブスクリプションキャンセル管理Hook - 最適化版（2024-08-22修正）
 * 
 * ■機能概要■
 * - API実行でのサブスクリプションキャンセル（解約理由収集機能付き）
 * - Stripe Portalへの誘導（補助的な管理用）
 * - 解約理由の個別フィールド連携（design_database.md準拠）
 * - アカウント削除連携
 * 
 * ■実装方針■
 * - Portal経由ではなくAPI実行でキャンセルを行う
 * - 理由：解約理由の収集がサービス改善に重要なため
 * - フロントエンドで分離されたフィールドを直接バックエンドに送信
 * - 不要な文字列統合・パース処理を排除
 */

'use client';

import { useState, useCallback } from 'react';
import { billingService, type BillingPortalRequest } from '@/lib/services/BillingService';
import { accountSettingsService, type AccountDeletionRequest } from '@/lib/services/AccountSettingsService';
import { useBilling } from './useBilling';

interface CancelationReason {
  category: 'price' | 'features' | 'usage' | 'technical' | 'other';
  specific_reason: string;
  feedback: string | null;
  rating: number | null;
}

interface UseSubscriptionCancelReturn {
  // 状態
  isLoading: boolean;
  loading: boolean; // compat alias
  error: string | null;
  isProcessing: boolean;
  
  // キャンセル処理（解約理由収集機能付き）
  cancelSubscription: (reason: CancelationReason, cancel_at_period_end?: boolean) => Promise<any>;
  cancelImmediately: (reason: CancelationReason) => Promise<any>;
  
  // Portal誘導処理（補助的な管理用）
  redirectToBillingPortal: (reason: CancelationReason) => Promise<void>;
  
  // アカウント削除連携
  cancelAndDeleteAccount: (reason: CancelationReason, deletionReason: string) => Promise<void>;
  
  // エラー管理
  clearError: () => void;
}

export function useSubscriptionCancel(): UseSubscriptionCancelReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { refreshStatus } = useBilling();

  const cancelSubscription = useCallback(async (
    reason: CancelationReason,
    cancel_at_period_end: boolean = true
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsProcessing(true);

      // サブスクリプションキャンセルAPI実行（解約理由収集機能付き）
      const response = await billingService.cancelSubscription({
        cancel_at_period_end,
        reason_category: reason.category,
        reason_text: reason.specific_reason,
        satisfaction_score: reason.rating,
        improvement_suggestions: reason.feedback
      });

      // 成功時はサブスクリプション状態を更新
      await refreshStatus();
      
      return response;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'サブスクリプションキャンセルに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  }, [refreshStatus]);

  const redirectToBillingPortal = useCallback(async (
    reason: CancelationReason
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsProcessing(true);

      // Stripe Portalへリダイレクト（補助的な管理用）
      const portalRequest: BillingPortalRequest = {
        return_url: `${window.location.origin}/dashboard`
      };

      const { portal_url } = await billingService.createBillingPortalSession(portalRequest);
      
      // Portalへリダイレクト
      window.location.href = portal_url;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Portalへのリダイレクトに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  }, []);

  const cancelImmediately = useCallback(async (reason: CancelationReason) => {
    return await cancelSubscription(reason, false);
  }, [cancelSubscription]);

  const cancelAndDeleteAccount = useCallback(async (
    reason: CancelationReason, 
    deletionReason: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsProcessing(true);

      // 1. サブスクリプションを即座にキャンセル
      await cancelImmediately(reason);

      // 2. アカウント削除をリクエスト
      const deletionRequest: AccountDeletionRequest = {
        deletion_type: 'account_delete',
        reason: deletionReason,
        feedback: reason.feedback
      };

      const deletionResponse = await accountSettingsService.requestAccountDeletion(deletionRequest);
      
      // 3. 削除を確認・実行
      await accountSettingsService.confirmAccountDeletion({
        deletion_request_id: deletionResponse.deletion_request_id,
        final_consent: true
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'キャンセル・削除処理に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  }, [cancelImmediately]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // 状態
    isLoading,
    loading: isLoading, // compat alias
    error,
    isProcessing,
    
    // キャンセル処理（解約理由収集機能付き）
    cancelSubscription,
    cancelImmediately,
    
    // Portal誘導処理（補助的な管理用）
    redirectToBillingPortal,
    
    // アカウント削除連携
    cancelAndDeleteAccount,
    
    // エラー管理
    clearError
  };
}