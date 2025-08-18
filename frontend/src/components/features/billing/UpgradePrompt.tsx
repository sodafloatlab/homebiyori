/**
 * Upgrade Prompt Component - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - トライアル期間終了ユーザー向けアップグレード促進
 * - プラン選択・価格表示
 * - Stripe Checkout連携
 * - 魅力的なUI/UX
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { billingService, type SubscriptionGuidance } from '@/lib/services/BillingService';
import { useCheckout } from '@/lib/hooks';
import { accountSettingsService } from '@/lib/services/AccountSettingsService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

export function UpgradePrompt() {
  const [guidance, setGuidance] = useState<SubscriptionGuidance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { createCheckoutSession, isLoading: checkoutLoading } = useCheckout();
  const router = useRouter();

  useEffect(() => {
    const fetchGuidance = async () => {
      try {
        setIsLoading(true);
        const guidanceData = await billingService.getSubscriptionGuidance();
        setGuidance(guidanceData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '課金誘導情報の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGuidance();
  }, []);

  const handlePlanSelect = async (planId: 'monthly' | 'yearly') => {
    await createCheckoutSession(planId);
  };

  const handleSkip = () => {
    router.push('/');
  };

  const handleAccountDeletion = async () => {
    try {
      setIsDeleting(true);
      
      // アカウント削除をリクエスト
      const deletionResponse = await accountSettingsService.requestAccountDeletion({
        deletion_type: 'account_delete',
        reason: 'プレミアムプラン未購入のため',
        feedback: null
      });
      
      // 削除を確認・実行
      await accountSettingsService.confirmAccountDeletion({
        deletion_request_id: deletionResponse.deletion_request_id,
        final_consent: true
      });
      
      // 削除完了後はサインアウトしてトップページへ
      router.push('/auth/signin?message=account_deleted');
    } catch (err) {
      setError('アカウント削除に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">プラン情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <Card className="max-w-md mx-auto p-8 text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">エラーが発生しました</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/')} variant="outline" className="w-full">
            ホームに戻る
          </Button>
        </Card>
      </div>
    );
  }

  if (!guidance) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-6">🌸</div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {guidance.guidance_message.title}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {guidance.guidance_message.description}
          </p>
        </div>

        {/* トライアル期間情報 */}
        {guidance.trial_info.has_expired && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-center text-amber-800">
              <span className="text-2xl mr-3">⏰</span>
              <div className="text-center">
                <p className="font-semibold">トライアル期間が終了しました</p>
                <p className="text-sm mt-1">
                  継続してご利用いただくには、プレミアムプランへのアップグレードが必要です
                </p>
              </div>
            </div>
          </div>
        )}

        {/* プラン選択 */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {guidance.plan_options.map((plan) => (
            <Card 
              key={plan.plan_id} 
              className={`relative p-8 ${plan.is_promotion ? 'ring-2 ring-purple-500' : ''}`}
            >
              {plan.is_promotion && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    おすすめ
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                
                {/* 価格表示 */}
                <div className="mb-6">
                  {plan.special_price ? (
                    <div>
                      <div className="text-3xl font-bold text-purple-600">
                        ¥{plan.special_price.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 line-through">
                        ¥{plan.price.toLocaleString()}
                      </div>
                      <div className="text-sm text-purple-600 font-semibold mt-1">
                        {plan.promotion_description}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl font-bold text-gray-900">
                        ¥{plan.price.toLocaleString()}
                      </div>
                      {plan.monthly_equivalent && (
                        <div className="text-sm text-gray-500">
                          月割り ¥{plan.monthly_equivalent.toLocaleString()}
                        </div>
                      )}
                      {plan.savings_description && (
                        <div className="text-sm text-green-600 font-semibold mt-1">
                          {plan.savings_description}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-gray-500 mt-1">
                    {plan.billing_cycle === 'monthly' ? '/ 月' : '/ 年'}
                  </div>
                </div>

                {/* 機能一覧 */}
                <ul className="text-left mb-8 space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* 選択ボタン */}
                <Button
                  onClick={() => handlePlanSelect(plan.plan_id)}
                  disabled={checkoutLoading}
                  variant="primary"
                  className={`w-full ${
                    plan.is_promotion 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-gray-800 hover:bg-gray-900'
                  }`}
                >
                  {checkoutLoading ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : null}
                  {plan.plan_id === 'monthly' ? '初回300円で始める' : 'お得な年額プランを選択'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* 特典一覧 */}
        <div className="bg-white rounded-lg p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            プレミアムプランで得られること
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {guidance.guidance_message.benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl mb-3">
                  {index === 0 ? '💬' : index === 1 ? '🤖' : index === 2 ? '🌳' : '💾'}
                </div>
                <p className="text-sm text-gray-600">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* フッター */}
        <div className="text-center space-y-4">
          <Button
            onClick={handleSkip}
            variant="outline"
            className="text-gray-500 hover:text-gray-700"
          >
            後で検討する
          </Button>
          
          {/* アカウント削除ボタン */}
          <div className="pt-6 border-t border-gray-200">
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              アカウントを削除する
            </Button>
          </div>
          
          <p className="text-xs text-gray-400">
            いつでもキャンセル可能です。自動更新設定は購入後に変更できます。
          </p>
        </div>
        
        {/* アカウント削除確認ダイアログ */}
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleAccountDeletion}
          title="アカウントを削除しますか？"
          message="この操作は元に戻せません。アカウントに関連するすべてのデータが完全に削除されます。"
          confirmText="削除する"
          cancelText="キャンセル"
          variant="danger"
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
}