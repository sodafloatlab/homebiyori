'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

interface AccountDeletionCompletePageProps {
  completionTime: string;
  supportContact: string;
  onClose: () => void;
  loading?: boolean;
}

export function AccountDeletionCompletePage({
  completionTime,
  supportContact,
  onClose,
  loading = false
}: AccountDeletionCompletePageProps) {
  const [countdown, setCountdown] = useState(10); // 10秒カウントダウン
  const [isAutoLogout, setIsAutoLogout] = useState(true);

  // カウントダウンと自動ログアウト
  useEffect(() => {
    if (!isAutoLogout) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // カウントダウン終了時に自動ログアウト
      onClose();
    }
  }, [countdown, isAutoLogout, onClose]);

  const formatDateTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const completedItems = [
    'ユーザープロフィール削除',
    'チャット履歴削除',
    'ほめの実データ削除',
    '木の成長記録削除',
    'AI設定情報削除',
    'アカウント情報削除'
  ];

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
            ✅ アカウント削除が完了しました
          </h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* メイン完了メッセージ */}
        <section className="text-center py-8">
          <div className="text-6xl mb-4">🎊</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            お疲れ様でした
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            アカウント削除処理が正常に完了いたしました
          </p>
        </section>

        {/* 完了情報 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
              📅 完了情報
            </h3>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">完了日時:</span>
              <span className="text-gray-900 dark:text-white">
                {formatDateTime(completionTime)}
              </span>
            </div>
          </div>
        </section>

        {/* 処理完了項目 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
              ✅ 処理完了項目
            </h3>
          </div>
          
          <div className="p-4">
            <div className="space-y-2">
              {completedItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* サポート情報 */}
        <section className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="p-4">
            <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
              📞 サポートが必要な場合
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              削除処理に関してご質問がございましたら、下記までお問い合わせください：
            </p>
            <div className="text-sm font-mono text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded">
              {supportContact}
            </div>
          </div>
        </section>

        {/* お礼メッセージ */}
        <section className="bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 text-center">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center justify-center">
              🙏 感謝の気持ち
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Homebiyoriをご利用いただき、本当にありがとうございました。<br/>
              皆様の育児を応援できたこと、心から嬉しく思います。<br/>
              今後ともよろしくお願いいたします。
            </p>
          </div>
        </section>

        {/* 自動ログアウトカウントダウン */}
        {isAutoLogout && countdown > 0 && (
          <section className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <LoadingSpinner size="sm" />
                <span className="text-yellow-800 dark:text-yellow-200 font-semibold">
                  自動ログアウト中...
                </span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <span className="font-mono text-lg">{countdown}</span>秒後に自動的にログアウトします
              </p>
            </div>
          </section>
        )}

        {/* アクションボタン */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={onClose}
            className="w-full"
            size="lg"
          >
            今すぐログアウト
          </Button>
          
          {isAutoLogout && (
            <Button
              onClick={() => setIsAutoLogout(false)}
              variant="secondary"
              className="w-full"
            >
              自動ログアウトを停止
            </Button>
          )}
        </div>

        {/* 最終確認メッセージ */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
          <p>
            アカウント削除により、すべてのデータが完全に削除されました。
          </p>
          <p>
            このデータは復旧することができませんのでご注意ください。
          </p>
        </div>
      </div>
    </div>
  );
}