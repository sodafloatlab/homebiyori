import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/stores/authStore';
import useChatStore from '@/stores/chatStore';
import useTreeStore from '@/stores/treeStore';
import useNotificationStore from '@/stores/notificationStore';
import useMaintenanceStore from '@/stores/maintenanceStore';
import { AuthService } from '@/lib/auth';
import { ChatService, TreeService, UserService, NotificationService } from '@/lib/services';
import { accountSettingsService } from '@/lib/services/AccountSettingsService';
import { billingService } from '@/lib/services/BillingService';
import type { 
  AccountStatus, 
  DeletionRequest, 
  DeletionConfirmation,
  DeletionResponse,
  DeletionProgressResponse 
} from '@/lib/services/AccountSettingsService';
import type {
  CreateSubscriptionRequest,
  SubscriptionStatus
} from '@/lib/services/BillingService';

/**
 * 認証状態管理フック
 */
export const useAuth = () => {
  const authStore = useAuthStore();
  const router = useRouter();

  const signInWithGoogle = useCallback(async () => {
    try {
      authStore.setLoading(true);
      authStore.clearError();
      
      const { user, profile } = await AuthService.signInWithGoogle();
      authStore.login({ user, profile });
      
      return { user, profile };
    } catch (error: any) {
      authStore.setError(error.message);
      throw error;
    } finally {
      authStore.setLoading(false);
    }
  }, [authStore]);

  const signOut = useCallback(async () => {
    try {
      authStore.setLoading(true);
      await AuthService.signOut();
      authStore.logout();
      router.push('/');
    } catch (error: any) {
      authStore.setError(error.message);
    } finally {
      authStore.setLoading(false);
    }
  }, [authStore, router]);

  const checkAuthStatus = useCallback(async () => {
    try {
      authStore.setLoading(true);
      const authData = await AuthService.checkAuthStatus();
      
      if (authData) {
        authStore.login(authData);
      } else {
        authStore.logout();
      }
      
      return !!authData;
    } catch (error) {
      authStore.logout();
      return false;
    } finally {
      authStore.setLoading(false);
    }
  }, [authStore]);

  return {
    ...authStore,
    signInWithGoogle,
    signOut,
    checkAuthStatus
  };
};

/**
 * チャット機能フック
 */
export const useChat = () => {
  const chatStore = useChatStore();
  const treeStore = useTreeStore();

  const sendMessage = useCallback(async (message: string) => {
    try {
      chatStore.setLoading(true);
      chatStore.clearError();

      const response = await ChatService.sendMessage({
        message,
        aiCharacter: chatStore.aiCharacter!,
        praiseLevel: chatStore.praiseLevel,
        contextLength: 10
      });

      // チャットストアにメッセージ追加
      chatStore.addMessage({
        id: `user-${Date.now()}`,
        text: message,
        sender: 'user',
        timestamp: Date.now()
      });

      chatStore.addMessage({
        id: `ai-${Date.now()}`,
        text: response.response,
        sender: 'ai',
        timestamp: Date.now(),
        aiRole: chatStore.selectedAiRole!,
        mood: chatStore.currentMood,
        emotion: response.emotion
      });

      // チャット履歴に追加
      chatStore.addToHistory({
        id: `history-${Date.now()}`,
        userMessage: message,
        aiResponse: response.response,
        aiRole: chatStore.selectedAiRole!,
        timestamp: Date.now(),
        mode: chatStore.chatMode
      });

      // 木の成長に反映
      await treeStore.growTree(
        message,
        response.response,
        chatStore.selectedAiRole!,
        response.emotion
      );

      return response;
    } catch (error: any) {
      chatStore.setError(error.message);
      throw error;
    } finally {
      chatStore.setLoading(false);
    }
  }, [chatStore, treeStore]);

  const loadChatHistory = useCallback(async () => {
    try {
      chatStore.setLoading(true);
      const response = await ChatService.getChatHistory({ limit: 50 });
      
      const history = response.chats.map(chat => ({
        id: chat.chat_id,
        userMessage: chat.user_message,
        aiResponse: chat.ai_response,
        aiRole: chat.ai_character as any,
        timestamp: new Date(chat.timestamp).getTime(),
        mode: 'normal' as const
      }));

      chatStore.setHistory(history);
    } catch (error: any) {
      chatStore.setError(error.message);
    } finally {
      chatStore.setLoading(false);
    }
  }, [chatStore]);

  return {
    ...chatStore,
    sendMessage,
    loadChatHistory
  };
};

/**
 * 木の成長管理フック
 */
export const useTree = () => {
  const treeStore = useTreeStore();

  const loadTreeStatus = useCallback(async () => {
    try {
      treeStore.setLoading(true);
      const response = await TreeService.getTreeStatus();
      
      treeStore.setStatus(response.tree);
      treeStore.setFruits(response.recent_activity);
      treeStore.setTotalCharacters(
        response.recent_activity.reduce((total, fruit) => {
          return total + fruit.userMessage.length + fruit.aiResponse.length;
        }, 0)
      );
    } catch (error: any) {
      treeStore.setError(error.message);
    } finally {
      treeStore.setLoading(false);
    }
  }, [treeStore]);

  const loadFruits = useCallback(async (limit: number = 20) => {
    try {
      treeStore.setLoading(true);
      const response = await TreeService.getFruits({ limit });
      treeStore.setFruits(response.fruits);
    } catch (error: any) {
      treeStore.setError(error.message);
    } finally {
      treeStore.setLoading(false);
    }
  }, [treeStore]);

  return {
    ...treeStore,
    loadTreeStatus,
    loadFruits
  };
};

/**
 * 通知管理フック
 */
export const useNotifications = () => {
  const notificationStore = useNotificationStore();

  const loadNotifications = useCallback(async () => {
    try {
      notificationStore.setLoading(true);
      const response = await NotificationService.getNotifications({ limit: 20 });
      notificationStore.setNotifications(response.notifications);
    } catch (error: any) {
      notificationStore.setError(error.message);
    } finally {
      notificationStore.setLoading(false);
    }
  }, [notificationStore]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      notificationStore.markAsRead(notificationId);
    } catch (error: any) {
      notificationStore.setError(error.message);
    }
  }, [notificationStore]);

  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
      notificationStore.markAllAsRead();
    } catch (error: any) {
      notificationStore.setError(error.message);
    }
  }, [notificationStore]);

  return {
    ...notificationStore,
    loadNotifications,
    markAsRead,
    markAllAsRead
  };
};

/**
 * メンテナンスモード管理フック
 */
export const useMaintenance = () => {
  const maintenanceStore = useMaintenanceStore();

  useEffect(() => {
    // メンテナンス状態の自動チェック開始
    maintenanceStore.startAutoCheck();

    return () => {
      // クリーンアップ
      maintenanceStore.stopAutoCheck();
    };
  }, [maintenanceStore]);

  return maintenanceStore;
};

/**
 * ユーザープロフィール管理フック
 */
export const useUserProfile = () => {
  const authStore = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProfile = useCallback(async (updates: {
    nickname?: string;
    onboarding_completed?: boolean;
  }) => {
    try {
      setIsUpdating(true);
      authStore.setProfileLoading(true);
      authStore.setProfileError(null);

      const updatedProfile = await UserService.updateProfile(updates);
      authStore.setProfile(updatedProfile);
      
      return updatedProfile;
    } catch (error: any) {
      authStore.setProfileError(error.message);
      throw error;
    } finally {
      setIsUpdating(false);
      authStore.setProfileLoading(false);
    }
  }, [authStore]);

  const updateAIPreferences = useCallback(async (preferences: {
    ai_character: any;
    praise_level: any;
  }) => {
    try {
      setIsUpdating(true);
      const updated = await UserService.updateAIPreferences(preferences);
      
      // プロフィールも更新
      if (authStore.profile) {
        authStore.updateProfile({
          ai_character: updated.ai_character,
          praise_level: updated.praise_level
        });
      }
      
      return updated;
    } catch (error: any) {
      authStore.setProfileError(error.message);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [authStore]);

  return {
    profile: authStore.profile,
    isLoading: authStore.isProfileLoading || isUpdating,
    error: authStore.profileError,
    updateProfile,
    updateAIPreferences
  };
};

/**
 * ローカルストレージ同期フック
 */
export const useLocalStorageSync = (key: string, defaultValue: any) => {
  const [value, setValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setValue(JSON.parse(stored));
      }
    } catch (error) {
      console.warn(`Failed to load from localStorage key: ${key}`, error);
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  const updateValue = useCallback((newValue: any) => {
    try {
      setValue(newValue);
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.warn(`Failed to save to localStorage key: ${key}`, error);
    }
  }, [key]);

  const clearValue = useCallback(() => {
    try {
      setValue(defaultValue);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to clear localStorage key: ${key}`, error);
    }
  }, [key, defaultValue]);

  return {
    value,
    updateValue,
    clearValue,
    isLoading
  };
};

/**
 * アカウント状態取得フック
 */
export const useAccountStatus = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);

  const fetchAccountStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await accountSettingsService.getAccountStatus();
      setAccountStatus(status);
      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    accountStatus,
    fetchAccountStatus,
    clearError
  };
};

/**
 * アカウント削除フック（安全性重視）
 */
export const useAccountDeletion = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletionResponse, setDeletionResponse] = useState<DeletionResponse | null>(null);
  const [completionResponse, setCompletionResponse] = useState<DeletionProgressResponse | null>(null);

  const requestAccountDeletion = useCallback(async (request: DeletionRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountSettingsService.requestAccountDeletion(request);
      setDeletionResponse(response);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '削除リクエストに失敗しました';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmAccountDeletion = useCallback(async (confirmation: DeletionConfirmation) => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountSettingsService.confirmAccountDeletion(confirmation);
      setCompletionResponse(response);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '削除確認に失敗しました';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setDeletionResponse(null);
    setCompletionResponse(null);
  }, []);

  return {
    loading,
    error,
    deletionResponse,
    completionResponse,
    requestAccountDeletion,
    confirmAccountDeletion,
    clearError,
    reset
  };
};

/**
 * サブスクリプション解約フック（安全性重視）
 */
export const useSubscriptionCancel = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelSubscription = useCallback(async (reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountSettingsService.cancelSubscription(reason);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'サブスクリプション解約に失敗しました';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    cancelSubscription,
    clearError
  };
};

/**
 * サブスクリプション管理フック
 */
export const useSubscription = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  const createSubscription = useCallback(async (request: CreateSubscriptionRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await billingService.createSubscription(request);
      
      // Stripe Checkoutにリダイレクト
      if (response.redirect_url) {
        window.location.href = response.redirect_url;
        return response;
      }
      
      // Payment Intentの場合は client_secret を返す
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'サブスクリプション作成に失敗しました';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubscriptionStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await billingService.getSubscriptionStatus();
      setSubscriptionStatus(status);
      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'サブスクリプション状態の取得に失敗しました';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCustomerPortal = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await billingService.getCustomerPortalUrl();
      
      // Customer Portalにリダイレクト
      window.location.href = response.url;
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '顧客ポータルの取得に失敗しました';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    subscriptionStatus,
    createSubscription,
    loadSubscriptionStatus,
    getCustomerPortal,
    clearError
  };
};

/**
 * プレミアム機能制限チェック・誘導フック
 */
export const usePremiumFeatureGuard = (onPremiumRequired?: () => void) => {
  const auth = useAuth();
  const subscription = useSubscription();

  // ユーザーのサブスクリプション状態をチェック
  const isPremiumUser = useCallback(() => {
    return auth.profile?.subscription_plan === 'premium' || 
           auth.profile?.subscription_plan === 'premium_yearly';
  }, [auth.profile]);

  // プレミアム機能アクセス時のガード
  const checkPremiumFeature = useCallback((
    featureName: 'deep_mode' | 'group_chat' | 'long_history',
    options: {
      showAlert?: boolean;
      customMessage?: string;
    } = {}
  ) => {
    if (isPremiumUser()) {
      return true;
    }

    const { showAlert = true, customMessage } = options;
    
    if (showAlert) {
      const messages = {
        deep_mode: 'ディープモードはプレミアム限定機能です。より深い褒めと共感を体験してみませんか？',
        group_chat: 'グループチャットはプレミアム限定機能です。3人のAIキャラクターと同時にお話しできます。',
        long_history: 'チャット履歴長期保存はプレミアム限定機能です。大切な会話を180日間保存できます。'
      };
      
      const message = customMessage || messages[featureName];
      
      if (window.confirm(`${message}\n\nプレミアムプランの詳細を確認しますか？`)) {
        onPremiumRequired?.();
      }
    } else {
      onPremiumRequired?.();
    }

    return false;
  }, [isPremiumUser, onPremiumRequired]);

  // プレミアムプランへのサブスクリプション開始
  const startPremiumSubscription = useCallback(async (plan: 'monthly' | 'yearly') => {
    try {
      await subscription.createSubscription({ plan });
    } catch (error) {
      console.error('Premium subscription error:', error);
      throw error;
    }
  }, [subscription]);

  return {
    isPremiumUser: isPremiumUser(),
    checkPremiumFeature,
    startPremiumSubscription,
    subscriptionLoading: subscription.loading,
    subscriptionError: subscription.error
  };
};