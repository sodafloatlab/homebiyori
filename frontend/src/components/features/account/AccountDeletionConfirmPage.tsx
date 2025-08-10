'use client';

import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { WarningButton } from '../../ui/WarningButton';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { TouchTarget } from '../../ui/TouchTarget';
import { ProgressBar } from '../../ui/ProgressBar';

interface AccountStatus {
  account: {
    userId: string;
    nickname: string | null;
    aiCharacter: 'tama' | 'madoka' | 'hide';
    createdAt: string;
    usagePeriod: string;
  };
  subscription: {
    status: 'active' | 'inactive' | 'cancelled';
    currentPlan: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    monthlyAmount: number | null;
  } | null;
  data_summary: {
    chatCount: number;
    fruitCount: number;
    treeLevel: number;
    dataSizeMB: number;
  };
}

interface DeletionRequest {
  deletion_type: 'account_only'; // 仕様変更：アカウントのみ削除
  reason: string | null;
  feedback: string | null;
}

interface AccountDeletionConfirmPageProps {
  accountStatus: AccountStatus;
  currentStep: 1 | 2 | 3;
  deletionRequest: DeletionRequest | null;
  onBack: () => void;
  onNext: (data?: Partial<DeletionRequest>) => void;
  onConfirm: (deletionRequest: DeletionRequest) => void;
  loading?: boolean;
}

export function AccountDeletionConfirmPage({
  accountStatus,
  currentStep,
  deletionRequest,
  onBack,
  onNext,
  onConfirm,
  loading = false
}: AccountDeletionConfirmPageProps) {
  const [reason, setReason] = useState(deletionRequest?.reason || '');
  const [feedback, setFeedback] = useState(deletionRequest?.feedback || '');
  const [confirmationText, setConfirmationText] = useState('');
  const [finalConsent, setFinalConsent] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCharacterName = (character: string) => {
    const names = {
      tama: 'たまさん',
      madoka: 'まどか姉さん',
      hide: 'ヒデじい'
    };
    return names[character as keyof typeof names] || character;
  };

  const reasonOptions = [
    'サービスが不要になった',
    'プライバシーが心配',
    '使い方がわからない',
    '他のサービスを使用',
    '一時的な休止',
    'その他'
  ];

  const handleStep2Next = () => {
    onNext({
      deletion_type: 'account_only',
      reason: reason || null,
      feedback: feedback || null
    });
  };

  const handleFinalConfirm = () => {
    if (confirmationText === '削除' && finalConsent) {
      onConfirm({
        deletion_type: 'account_only',
        reason: reason || null,
        feedback: feedback || null
      });
    }
  };

  const isStep3Valid = confirmationText === '削除' && finalConsent;

  // 解約予定がある場合のプレミアム期間確認
  const hasFutureCancellation = accountStatus.subscription?.currentPeriodEnd && 
    new Date(accountStatus.subscription.currentPeriodEnd) > new Date();

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
            アカウント削除の確認
          </h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        {/* Progress Bar */}
        <div className="mb-6">
          <ProgressBar
            progress={(currentStep / 3) * 100}
            animated
            color="red"
            label={`ステップ ${currentStep}/3`}
            showPercentage={false}
            className="mb-2"
          />
        </div>

        {/* Step 1: 現状確認 */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
              現在の状況確認
            </h2>

            {/* アカウント情報 */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                  📊 アカウント情報
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">作成日:</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatDate(accountStatus.account.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">ニックネーム:</span>
                  <span className="text-gray-900 dark:text-white">
                    {accountStatus.account.nickname || '未設定'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">AIキャラクター:</span>
                  <span className="text-gray-900 dark:text-white">
                    {getCharacterName(accountStatus.account.aiCharacter)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">利用期間:</span>
                  <span className="text-gray-900 dark:text-white">
                    {accountStatus.account.usagePeriod}
                  </span>
                </div>
              </div>
            </section>

            {/* データ概要 */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                  📈 保存されているデータ
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">チャット数:</span>
                  <span className="text-gray-900 dark:text-white">
                    {accountStatus.data_summary.chatCount}件
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">ほめの実:</span>
                  <span className="text-gray-900 dark:text-white">
                    {accountStatus.data_summary.fruitCount}個
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">木の成長:</span>
                  <span className="text-gray-900 dark:text-white">
                    レベル{accountStatus.data_summary.treeLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">データサイズ:</span>
                  <span className="text-gray-900 dark:text-white">
                    約{accountStatus.data_summary.dataSizeMB}MB
                  </span>
                </div>
              </div>
            </section>

            {/* プレミアム期間の注意 */}
            {hasFutureCancellation && (
              <section className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="p-4">
                  <h3 className="text-base font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center">
                    ⚠️ 重要なお知らせ
                  </h3>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    現在、{formatDate(accountStatus.subscription!.currentPeriodEnd!)}まで
                    プレミアム機能をご利用いただけますが、アカウントを削除すると
                    <span className="font-medium">この利用権も失われ、復旧できません。</span>
                  </p>
                </div>
              </section>
            )}

            {/* ナビゲーション */}
            <div className="flex gap-3 pt-4">
              <Button onClick={onBack} variant="secondary" className="flex-1">
                戻る
              </Button>
              <Button onClick={() => onNext()} className="flex-1">
                次へ
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 削除内容確認 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
              削除内容の確認
            </h2>

            {/* 削除されるデータ */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800">
              <div className="p-4 border-b border-red-200 dark:border-red-800">
                <h3 className="text-base font-semibold text-red-800 dark:text-red-200 flex items-center">
                  🗑️ 削除されるデータ
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-red-700 dark:text-red-300">
                    <span className="mr-2">✓</span>
                    チャット履歴（{accountStatus.data_summary.chatCount}件）
                  </div>
                  <div className="flex items-center text-red-700 dark:text-red-300">
                    <span className="mr-2">✓</span>
                    ほめの実データ（{accountStatus.data_summary.fruitCount}個）
                  </div>
                  <div className="flex items-center text-red-700 dark:text-red-300">
                    <span className="mr-2">✓</span>
                    木の成長記録（レベル{accountStatus.data_summary.treeLevel}）
                  </div>
                  <div className="flex items-center text-red-700 dark:text-red-300">
                    <span className="mr-2">✓</span>
                    ユーザープロフィール
                  </div>
                  <div className="flex items-center text-red-700 dark:text-red-300">
                    <span className="mr-2">✓</span>
                    AI設定情報
                  </div>
                </div>
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200 flex items-center">
                    <span className="mr-2">⚠️</span>
                    この操作は元に戻せません
                  </p>
                </div>
              </div>
            </section>

            {/* サブスクリプション継続の説明 */}
            {accountStatus.subscription && accountStatus.subscription.status === 'active' && (
              <section className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="p-4">
                  <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                    💳 サブスクリプションについて
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    アカウント削除後もサブスクリプションは継続されます。
                    必要に応じて別途解約手続きを行ってください。
                  </p>
                </div>
              </section>
            )}

            {/* 削除理由 */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                  📝 削除理由（任意）
                </h3>
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
              </div>
            </section>

            {/* ナビゲーション */}
            <div className="flex gap-3 pt-4">
              <Button onClick={onBack} variant="secondary" className="flex-1">
                戻る
              </Button>
              <Button onClick={handleStep2Next} className="flex-1">
                次へ
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 最終確認 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
              最終確認
            </h2>

            {/* フィードバック */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                  💬 フィードバック（任意）
                </h3>
              </div>
              <div className="p-4">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="サービス改善のご意見をお聞かせください..."
                  rows={4}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {feedback.length}/1000文字
                </p>
              </div>
            </section>

            {/* 確認テキスト入力 */}
            <section className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="p-4">
                <h3 className="text-base font-semibold text-red-800 dark:text-red-200 mb-4 flex items-center">
                  ✋ 確認のため「削除」と入力してください
                </h3>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="ここに「削除」と入力"
                  className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-red-900/10 dark:text-white"
                />
              </div>
            </section>

            {/* 最終同意 */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={finalConsent}
                    onChange={(e) => setFinalConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <span className="ml-3 text-sm text-gray-900 dark:text-white">
                    上記内容を理解し、データが復旧できないことに同意してアカウント削除を実行します
                  </span>
                </label>
              </div>
            </section>

            {/* ナビゲーション */}
            <div className="flex gap-3 pt-4">
              <Button onClick={onBack} variant="secondary" className="flex-1">
                戻る
              </Button>
              <WarningButton
                onClick={handleFinalConfirm}
                disabled={!isStep3Valid}
                className="flex-1"
              >
                アカウント削除を実行
              </WarningButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}