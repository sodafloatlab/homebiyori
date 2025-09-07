/**
 * OAuth Callback Page - CSR版
 * 
 * ■機能概要■
 * - Cognito OAuth認証後のコールバック処理
 * - 認証コード→トークン交換
 * - 認証状態管理・リダイレクト
 * - エラーハンドリング
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Home, ArrowLeft } from 'lucide-react';

interface AuthState {
  status: 'loading' | 'success' | 'error' | 'redirecting';
  message: string;
  error?: string;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<AuthState>({
    status: 'loading',
    message: '認証処理中...'
  });

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URLパラメータを取得
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const state = searchParams.get('state');

        // エラーパラメータが存在する場合
        if (error) {
          console.error('OAuth Error:', { error, errorDescription });
          setAuthState({
            status: 'error',
            message: 'ログインに失敗しました',
            error: errorDescription || error
          });
          
          // 3秒後にサインイン画面にリダイレクト
          setTimeout(() => {
            router.push(`/auth/signin?error=${encodeURIComponent(error)}`);
          }, 3000);
          return;
        }

        // 認証コードが存在しない場合
        if (!code) {
          console.error('No authorization code received');
          setAuthState({
            status: 'error',
            message: '認証コードが取得できませんでした',
            error: '無効なリクエストです'
          });
          
          setTimeout(() => {
            router.push('/auth/signin?error=no_code');
          }, 3000);
          return;
        }

        console.log('Authorization code received:', code.substring(0, 10) + '...');

        // AWS Amplify Authでコールバック処理
        const { handleAuthCallback } = await import('@/lib/amplify');
        const result = await handleAuthCallback();
        
        if (!result.success) {
          console.error('Auth callback failed:', result.error);
          setAuthState({
            status: 'error',
            message: '認証処理でエラーが発生しました',
            error: result.error || '認証情報の処理に失敗しました'
          });
          
          setTimeout(() => {
            router.push('/auth/signin?error=callback_failed');
          }, 3000);
          return;
        }

        // 認証成功 - Zustand Storeに状態を反映
        console.log('Authentication successful:', result.user?.username);
        
        // 認証ストアを更新
        const module = await import('@/stores/authStore');
        const useAuthStore = module.default;
        const store = useAuthStore.getState();
        
        // まず認証状態をチェックしてストアを更新
        await store.checkAuthStatus(); // 最新の認証状態を取得
        
        // 更新されたストア状態を確認
        const updatedStore = useAuthStore.getState();
        console.log('Updated auth store:', {
          isLoggedIn: updatedStore.isLoggedIn,
          userId: updatedStore.user?.userId,
          email: updatedStore.user?.email
        });
        
        setAuthState({
          status: 'success',
          message: 'ログイン成功！'
        });

        // オンボーディング状態チェック後にリダイレクト
        setTimeout(async () => {
          setAuthState({
            status: 'redirecting',
            message: '画面を準備しています...'
          });
          
          // オンボーディング状態をチェック
          const updatedStore = useAuthStore.getState();
          const isOnboardingCompleted = await updatedStore.checkOnboardingStatus();
          
          setTimeout(() => {
            if (isOnboardingCompleted) {
              // オンボーディング完了済み → メインアプリ
              router.push('/');
            } else {
              // オンボーディング未完了 → ニックネーム登録
              router.push('/onboarding/nickname');
            }
          }, 1500);
        }, 2000);

        // 実際のCognito実装時のサンプルコード（コメントアウト）
        /*
        // AWS Cognito SDK でトークン交換
        const tokenResponse = await fetch('/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
            redirectUri: window.location.origin + '/auth/callback'
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Token exchange failed');
        }

        const tokenData = await tokenResponse.json();
        
        // トークンをセキュアに保存
        localStorage.setItem('accessToken', tokenData.accessToken);
        localStorage.setItem('idToken', tokenData.idToken);
        localStorage.setItem('refreshToken', tokenData.refreshToken);

        // グローバル認証状態更新
        // authStore.setAuthenticated(true, tokenData.user);

        setAuthState({
          status: 'success',
          message: 'ログイン成功！'
        });

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
        */

      } catch (error) {
        console.error('Auth callback error:', error);
        setAuthState({
          status: 'error',
          message: '認証処理でエラーが発生しました',
          error: error instanceof Error ? error.message : '不明なエラー'
        });

        // エラー時も3秒後にサインイン画面にリダイレクト
        setTimeout(() => {
          router.push('/auth/signin?error=callback_failed');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  const handleManualRedirect = () => {
    if (authState.status === 'error') {
      router.push('/auth/signin');
    } else if (authState.status === 'success') {
      router.push('/');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center"
      >
        {/* ステータスアイコン */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-6"
        >
          {authState.status === 'loading' && (
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
          )}
          
          {authState.status === 'success' && (
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          )}
          
          {authState.status === 'error' && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          )}
          
          {authState.status === 'redirecting' && (
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowLeft className="w-8 h-8 text-blue-600 transform rotate-180" />
            </div>
          )}
        </motion.div>

        {/* ステータスメッセージ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className={`text-2xl font-bold mb-4 ${
            authState.status === 'success' 
              ? 'text-emerald-800' 
              : authState.status === 'error'
              ? 'text-red-800'
              : authState.status === 'redirecting'
              ? 'text-blue-800'
              : 'text-gray-800'
          }`}>
            {authState.status === 'loading' && 'ログイン処理中'}
            {authState.status === 'success' && 'ログイン成功！'}
            {authState.status === 'error' && 'ログインエラー'}
            {authState.status === 'redirecting' && '移動中...'}
          </h1>
          
          <p className={`text-lg mb-2 ${
            authState.status === 'error' ? 'text-red-600' : 'text-gray-700'
          }`}>
            {authState.message}
          </p>
          
          {authState.error && (
            <p className="text-sm text-red-500 mb-4">
              詳細: {authState.error}
            </p>
          )}
        </motion.div>

        {/* 進行状況インジケータ */}
        {authState.status === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-6"
          >
            <div className="text-sm text-emerald-600 mb-2">認証を処理しています</div>
            <div className="w-full bg-emerald-100 rounded-full h-2">
              <motion.div
                className="bg-emerald-500 h-2 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}

        {/* 成功時の次の手順案内 */}
        {authState.status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4"
          >
            <p className="text-emerald-700 text-sm">
              まもなく初期設定に移動します。<br />
              AIキャラクターの選択などを行います！
            </p>
          </motion.div>
        )}

        {/* エラー時の対処案内 */}
        {authState.status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
          >
            <p className="text-red-700 text-sm mb-3">
              認証でエラーが発生しました。<br />
              以下をお試しください：
            </p>
            <ul className="text-red-600 text-xs text-left space-y-1">
              <li>• ブラウザを再読み込みしてやり直す</li>
              <li>• Googleアカウントからログアウト後に再試行</li>
              <li>• 別のブラウザで試行する</li>
            </ul>
          </motion.div>
        )}

        {/* 手動ナビゲーションボタン */}
        {(authState.status === 'error' || authState.status === 'success') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex gap-3"
          >
            <button
              onClick={() => router.push('/')}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
            >
              <Home className="w-4 h-4 mr-2" />
              ホーム
            </button>
            <button
              onClick={handleManualRedirect}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center ${
                authState.status === 'success'
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {authState.status === 'success' ? 'メインアプリ' : '再試行'}
            </button>
          </motion.div>
        )}

        {/* 開発者向けデバッグ情報（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-6 p-3 bg-gray-100 rounded-lg text-left"
          >
            <p className="text-xs text-gray-600 mb-2 font-mono">Debug Info:</p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Status: {authState.status}</div>
              <div>Code: {searchParams.get('code') ? '✓' : '✗'}</div>
              <div>Error: {searchParams.get('error') || 'None'}</div>
              <div>State: {searchParams.get('state') || 'None'}</div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}