/**
 * ユーザープロフィール管理Hook - 統一アーキテクチャ版
 * 
 * ■機能概要■
 * - ユーザープロフィール管理
 * - プロフィール更新
 * - キャラクター・設定変更
 */

'use client';

import { useState, useCallback } from 'react';
import useAuthStore from '@/stores/authStore';
import UserService from '@/lib/services/userService';
import type { UserProfile, UpdateUserProfileRequest } from '@/types';

interface UseUserProfileReturn {
  // 状態
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // アクション
  updateProfile: (updates: Partial<UpdateUserProfileRequest>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // 設定変更
  updateAICharacter: (character: 'mittyan' | 'madokasan' | 'hideji') => Promise<void>;
  updatePraiseLevel: (level: 'normal' | 'deep') => Promise<void>;
  updateInteractionMode: (mode: 'praise' | 'listen') => Promise<void>;
  
  // エラー管理
  clearError: () => void;
}

export function useUserProfile(): UseUserProfileReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { profile, setProfile } = useAuthStore();

  const updateProfile = useCallback(async (updates: Partial<UpdateUserProfileRequest>) => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedProfile = await UserService.updateProfile(updates);
      setProfile(updatedProfile);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'プロフィール更新に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setProfile]);

  const refreshProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const freshProfile = await UserService.getProfile();
      setProfile(freshProfile);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'プロフィール取得に失敗しました';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setProfile]);

  const updateAICharacter = useCallback(async (character: 'mittyan' | 'madokasan' | 'hideji') => {
    await updateProfile({ ai_character: character });
  }, [updateProfile]);

  const updatePraiseLevel = useCallback(async (level: 'normal' | 'deep') => {
    await updateProfile({ praise_level: level });
  }, [updateProfile]);

  const updateInteractionMode = useCallback(async (mode: 'praise' | 'listen') => {
    await updateProfile({ interaction_mode: mode });
  }, [updateProfile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // 状態
    profile,
    isLoading,
    error,
    
    // アクション
    updateProfile,
    refreshProfile,
    
    // 設定変更
    updateAICharacter,
    updatePraiseLevel,
    updateInteractionMode,
    
    // エラー管理
    clearError
  };
}