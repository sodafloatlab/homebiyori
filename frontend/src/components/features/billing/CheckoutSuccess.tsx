/**
 * Checkout Success Component - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - Stripe決済成功後の処理
 * - アップグレード完了メッセージ
 * - 次のステップ案内
 * - ダッシュボードへの誘導
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCheckout } from '@/lib/hooks';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { CheckoutSuccessResponse } from '@/lib/services/BillingService';

export function CheckoutSuccess() {
  const [successData, setSuccessData] = useState<CheckoutSuccessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { handleCheckoutSuccess } = useCheckout();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const processCheckoutSuccess = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setError('セッションIDが見つかりません');
        setIsLoading(false);
        return;
      }

      try {
        const result = await handleCheckoutSuccess(sessionId);
        setSuccessData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'アップグレード処理に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    processCheckoutSuccess();
  }, [searchParams, handleCheckoutSuccess]);

  const handleContinue = () => {
    if (successData?.next_steps.dashboard_url) {
      router.push(successData.next_steps.dashboard_url);
    } else {
      router.push('/dashboard');
    }
  };

  const handleManageBilling = () => {
    if (successData?.next_steps.billing_portal_url) {
      router.push(successData.next_steps.billing_portal_url);
    } else {
      router.push('/billing');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">アップグレード処理中...</p>
          <p className="text-sm text-gray-500 mt-2">数秒お待ちください</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <Card className="max-w-md mx-auto p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">処理に失敗しました</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Button onClick={() => router.push('/billing')} variant="primary" className="w-full">
              課金管理ページへ
            </Button>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              ホームに戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!successData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 成功メッセージ */}
        <Card className="p-8 text-center mb-8">
          <div className="text-green-500 text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            アップグレード完了！
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            {successData.message}
          </p>
          
          {/* プラン情報 */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">プラン詳細</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">プラン:</span>
                <span className="font-medium capitalize">{successData.subscription.plan}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ステータス:</span>
                <span className="font-medium text-green-600 capitalize">{successData.subscription.status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">次回更新日:</span>
                <span className="font-medium">
                  {new Date(successData.subscription.current_period_end).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          </div>

          {/* 解放された機能 */}
          <div className="text-left mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 text-center">ご利用いただける機能</h3>
            <ul className="space-y-2">
              {successData.subscription.features_unlocked.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <span className="text-green-500 mr-3">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* 次のステップ */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">次のステップ</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="bg-purple-100 rounded-full p-2">
                <span className="text-purple-600 font-semibold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">AIチャットを始める</h3>
                <p className="text-sm text-gray-600">プレミアム機能を使って、より豊富なAI体験をお楽しみください</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 rounded-full p-2">
                <span className="text-blue-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">設定をカスタマイズ</h3>
                <p className="text-sm text-gray-600">あなたに最適なAI設定を調整できます</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-green-100 rounded-full p-2">
                <span className="text-green-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">課金管理</h3>
                <p className="text-sm text-gray-600">いつでも課金設定の確認・変更が可能です</p>
              </div>
            </div>
          </div>
        </Card>

        {/* アクションボタン */}
        <div className="mt-8 space-y-4">
          <Button 
            onClick={handleContinue}
            variant="primary"
            className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
          >
            ダッシュボードで始める
          </Button>
          
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={handleManageBilling}
              variant="outline"
              className="text-gray-600"
            >
              課金管理
            </Button>
            <Button 
              onClick={() => router.push('/')}
              variant="outline"
              className="text-gray-600"
            >
              ホーム
            </Button>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            ご不明な点がございましたら、いつでもサポートチームにお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}