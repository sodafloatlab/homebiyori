'use client';

import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { WarningButton } from '../../ui/WarningButton';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { TouchTarget } from '../../ui/TouchTarget';
import { useSubscriptionCancel } from '@/lib/hooks';

interface SubscriptionStatus {
  status: 'active' | 'inactive' | 'cancelled';
  currentPlan: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  monthlyAmount: number | null;
}

interface SubscriptionCancelPageProps {
  subscriptionStatus: SubscriptionStatus;
  onBack: () => void;
  onSuccess?: () => void;
}

export function SubscriptionCancelPage({
  subscriptionStatus,
  onBack,
  onSuccess
}: SubscriptionCancelPageProps) {
  const [reason, setReason] = useState('');
  const { loading, error, cancelSubscription, clearError } = useSubscriptionCancel();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const reasonOptions = [
    '料金が高い',
    'サービスが不要になった',
    '他のサービスを使用',
    '使い方がわからない',
    '一時的な休止',
    'その他'
  ];

  const handleConfirmCancel = async () => {
    try {
      await cancelSubscription(reason || undefined);
      onSuccess?.();
    } catch (error) {
      // エラーは useSubscriptionCancel フックで管理される
      console.error('サブスクリプション解約に失敗:', error);
    }
  };

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
        <div className="max-w-md mx-auto px-4 py-4 flex items-center">
          <TouchTarget
            onClick={onBack}
            className="mr-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="戻る"
          >
            <span className="text-xl">🔙</span>
          </TouchTarget>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            サブスクリプション解約
          </h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* 現在の契約情報 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
              💳 現在の契約情報
            </h2>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">プラン:</span>
              <span className="text-gray-900 dark:text-white">
                {subscriptionStatus.currentPlan}
                {subscriptionStatus.monthlyAmount && 
                  ` (¥${subscriptionStatus.monthlyAmount}/月)`}
              </span>
            </div>
            
            {subscriptionStatus.currentPeriodEnd && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">次回課金予定:</span>
                <span className="text-gray-900 dark:text-white">
                  {formatDate(subscriptionStatus.currentPeriodEnd)}
                </span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">状況:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                subscriptionStatus.status === 'active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                {subscriptionStatus.status === 'active' ? 'アクティブ' : '無効'}
              </span>
            </div>
          </div>
        </section>

        {/* 解約の影響 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-800">
          <div className="p-4 border-b border-yellow-200 dark:border-yellow-800">
            <h2 className="text-base font-semibold text-yellow-800 dark:text-yellow-200 flex items-center">
              ⚠️ 解約の影響について
            </h2>
          </div>
          
          <div className="p-4 space-y-3">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="mb-2">解約すると以下の制限があります：</p>
              <ul className="space-y-1 ml-4">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  プレミアムAI機能の利用停止
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  チャット履歴の保存期間短縮（30日→7日）
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  月次レポート機能の利用停止
                </li>
              </ul>
            </div>
            
            {subscriptionStatus.currentPeriodEnd && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-medium">お知らせ：</span>
                  {formatDate(subscriptionStatus.currentPeriodEnd)}まではプレミアム機能をご利用いただけます。
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 解約理由（任意） */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
              📝 解約理由（任意）
            </h2>
          </div>
          
          <div className="p-4">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">選択してください（任意）</option>
              {reasonOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ※ サービス改善のため、ご協力をお願いいたします
            </p>
          </div>
        </section>

        {/* アクションボタン */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={onBack} 
            variant="secondary" 
            className="flex-1"
            disabled={loading}
          >
            戻る
          </Button>
          <WarningButton
            onClick={handleConfirmCancel}
            disabled={loading}
            loading={loading}
            className="flex-1"
          >
            解約を実行
          </WarningButton>
        </div>

        {/* 注意事項 */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          解約後もアカウントとデータは保持されます。<br/>
          アカウントの削除をご希望の場合は、解約完了後にアカウント設定から手続きしてください。
        </div>
      </div>
    </div>
  );
}