/**
 * 既存API統合Hook
 * Issue #36 Phase 3: 11個の既存APIを活用した統合機能
 */

import { useState, useCallback } from 'react';
import { SystemHealthService, type SystemHealthStatus } from '@/lib/services/SystemHealthService';
import { IntegratedAccountService, type AccountStatus } from '@/lib/services/IntegratedAccountService';
import UserService from '@/lib/services/userService';
import { ChatAPIService } from '@/lib/services/api/ChatAPIService';
import { TreeAPIService } from '@/lib/services/api/TreeAPIService';
import type { 
  OnboardingStatus, 
  CompleteOnboardingRequest,
  EmotionStampRequest,
  ServiceHealthStatus
} from '@/types/api';

// ============================================
// 統合Hook実装
// ============================================

export function useExistingAPIIntegrations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 1. システムヘルスチェック機能
  const checkSystemHealth = useCallback(async (): Promise<SystemHealthStatus | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const healthStatus = await SystemHealthService.checkAllServices();
      return healthStatus;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'システムヘルスチェックに失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 2. 個別サービスヘルスチェック機能
  const checkServiceHealth = useCallback(async (
    serviceName: 'user' | 'chat' | 'tree' | 'billing'
  ): Promise<ServiceHealthStatus | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const serviceHealth = await SystemHealthService.checkService(serviceName);
      return serviceHealth;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'サービスヘルスチェックに失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 3. 統合アカウント状態取得機能
  const getIntegratedAccountStatus = useCallback(async (): Promise<AccountStatus | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const accountStatus = await IntegratedAccountService.getAccountStatus();
      return accountStatus;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'アカウント状態取得に失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 4. オンボーディング状態取得機能（既存API活用）
  const getOnboardingStatus = useCallback(async (): Promise<OnboardingStatus | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const status = await UserService.getOnboardingStatus();
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'オンボーディング状態取得に失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 5. オンボーディング完了機能（既存API活用）
  const completeOnboarding = useCallback(async (data?: CompleteOnboardingRequest): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      await UserService.completeOnboarding(data);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'オンボーディング完了に失敗しました';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 6. 感情スタンプ送信機能（既存API活用）
  const sendEmotionStamp = useCallback(async (
    emotion: string,
    targetMessageId?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const chatAPI = new ChatAPIService();
      await chatAPI.sendEmotionStamp(emotion, targetMessageId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '感情スタンプ送信に失敗しました';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 7. グループメッセージ送信機能（既存API活用）
  const sendGroupMessage = useCallback(async (
    message: string,
    conversationId?: string
  ): Promise<any | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const chatAPI = new ChatAPIService();
      const response = await chatAPI.sendGroupMessage(message, conversationId);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'グループメッセージ送信に失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 8. 木の手動初期化機能（既存API活用）
  const initializeTree = useCallback(async (): Promise<any | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const treeAPI = new TreeAPIService();
      const response = await treeAPI.initializeTree();
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '木の初期化に失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 9. 木の手動成長更新機能（既存API活用）
  const manualTreeGrowthUpdate = useCallback(async (characters: number): Promise<any | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const treeAPI = new TreeAPIService();
      const response = await treeAPI.manualGrowthUpdate(characters);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '手動成長更新に失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 10. 手動果実生成機能（既存API活用）
  const createManualFruit = useCallback(async (fruitData: {
    user_message: string;
    ai_response: string;
    ai_character: any; // 型を適切に調整
    emotion_detected: string;
  }): Promise<any | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const treeAPI = new TreeAPIService();
      const response = await treeAPI.createManualFruit(fruitData);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '手動果実生成に失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ 11. 統合サブスクリプション解約機能（既存API活用）
  const cancelSubscriptionIntegrated = useCallback(async (reason?: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await IntegratedAccountService.cancelSubscription(reason);
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'サブスクリプション解約に失敗しました';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // エラークリア機能
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // システムヘルスレポート生成
  const generateHealthReport = useCallback((healthStatus: SystemHealthStatus): string => {
    return SystemHealthService.generateHealthReport(healthStatus);
  }, []);

  return {
    // 状態
    loading,
    error,
    clearError,

    // システムヘルス機能
    checkSystemHealth,
    checkServiceHealth,
    generateHealthReport,

    // アカウント統合機能
    getIntegratedAccountStatus,

    // オンボーディング機能
    getOnboardingStatus,
    completeOnboarding,

    // チャット拡張機能
    sendEmotionStamp,
    sendGroupMessage,

    // 木の管理機能
    initializeTree,
    manualTreeGrowthUpdate,
    createManualFruit,

    // 課金統合機能
    cancelSubscriptionIntegrated
  };
}

export default useExistingAPIIntegrations;