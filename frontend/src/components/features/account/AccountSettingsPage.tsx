'use client';

import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { ConfirmationDialog } from '../../ui/ConfirmationDialog';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { TouchTarget } from '../../ui/TouchTarget';

interface UserProfile {
  userId: string;
  nickname: string | null;
  aiCharacter: 'mittyan' | 'madokasan' | 'hideji';
  praiseLevel: 'normal' | 'deep';
  interactionMode: 'praise' | 'listen';
  createdAt: string;
}

interface SubscriptionStatus {
  status: 'active' | 'inactive' | 'cancelled';
  currentPlan: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface AccountSettingsPageProps {
  userProfile: UserProfile;
  subscriptionStatus: SubscriptionStatus;
  onProfileUpdate: (profile: Partial<UserProfile>) => Promise<void>;
  onAccountDeletion: () => void;
  onSubscriptionCancel: () => void;
  onBack: () => void;
  loading?: boolean;
}

export function AccountSettingsPage({
  userProfile,
  subscriptionStatus,
  onProfileUpdate,
  onAccountDeletion,
  onSubscriptionCancel,
  onBack,
  loading = false
}: AccountSettingsPageProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    nickname: userProfile.nickname || '',
    aiCharacter: userProfile.aiCharacter,
    praiseLevel: userProfile.praiseLevel,
    interactionMode: userProfile.interactionMode
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPremiumUpgrade, setShowPremiumUpgrade] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onProfileUpdate({
        nickname: editedProfile.nickname || null,
        aiCharacter: editedProfile.aiCharacter,
        praiseLevel: editedProfile.praiseLevel,
        interactionMode: editedProfile.interactionMode
      });
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile({
      nickname: userProfile.nickname || '',
      aiCharacter: userProfile.aiCharacter,
      praiseLevel: userProfile.praiseLevel,
      interactionMode: userProfile.interactionMode
    });
    setEditMode(false);
  };

  // 無料ユーザーのdeepモード制限処理
  const handlePraiseLevelChange = (newLevel: 'normal' | 'deep') => {
    if (newLevel === 'deep' && !isPaidUser) {
      setShowPremiumUpgrade(true);
      return;
    }
    setEditedProfile(prev => ({ ...prev, praiseLevel: newLevel }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCharacterName = (character: string) => {
    const names = {
      mittyan: 'たまさん',
      madokasan: 'まどか姉さん',
      hideji: 'ヒデじい'
    };
    return names[character as keyof typeof names] || character;
  };

  const getPraiseLevelName = (level: string) => {
    const levels = {
      normal: 'ノーマル',
      deep: 'ディープ'
    };
    return levels[level as keyof typeof levels] || level;
  };

  const getInteractionModeName = (mode: string) => {
    const modes = {
      praise: '褒めて欲しい気分',
      listen: '話を聞いて欲しい気分'
    };
    return modes[mode as keyof typeof modes] || mode;
  };

  // サブスクリプション状態の判定
  const isPaidUser = subscriptionStatus.status === 'active';
  const isSubscriptionCancelled = subscriptionStatus.cancelAtPeriodEnd;
  const hasActiveSubscription = isPaidUser && !isSubscriptionCancelled;
  
  // 解約予定日が未来かどうかの判定
  const hasFutureCancellation = subscriptionStatus.currentPeriodEnd && 
    new Date(subscriptionStatus.currentPeriodEnd) > new Date();

  // アカウント削除可能かの判定
  const canDeleteAccount = !hasActiveSubscription; // アクティブサブスクリプションがない場合のみ

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
            アカウント設定
          </h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* プロフィール情報 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
              👤 プロフィール情報
            </h2>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ニックネーム
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={editedProfile.nickname}
                  onChange={(e) => setEditedProfile(prev => ({ ...prev, nickname: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="ニックネームを入力"
                  maxLength={20}
                />
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {userProfile.nickname || '未設定'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AIキャラクター
              </label>
              {editMode ? (
                <select
                  value={editedProfile.aiCharacter}
                  onChange={(e) => setEditedProfile(prev => ({ 
                    ...prev, 
                    aiCharacter: e.target.value as 'mittyan' | 'madokasan' | 'hideji'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="mittyan">たまさん</option>
                  <option value="madokasan">まどか姉さん</option>
                  <option value="hideji">ヒデじい</option>
                </select>
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {getCharacterName(userProfile.aiCharacter)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                褒めレベル
                {!isPaidUser && (
                  <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                    ディープはプレミアム限定
                  </span>
                )}
              </label>
              {editMode ? (
                <select
                  value={editedProfile.praiseLevel}
                  onChange={(e) => handlePraiseLevelChange(e.target.value as 'normal' | 'deep')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="normal">ノーマル</option>
                  <option value="deep">ディープ {!isPaidUser && '（プレミアム限定）'}</option>
                </select>
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {getPraiseLevelName(userProfile.praiseLevel)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                今日の気分
              </label>
              {editMode ? (
                <select
                  value={editedProfile.interactionMode}
                  onChange={(e) => setEditedProfile(prev => ({ 
                    ...prev, 
                    interactionMode: e.target.value as 'praise' | 'listen'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="praise">褒めて欲しい気分</option>
                  <option value="listen">話を聞いて欲しい気分</option>
                </select>
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {getInteractionModeName(userProfile.interactionMode)}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {editMode ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    loading={saving}
                    className="flex-1"
                  >
                    更新
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="secondary"
                    disabled={saving}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setEditMode(true)}
                  className="w-full"
                >
                  編集
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* サブスクリプション */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
              💳 サブスクリプション
            </h2>
          </div>
          
          <div className="p-4 space-y-3">
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300">現在のプラン：</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {subscriptionStatus.currentPlan || '無料プラン'}
              </span>
            </div>
            
            {subscriptionStatus.currentPeriodEnd && (
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">次回更新：</span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {formatDate(subscriptionStatus.currentPeriodEnd)}
                </span>
              </div>
            )}
            
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300">状況：</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                subscriptionStatus.status === 'active' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                {subscriptionStatus.status === 'active' ? 'アクティブ' : '無効'}
              </span>
            </div>
            
            <div className="space-y-2 pt-2">
              {!hasActiveSubscription ? (
                <Button 
                  variant="primary" 
                  className="w-full"
                  onClick={() => window.location.href = '/premium'}
                >
                  プレミアムプランに登録
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1">
                    プラン変更
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    解約
                  </Button>
                </div>
              )}
            </div>

            {isSubscriptionCancelled && hasFutureCancellation && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <span className="font-medium">解約予定：</span>
                  {formatDate(subscriptionStatus.currentPeriodEnd!)}まで利用可能
                </p>
              </div>
            )}
          </div>
        </section>

        {/* アカウント管理 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
              ⚙️ アカウント管理
            </h2>
          </div>
          
          <div className="p-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">アカウント作成：</span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {formatDate(userProfile.createdAt)}
                </span>
              </div>
              
              {/* アカウント削除可能性の説明 */}
              {!canDeleteAccount && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-medium">お知らせ：</span>
                    アカウント削除をご希望の場合は、まずサブスクリプションの解約を完了してください。
                  </p>
                </div>
              )}

              {/* 解約予定がある場合の警告 */}
              {canDeleteAccount && isSubscriptionCancelled && hasFutureCancellation && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="font-medium">ご注意：</span>
                    {formatDate(subscriptionStatus.currentPeriodEnd!)}までプレミアム機能をご利用いただけますが、
                    アカウントを削除すると全データが失われ、復旧できません。
                  </p>
                </div>
              )}
              
              <div className="pt-2">
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!canDeleteAccount}
                  variant="secondary"
                  className={`w-full ${canDeleteAccount 
                    ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/10'
                    : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  アカウントを削除
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* サブスクリプション解約確認ダイアログ */}
      <ConfirmationDialog
        isOpen={showCancelConfirm}
        title="サブスクリプション解約"
        message={`サブスクリプションを解約してもよろしいですか？${
          hasFutureCancellation 
            ? `

${formatDate(subscriptionStatus.currentPeriodEnd!)}まではプレミアム機能をご利用いただけます。`
            : ''
        }`}
        confirmText="解約する"
        cancelText="キャンセル"
        onConfirm={() => {
          setShowCancelConfirm(false);
          onSubscriptionCancel();
        }}
        onCancel={() => setShowCancelConfirm(false)}
        variant="warning"
      />

      {/* アカウント削除確認ダイアログ */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="アカウント削除"
        message={`アカウントを削除してもよろしいですか？削除されたデータは復元できません。${
          isSubscriptionCancelled && hasFutureCancellation
            ? `

注意：${formatDate(subscriptionStatus.currentPeriodEnd!)}までのプレミアム利用権も失われます。`
            : ''
        }`}
        confirmText="削除手続きに進む"
        cancelText="キャンセル"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onAccountDeletion();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="warning"
      />

      {/* プレミアム誘導ダイアログ */}
      <ConfirmationDialog
        isOpen={showPremiumUpgrade}
        title="プレミアムプランでさらに深い褒めを"
        message={`ディープな褒めレベルはプレミアム会員限定機能です。

プレミアムプランなら：
✨ より深く、心に響く褒め言葉
🌟 長文での丁寧な応援メッセージ
💫 あなただけに向けた特別な励まし

プレミアムプランにアップグレードして、もっと深い癒やしを体験しませんか？`}
        confirmText="プレミアムに登録"
        cancelText="無料版を続ける"
        onConfirm={() => {
          setShowPremiumUpgrade(false);
          // プレミアムプラン画面への遷移処理を追加
          window.location.href = '/premium';
        }}
        onCancel={() => setShowPremiumUpgrade(false)}
        variant="info"
      />
    </div>
  );
}