/**
 * 認証状態管理 Store (Zustand)
 * 
 * ■機能概要■
 * - ユーザー認証状態のグローバル管理
 * - Amplify Authとの連携
 * - 認証トークン管理
 * - ローディング状態管理
 */

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser, AuthTokens } from 'aws-amplify/auth';

export interface User {
  id: string;
  username: string;
  email?: string;
  signInDetails?: {
    loginId?: string;
    authFlowType?: string;
  };
}

interface AuthState {
  // 認証状態
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  // ユーザー情報
  user: User | null;
  tokens: AuthTokens | null;
  
  // エラー状態
  error: string | null;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUser: (user: AuthUser | null, tokens?: AuthTokens | null) => void;
  signOut: () => void;
  initialize: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
}

// Amplify AuthUserをUser型に変換
const convertAuthUser = (authUser: AuthUser | null): User | null => {
  if (!authUser) return null;
  
  return {
    id: authUser.userId,
    username: authUser.username,
    signInDetails: authUser.signInDetails ? {
      loginId: authUser.signInDetails.loginId,
      authFlowType: authUser.signInDetails.authFlowType,
    } : undefined,
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      isAuthenticated: false,
      isLoading: true, // 初期化時はローディング状態
      isInitialized: false,
      user: null,
      tokens: null,
      error: null,

      // Actions
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setUser: (authUser: AuthUser | null, tokens: AuthTokens | null = null) => {
        const user = convertAuthUser(authUser);
        set({
          user,
          tokens,
          isAuthenticated: user !== null,
          error: null,
        });
      },

      signOut: () => {
        set({
          isAuthenticated: false,
          user: null,
          tokens: null,
          error: null,
        });
      },

      initialize: async () => {
        const { setLoading, setUser, setError } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          // Amplify Authから現在の認証状態を取得
          const { getCurrentUserInfo } = await import('@/lib/amplify');
          const { user, tokens, error } = await getCurrentUserInfo();
          
          if (error) {
            console.warn('Auth initialization warning:', error);
          }
          
          setUser(user, tokens);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Auth store initialized:', {
              isAuthenticated: user !== null,
              user: user ? { id: user.userId, username: user.username } : null,
            });
          }
          
        } catch (error) {
          console.error('Auth store initialization failed:', error);
          setError('認証状態の初期化に失敗しました');
        } finally {
          set({ isInitialized: true });
          setLoading(false);
        }
      },

      checkAuthStatus: async (): Promise<boolean> => {
        const { setUser, setError } = get();
        
        try {
          const { getCurrentUserInfo } = await import('@/lib/amplify');
          const { user, tokens } = await getCurrentUserInfo();
          
          setUser(user, tokens);
          return user !== null;
          
        } catch (error) {
          console.error('Auth status check failed:', error);
          setError('認証状態の確認に失敗しました');
          setUser(null, null);
          return false;
        }
      },
    }),
    {
      name: 'homebiyori-auth-storage', // localStorage key (renamed)
      partialize: (state) => ({
        // 永続化は最小限に（Amplify Authが認証状態を管理）
        isInitialized: state.isInitialized,
      }),
    }
  )
);

// Auth store 初期化フック
export const useAuthInitialization = () => {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  
  React.useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);
  
  return { isInitialized };
};

// 便利なセレクター
export const useAuth = () => {
  const {
    isAuthenticated,
    isLoading,
    isInitialized,
    user,
    error,
    signOut,
    checkAuthStatus,
  } = useAuthStore();

  return {
    isAuthenticated,
    isLoading,
    isInitialized,
    user,
    error,
    signOut,
    checkAuthStatus,
  };
};

// 認証必須ページ用のガード
export const useAuthGuard = (redirectTo: string = '/auth/signin') => {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  
  React.useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = redirectTo;
      }
    }
  }, [isAuthenticated, isLoading, isInitialized, redirectTo]);
  
  return {
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
  };
};