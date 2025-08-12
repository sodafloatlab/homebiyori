'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle,
  X,
  ArrowLeft
} from 'lucide-react';
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

type CancelStep = 'reason' | 'confirmation' | 'complete';

export function SubscriptionCancelPage({
  subscriptionStatus,
  onBack,
  onSuccess
}: SubscriptionCancelPageProps) {
  const [currentStep, setCurrentStep] = useState<CancelStep>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const { loading, error, cancelSubscription, clearError } = useSubscriptionCancel();

  const cancelReasons = [
    {
      id: 'cost',
      title: '料金が高い',
      description: '月額料金を見直したい'
    },
    {
      id: 'features',
      title: '機能を使わない',
      description: 'プレミアム機能をあまり利用していない'
    },
    {
      id: 'temporary',
      title: '一時的に利用停止',
      description: 'しばらく利用する予定がない'
    },
    {
      id: 'dissatisfied',
      title: '期待と違った',
      description: 'サービス内容が期待と異なっていた'
    },
    {
      id: 'other',
      title: 'その他',
      description: '上記以外の理由'
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
  };

  const handleProceedToConfirmation = () => {
    setCurrentStep('confirmation');
  };

  const handleFinalCancel = async () => {
    try {
      const reasonText = selectedReason ? cancelReasons.find(r => r.id === selectedReason)?.title : '';
      const fullReason = feedback ? `${reasonText}: ${feedback}` : reasonText;
      
      await cancelSubscription(fullReason || undefined);
      setCurrentStep('complete');
    } catch (error) {
      // エラーは useSubscriptionCancel フックで管理される
      console.error('サブスクリプション解約に失敗:', error);
    }
  };

  const renderReasonStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          プレミアムプランを解約しますか？
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          解約理由をお聞かせください（任意）
        </p>
      </div>

      <div className="space-y-3">
        {cancelReasons.map((reason) => (
          <TouchTarget
            key={reason.id}
            onClick={() => handleReasonSelect(reason.id)}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
              selectedReason === reason.id
                ? 'bg-orange-100 dark:bg-orange-900/20 border-orange-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/10'
            }`}
          >
            <div className="font-medium text-gray-900 dark:text-white mb-1">
              {reason.title}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {reason.description}
            </div>
          </TouchTarget>
        ))}
      </div>

      <div className="mt-6">
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          追加のご意見・ご要望（任意）
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="サービス改善のため、ご意見をお聞かせください..."
          className="w-full p-3 text-gray-800 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
          rows={3}
        />
      </div>

      <div className="flex space-x-3">
        <Button
          onClick={onBack}
          variant="secondary"
          className="flex-1"
        >
          戻る
        </Button>
        <Button
          onClick={handleProceedToConfirmation}
          className="flex-1 bg-orange-500 hover:bg-orange-600"
        >
          解約手続きを続ける
        </Button>
      </div>
    </motion.div>
  );

  const renderConfirmationStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          解約の確認
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          プレミアムプランを解約すると以下の機能がご利用いただけなくなります
        </p>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="font-semibold text-red-800 dark:text-red-200 mb-4">
          利用できなくなる機能：
        </div>
        <div className="space-y-2">
          <div className="flex items-center text-red-700 dark:text-red-300">
            <X className="w-4 h-4 mr-2" />
            <span className="text-sm">プレミアムAI機能（ディープモード）</span>
          </div>
          <div className="flex items-center text-red-700 dark:text-red-300">
            <X className="w-4 h-4 mr-2" />
            <span className="text-sm">グループチャット機能</span>
          </div>
          <div className="flex items-center text-red-700 dark:text-red-300">
            <X className="w-4 h-4 mr-2" />
            <span className="text-sm">チャット履歴180日保存（30日間に変更）</span>
          </div>
          <div className="flex items-center text-red-700 dark:text-red-300">
            <X className="w-4 h-4 mr-2" />
            <span className="text-sm">月次レポート機能</span>
          </div>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
        <div className="font-semibold text-green-800 dark:text-green-200 mb-4">
          引き続きご利用いただける機能：
        </div>
        <div className="space-y-2">
          <div className="flex items-center text-green-700 dark:text-green-300">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">1:1チャット機能</span>
          </div>
          <div className="flex items-center text-green-700 dark:text-green-300">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">成長の木機能</span>
          </div>
          <div className="flex items-center text-green-700 dark:text-green-300">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">ほめの実機能</span>
          </div>
          <div className="flex items-center text-green-700 dark:text-green-300">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">基本的な木の成長記録</span>
          </div>
        </div>
      </div>

      {subscriptionStatus.currentPeriodEnd && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">お知らせ：</span>
            {formatDate(subscriptionStatus.currentPeriodEnd)}まではプレミアム機能をご利用いただけます。
          </p>
        </div>
      )}

      <div className="flex space-x-3">
        <Button
          onClick={() => setCurrentStep('reason')}
          variant="secondary"
          className="flex-1"
        >
          戻る
        </Button>
        <WarningButton
          onClick={handleFinalCancel}
          disabled={loading}
          loading={loading}
          className="flex-1"
        >
          解約を確定する
        </WarningButton>
      </div>
    </motion.div>
  );

  const renderCompleteStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        解約が完了しました
      </h1>
      
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        プレミアムプランを解約いたしました。<br />
        現在の課金期間終了まではプレミアム機能をお使いいただけます。
      </p>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          今後について
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          いつでもプレミアムプランに再加入していただけます。<br />
          ほめびよりをご利用いただき、ありがとうございました。
        </p>
      </div>

      <Button
        onClick={() => {
          onSuccess?.();
          onBack();
        }}
        className="w-full"
      >
        完了
      </Button>
    </motion.div>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 'reason': return 'プレミアムプラン解約';
      case 'confirmation': return '解約確認';
      case 'complete': return '解約完了';
      default: return 'プレミアムプラン解約';
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'reason': return renderReasonStep();
      case 'confirmation': return renderConfirmationStep();
      case 'complete': return renderCompleteStep();
      default: return renderReasonStep();
    }
  };

  if (loading && currentStep !== 'confirmation') {
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
          {currentStep !== 'complete' && (
            <TouchTarget
              onClick={currentStep === 'reason' ? onBack : () => setCurrentStep('reason')}
              className="mr-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="戻る"
            >
              <ArrowLeft className="w-5 h-5" />
            </TouchTarget>
          )}
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getStepTitle()}
          </h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            <button 
              onClick={clearError}
              className="mt-2 text-xs text-red-600 dark:text-red-400 underline"
            >
              エラーを閉じる
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {renderCurrentStep()}
        </AnimatePresence>
      </div>
    </div>
  );
}