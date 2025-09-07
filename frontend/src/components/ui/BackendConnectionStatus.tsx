/**
 * Backend Connection Status Component
 * 
 * ■機能概要■
 * - バックエンド接続状態の表示
 * - オフライン機能利用時の通知
 * - プロフィール同期リトライ機能
 * - Graceful Degradation対応
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Wifi, WifiOff, RefreshCw, CheckCircle, X } from 'lucide-react';
import useAuthStore from '@/stores/authStore';
import Button from '@/components/ui/Button';

interface BackendConnectionStatusProps {
  /** 自動表示するかどうか */
  autoShow?: boolean;
  /** 表示位置 */
  position?: 'top' | 'bottom';
  /** 閉じることができるか */
  dismissible?: boolean;
  /** 閉じた時のコールバック */
  onDismiss?: () => void;
}

export default function BackendConnectionStatus({
  autoShow = true,
  position = 'top',
  dismissible = true,
  onDismiss
}: BackendConnectionStatusProps) {
  const { 
    profileError, 
    isLoading,
    hasBackendConnection,
    retryProfileSync,
    syncProfileWithBackend 
  } = useAuthStore();

  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isRetrying, setIsRetrying] = React.useState(false);

  // バックエンド接続状態を判定
  const isOffline = !hasBackendConnection();
  const shouldShow = autoShow && profileError && !isDismissed;

  const handleRetrySync = async () => {
    setIsRetrying(true);
    try {
      await retryProfileSync();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const positionClasses = {
    top: 'top-4 left-4 right-4',
    bottom: 'bottom-4 left-4 right-4'
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'top' ? -50 : 50 }}
          transition={{ duration: 0.3 }}
          className={`fixed ${positionClasses[position]} z-50`}
        >
          <div className="bg-white border border-amber-200 rounded-xl shadow-lg p-4 mx-auto max-w-md">
            {/* ヘッダー */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0">
                  <WifiOff className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800 text-sm">
                    オフライン機能で動作中
                  </h3>
                  <p className="text-amber-600 text-xs">
                    データ同期に問題が発生しています
                  </p>
                </div>
              </div>
              
              {dismissible && (
                <button
                  onClick={handleDismiss}
                  className="text-amber-400 hover:text-amber-600 transition-colors"
                  aria-label="通知を閉じる"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 詳細メッセージ */}
            <div className="mb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">現在の状況</span>
                </div>
                <ul className="space-y-1 text-xs">
                  <li>• プロフィール設定の同期ができません</li>
                  <li>• ローカルデータで機能を継続します</li>
                  <li>• チャット機能は制限される場合があります</li>
                </ul>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRetrySync}
                disabled={isRetrying || isLoading}
                className="flex-1 text-xs"
                leftIcon={
                  <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                }
              >
                {isRetrying ? '再接続中...' : '再接続を試す'}
              </Button>
              
              {dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-xs text-amber-600 hover:text-amber-800"
                >
                  後で
                </Button>
              )}
            </div>

            {/* 成功時の一時的なフィードバック */}
            <AnimatePresence>
              {hasBackendConnection() && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 flex items-center space-x-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">接続が復旧しました</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// フック形式での利用
export function useBackendConnectionStatus() {
  const { profileError, hasBackendConnection, retryProfileSync } = useAuthStore();
  
  return {
    isOffline: !hasBackendConnection(),
    hasError: !!profileError,
    errorMessage: profileError,
    retryConnection: retryProfileSync
  };
}