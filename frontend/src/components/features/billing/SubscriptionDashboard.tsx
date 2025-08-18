/**
 * Subscription Dashboard Component - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - サブスクリプション状態表示
 * - トライアル期間残り表示
 * - 課金履歴表示
 * - アップグレード・キャンセル操作
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  billingService, 
  type DetailedSubscriptionStatus,
  type PaymentHistory 
} from '@/lib/services/BillingService';
import { useDetailedSubscriptionStatus, useCheckout } from '@/lib/hooks';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function SubscriptionDashboard() {
  const { status, isLoading, error, refreshStatus } = useDetailedSubscriptionStatus();
  const { createCheckoutSession } = useCheckout();
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status?.plan_details.is_premium) {
      fetchPaymentHistory();
    }
  }, [status]);

  const fetchPaymentHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const history = await billingService.getPaymentHistory(5);
      setPaymentHistory(history);
    } catch (err) {
      console.error('支払い履歴取得エラー:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    await createCheckoutSession(plan);
  };

  const handleManageBilling = async () => {
    try {
      const { portal_url } = await billingService.createBillingPortalSession({
        return_url: window.location.href
      });
      window.open(portal_url, '_blank');
    } catch (err) {
      console.error('課金ポータル開設エラー:', err);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await billingService.cancelSubscription({
        cancel_at_period_end: true,
        cancellation_reason: 'User initiated cancellation'
      });
      await refreshStatus();
      setShowCancelDialog(false);
    } catch (err) {
      console.error('サブスクリプションキャンセルエラー:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">サブスクリプション情報を読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">エラーが発生しました</h2>
          <p className="text-gray-600 mb-6">{error || 'サブスクリプション情報の取得に失敗しました'}</p>
          <Button onClick={refreshStatus} variant="outline">
            再試行
          </Button>
        </Card>
      </div>
    );
  }

  const { subscription, trial_status, plan_details, billing_info, recommendations } = status;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">サブスクリプション管理</h1>
        <p className="text-gray-600">あなたのプラン状況と課金情報</p>
      </div>

      {/* 現在のプラン状況 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">現在のプラン</h2>
            <p className="text-gray-600">プラン詳細と期間情報</p>
          </div>
          <Badge 
            variant={plan_details.is_premium ? 'success' : plan_details.is_trial ? 'warning' : 'default'}
          >
            {plan_details.plan_name}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* プラン情報 */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">プラン詳細</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">現在のプラン:</span>
                <span className="font-medium">{plan_details.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ステータス:</span>
                <span className="font-medium capitalize">{subscription?.status}</span>
              </div>
              {subscription?.current_period_end && (
                <div className="flex justify-between">
                  <span className="text-gray-600">期限:</span>
                  <span className="font-medium">
                    {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* トライアル情報 */}
          {plan_details.is_trial && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">トライアル期間</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">残り日数:</span>
                  <span className={`font-medium ${trial_status.days_remaining <= 3 ? 'text-red-600' : 'text-green-600'}`}>
                    {trial_status.days_remaining}日
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">終了予定:</span>
                  <span className="font-medium">
                    {trial_status.trial_end_date 
                      ? new Date(trial_status.trial_end_date).toLocaleDateString('ja-JP')
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* アクション */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap gap-4">
            {plan_details.is_trial && (
              <>
                <Button 
                  onClick={() => handleUpgrade('monthly')}
                  variant="primary"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  月額プランにアップグレード
                </Button>
                <Button 
                  onClick={() => handleUpgrade('yearly')}
                  variant="outline"
                >
                  年額プランにアップグレード
                </Button>
              </>
            )}
            
            {plan_details.is_premium && (
              <>
                <Button onClick={handleManageBilling} variant="outline">
                  課金ポータルを開く
                </Button>
                {!subscription?.cancel_at_period_end && (
                  <Button 
                    onClick={() => setShowCancelDialog(true)}
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    プランをキャンセル
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      {/* 推奨アクション */}
      {recommendations.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">おすすめのアクション</h2>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${
                  rec.type === 'upgrade_required' ? 'bg-red-50 border-red-200' :
                  rec.type === 'trial_ending' ? 'bg-amber-50 border-amber-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{rec.title}</h3>
                <p className="text-gray-600 mb-3">{rec.description}</p>
                <Button 
                  onClick={() => router.push(rec.action_url)}
                  size="sm"
                  variant={rec.type === 'upgrade_required' ? 'primary' : 'outline'}
                >
                  今すぐ対応
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 支払い履歴 */}
      {plan_details.is_premium && billing_info && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">支払い履歴</h2>
            <Button onClick={fetchPaymentHistory} variant="outline" size="sm">
              更新
            </Button>
          </div>

          {billing_info.next_billing_date && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">次回請求日:</span> {' '}
                {new Date(billing_info.next_billing_date).toLocaleDateString('ja-JP')}
              </p>
            </div>
          )}

          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : paymentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2">日付</th>
                    <th className="text-left py-3 px-2">金額</th>
                    <th className="text-left py-3 px-2">ステータス</th>
                    <th className="text-left py-3 px-2">期間</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment) => (
                    <tr key={payment.payment_id} className="border-b border-gray-100">
                      <td className="py-3 px-2">
                        {new Date(payment.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="py-3 px-2 font-medium">
                        ¥{payment.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-2">
                        <Badge 
                          variant={payment.status === 'succeeded' ? 'success' : 'error'}
                        >
                          {payment.status === 'succeeded' ? '成功' : '失敗'}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {new Date(payment.billing_period_start).toLocaleDateString('ja-JP')} - {' '}
                        {new Date(payment.billing_period_end).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">支払い履歴がありません</p>
          )}
        </Card>
      )}

      {/* キャンセル確認ダイアログ */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              サブスクリプションをキャンセルしますか？
            </h3>
            <p className="text-gray-600 mb-6">
              期間終了時（{subscription?.current_period_end 
                ? new Date(subscription.current_period_end).toLocaleDateString('ja-JP')
                : ''
              }）にサブスクリプションが終了します。それまでは引き続きご利用いただけます。
            </p>
            <div className="flex gap-4">
              <Button 
                onClick={handleCancelSubscription}
                variant="danger"
                className="flex-1"
              >
                キャンセルする
              </Button>
              <Button 
                onClick={() => setShowCancelDialog(false)}
                variant="primary"
                className="flex-1"
              >
                継続する
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}