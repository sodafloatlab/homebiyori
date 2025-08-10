'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { TouchTarget } from '../../ui/TouchTarget';
import { ProgressBar } from '../../ui/ProgressBar';

interface DeletionAction {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedAt?: string;
  estimatedCompletion?: string;
  error?: string;
}

interface AccountDeletionProgressPageProps {
  processId: string;
  actionsPerformed: DeletionAction[];
  estimatedCompletion: string;
  onStatusCheck: () => Promise<void>;
  onComplete: () => void;
  loading?: boolean;
}

export function AccountDeletionProgressPage({
  processId,
  actionsPerformed,
  estimatedCompletion,
  onStatusCheck,
  onComplete,
  loading = false
}: AccountDeletionProgressPageProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 自動更新機能（5秒間隔）
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        await onStatusCheck();
      } catch (error) {
        console.error('Status check failed:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, onStatusCheck]);

  // 全て完了したか確認
  const allCompleted = actionsPerformed.every(action => 
    action.status === 'completed' || action.status === 'failed'
  );

  const hasFailed = actionsPerformed.some(action => action.status === 'failed');

  // 完了した場合の自動遷移
  useEffect(() => {
    if (allCompleted && !hasFailed) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000); // 2秒後に自動遷移

      return () => clearTimeout(timer);
    }
  }, [allCompleted, hasFailed, onComplete]);

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status: DeletionAction['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '⏳';
      case 'failed':
        return '❌';
      case 'pending':
      default:
        return '⏳';
    }
  };

  const getStatusText = (status: DeletionAction['status']) => {
    switch (status) {
      case 'completed':
        return '完了';
      case 'in_progress':
        return '進行中...';
      case 'failed':
        return 'エラー';
      case 'pending':
      default:
        return '待機中...';
    }
  };

  const getStatusColor = (status: DeletionAction['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'pending':
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // プログレス計算
  const completedActions = actionsPerformed.filter(action => 
    action.status === 'completed' || action.status === 'failed'
  ).length;
  const progress = Math.round((completedActions / actionsPerformed.length) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            🔄 アカウント削除処理中
          </h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* 処理情報 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">処理ID:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">
                {processId}
              </span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">推定完了:</span>
              <span className="text-gray-900 dark:text-white">
                {formatTime(estimatedCompletion)}
              </span>
            </div>
          </div>
        </section>

        {/* プログレスバー */}
        <div className="space-y-2">
          <ProgressBar
            progress={progress}
            animated={!allCompleted}
            color={hasFailed ? 'red' : allCompleted ? 'green' : 'blue'}
            size="lg"
            showPercentage={true}
            label="削除進行状況"
          />
        </div>

        {/* 処理状況 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
              📋 処理状況
            </h2>
          </div>
          
          <div className="p-4">
            <div className="space-y-4">
              {actionsPerformed.map((action, index) => (
                <div key={action.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-lg" role="img" aria-label={action.status}>
                      {getStatusIcon(action.status)}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {action.name}
                      </h3>
                      <span className={`text-xs font-medium ${getStatusColor(action.status)}`}>
                        {getStatusText(action.status)}
                      </span>
                    </div>
                    
                    {action.status === 'completed' && action.completedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        完了: {formatTime(action.completedAt)}
                      </p>
                    )}
                    
                    {action.status === 'in_progress' && action.estimatedCompletion && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        推定完了: {formatTime(action.estimatedCompletion)}
                      </p>
                    )}
                    
                    {action.status === 'failed' && action.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        エラー: {action.error}
                      </p>
                    )}
                    
                    {action.status === 'in_progress' && (
                      <div className="mt-2">
                        <div className="flex items-center">
                          <LoadingSpinner size="sm" className="mr-2" />
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                            <div className="bg-blue-600 h-1 rounded-full animate-pulse w-1/2" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* エラー処理 */}
        {hasFailed && (
          <section className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="p-4">
              <h3 className="text-base font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center">
                ❌ エラーが発生しました
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                一部の処理でエラーが発生しました。サポートまでお問い合わせください。
              </p>
              <div className="text-xs text-red-600 dark:text-red-400">
                処理ID: {processId}
              </div>
            </div>
          </section>
        )}

        {/* 完了通知 */}
        {allCompleted && !hasFailed && (
          <section className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="p-4 text-center">
              <div className="text-4xl mb-2">🎊</div>
              <h3 className="text-base font-semibold text-green-800 dark:text-green-200 mb-2">
                削除処理が完了しました
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                2秒後に完了画面に自動で移動します...
              </p>
            </div>
          </section>
        )}

        {/* 注意事項 */}
        {!allCompleted && (
          <section className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="p-4">
              <h3 className="text-base font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center">
                ⚠️ 重要
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                この画面を閉じないでください。処理完了まで少々お待ちください。
              </p>
            </div>
          </section>
        )}

        {/* 手動更新ボタン */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={onStatusCheck}
            variant="secondary"
            className="flex-1"
            disabled={loading || allCompleted}
          >
            状況を更新
          </Button>
          
          {allCompleted && (
            <Button
              onClick={onComplete}
              className="flex-1"
            >
              完了画面へ
            </Button>
          )}
        </div>

        {/* 自動更新設定 */}
        {!allCompleted && (
          <div className="flex items-center justify-center space-x-2 text-sm">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="auto-refresh" className="text-gray-700 dark:text-gray-300">
              自動更新（5秒間隔）
            </label>
          </div>
        )}
      </div>
    </div>
  );
}