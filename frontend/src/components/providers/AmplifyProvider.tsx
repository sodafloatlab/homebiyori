/**
 * Amplify Provider Component
 * 
 * ■機能概要■
 * - Amplify初期化とアプリケーション全体への提供
 * - 認証状態の自動管理
 * - エラーハンドリング
 */

'use client';

import React, { useEffect, useState } from 'react';
import { initializeAmplify } from '@/lib/amplify';
import useAuthStore from '@/stores/authStore';
import BackendConnectionStatus from '@/components/ui/BackendConnectionStatus';

interface AmplifyProviderProps {
  children: React.ReactNode;
}

interface AmplifyInitState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

export default function AmplifyProvider({ children }: AmplifyProviderProps) {
  const [initState, setInitState] = useState<AmplifyInitState>({
    isInitialized: false,
    isLoading: true,
    error: null,
  });

  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setInitState({
          isInitialized: false,
          isLoading: true,
          error: null,
        });

        // Amplify初期化
        const amplifySuccess = initializeAmplify();
        
        if (!amplifySuccess) {
          throw new Error('Amplify initialization failed');
        }

        // 認証状態初期化
        await initializeAuth();
        
        // 既存の認証状態をチェック（ページリロード時など）
        const checkAuth = useAuthStore.getState().checkAuthStatus;
        await checkAuth();

        setInitState({
          isInitialized: true,
          isLoading: false,
          error: null,
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ AmplifyProvider: App initialized successfully');
        }

      } catch (error) {
        console.error('❌ AmplifyProvider initialization error:', error);
        setInitState({
          isInitialized: false,
          isLoading: false,
          error: error instanceof Error ? error.message : '初期化に失敗しました',
        });
      }
    };

    initializeApp();
  }, [initializeAuth]);

  // 初期化エラー時の表示
  if (initState.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-800 mb-2">初期化エラー</h2>
          <p className="text-red-600 text-sm mb-4">{initState.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // ローディング中の表示
  if (initState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-emerald-800 mb-2">ほめびより</h2>
          <p className="text-emerald-600 text-sm">アプリケーションを初期化しています...</p>
        </div>
      </div>
    );
  }

  // 初期化完了 - 子コンポーネントをレンダリング
  return (
    <>
      {children}
      <BackendConnectionStatus />
    </>
  );
}

// 開発環境用: Amplify状態確認コンポーネント
export function AmplifyDebugInfo() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const loadDebugInfo = async () => {
      try {
        const { getAmplifyDebugInfo } = await import('@/lib/amplify');
        const info = await getAmplifyDebugInfo();
        setDebugInfo(info);
      } catch (error) {
        console.error('Debug info load failed:', error);
      }
    };

    loadDebugInfo();
  }, []);

  if (process.env.NODE_ENV !== 'development' || !debugInfo) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs font-mono shadow-lg z-50 max-w-sm">
      <div className="mb-2 font-bold">🔧 Amplify Debug</div>
      <div className="space-y-1">
        <div>Region: {debugInfo.config?.region}</div>
        <div>Pool ID: {debugInfo.config?.userPoolId}</div>
        <div>Client ID: {debugInfo.config?.userPoolClientId}</div>
        <div>Auth: {debugInfo.authentication?.isAuthenticated ? '✅' : '❌'}</div>
        <div>User: {debugInfo.authentication?.username || 'None'}</div>
        <div>Tokens: {debugInfo.authentication?.hasTokens ? '✅' : '❌'}</div>
      </div>
    </div>
  );
}