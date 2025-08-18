/**
 * サブスクリプションキャンセル管理Hook - 統一アーキテクチャ版
 * 
 * ■機能概要■
 * - サブスクリプション解約処理
 * - キャンセル理由収集
 * - フィードバック送信
 * - アカウント削除連携
 */

'use client';

import { useState, useCallback } from 'react';
import { billingService, type CancelSubscriptionRequest } from '@/lib/services/BillingService';
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
  
  // キャンセル処理
  cancelSubscription: (reason: CancelationReason, cancelAtPeriodEnd?: boolean) => Promise<void>;
  cancelImmediately: (reason: CancelationReason) => Promise<void>;
  
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
    cancelAtPeriodEnd: boolean = true
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setIsProcessing(true);

      // キャンセル理由をフィードバックとして送信
      const cancellationReason = `${reason.category}: ${reason.specific_reason}${
        reason.feedback ? ` - ${reason.feedback}` : ''
      }${reason.rating ? ` (評価: ${reason.rating}/5)` : ''}`;

      const cancelRequest: CancelSubscriptionRequest = {
        cancel_at_period_end: cancelAtPeriodEnd,
        cancellation_reason: cancellationReason
      };

      await billingService.cancelSubscription(cancelRequest);
      
      // サブスクリプション状態を更新
      await refreshStatus();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'キャンセル処理に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  }, [refreshStatus]);

  const cancelImmediately = useCallback(async (reason: CancelationReason) => {
    await cancelSubscription(reason, false);
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
    
    // キャンセル処理
    cancelSubscription,
    cancelImmediately,
    
    // アカウント削除連携
    cancelAndDeleteAccount,
    
    // エラー管理
    clearError
  };
}