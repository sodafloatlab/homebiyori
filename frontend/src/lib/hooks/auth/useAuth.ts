/**
 * 認証管理Hook - 統一アーキテクチャ版
 * 
 * ■機能概要■
 * - ユーザー認証状態管理
 * - ログイン・ログアウト処理
 * - 認証トークン管理
 * - 認証コールバック処理
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '@/lib/auth';
import useAuthStore from '@/stores/authStore';
import { UserService } from '@/lib/services';
import type { AuthUser, UserProfile, UpdateUserProfileRequest } from '@/types';

interface UseAuthReturn {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  handleAuthCallback: () => Promise<void>;
  updateProfile: (updates: Partial<UpdateUserProfileRequest>) => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    user, 
    profile, 
    setUser, 
    setProfile, 
    logout,
    isLoggedIn 
  } = useAuthStore();

  // 初期化時の認証状態チェック
  useEffect(() => {
    checkInitialAuthStatus();
  }, []);

  const checkInitialAuthStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const authStatus = await AuthService.checkAuthStatus();
      
      if (authStatus) {
        setUser(authStatus.user);
        setProfile(authStatus.profile);
      } else {
        logout();
      }
    } catch (err) {
      console.error('Initial auth check failed:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { user: authUser, profile: userProfile } = await AuthService.signInWithGoogle();
      
      setUser(authUser);
      setProfile(userProfile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ログインに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setProfile]);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await AuthService.signOut();
      logout();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ログアウトに失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const refreshAuth = useCallback(async () => {
    try {
      setError(null);
      
      const success = await AuthService.refreshAuthSession();
      
      if (!success) {
        logout();
        throw new Error('認証セッションの更新に失敗しました');
      }
      
      // プロフィール情報も更新
      await checkInitialAuthStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '認証の更新に失敗しました';
      setError(errorMessage);
      logout();
      throw err;
    }
  }, [logout]);

  const handleAuthCallback = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { user: authUser, profile: userProfile } = await AuthService.handleAuthCallback();
      
      setUser(authUser);
      setProfile(userProfile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '認証コールバックの処理に失敗しました';
      setError(errorMessage);
      logout();
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setProfile, logout]);

  const updateProfile = useCallback(async (updates: Partial<UpdateUserProfileRequest>) => {
    try {
      setError(null);
      
      const updatedProfile = await UserService.updateProfile(updates);
      setProfile(updatedProfile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'プロフィールの更新に失敗しました';
      setError(errorMessage);
      throw err;
    }
  }, [setProfile]);

  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      const authStatus = await AuthService.checkAuthStatus();
      
      if (authStatus) {
        setUser(authStatus.user);
        setProfile(authStatus.profile);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (err) {
      console.error('Auth status check failed:', err);
      logout();
      return false;
    }
  }, [setUser, setProfile, logout]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: isLoggedIn,
    error,
    signInWithGoogle,
    signOut,
    refreshAuth,
    handleAuthCallback,
    updateProfile,
    checkAuthStatus,
    clearError
  };
}