/**
 * Dashboard Page - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - メインダッシュボード
 * - アクセス制御適用（トライアル・プレミアム両対応）
 * - トライアル期間表示
 * - アップグレード案内
 */

'use client';

import React from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useBilling } from '@/lib/hooks';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';

function DashboardContent() {
  const { 
    isTrialActive, 
    daysRemaining, 
    subscription, 
    isTrialUser, 
    isPremiumUser,
    createCheckoutSession 
  } = useBilling();
  const router = useRouter();

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    await createCheckoutSession(plan);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
              <p className="text-gray-600 mt-1">ほめびよりへようこそ</p>
            </div>
            <div className="flex items-center space-x-4">
              {isTrialUser && (
                <Badge variant="warning" className="px-3 py-1">
                  トライアル期間
                </Badge>
              )}
              {isPremiumUser && (
                <Badge variant="success" className="px-3 py-1">
                  プレミアム
                </Badge>
              )}
              <Button 
                onClick={() => router.push('/billing')}
                variant="outline"
                size="sm"
              >
                課金管理
              </Button>
            </div>
          </div>
        </div>

        {/* トライアル期間通知 */}
        {isTrialUser && isTrialActive && (
          <Card className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">⏰</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    トライアル期間残り {daysRemaining} 日
                  </h3>
                  <p className="text-gray-600">
                    引き続きご利用いただくには、プレミアムプランへのアップグレードをお願いします
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button 
                  onClick={() => handleUpgrade('monthly')}
                  variant="primary"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  月額プラン
                </Button>
                <Button 
                  onClick={() => handleUpgrade('yearly')}
                  variant="outline"
                >
                  年額プラン
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* メインコンテンツエリア */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* AIチャット */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">AIチャット</h2>
              <Button variant="outline" size="sm">
                新しいチャット
              </Button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AIと会話を始めましょう
              </h3>
              <p className="text-gray-600 mb-6">
                3つの個性豊かなAIキャラクターがあなたの育児をサポートします
              </p>
              <Button variant="primary" className="bg-purple-600 hover:bg-purple-700">
                チャットを開始
              </Button>
            </div>
          </Card>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 成長の木 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">成長の木</h3>
              <div className="text-center">
                <div className="text-6xl mb-4">🌳</div>
                <p className="text-gray-600 mb-4">
                  あなたの育児努力が美しい木として成長していきます
                </p>
                <Button variant="outline" className="w-full">
                  詳細を見る
                </Button>
              </div>
            </Card>

            {/* 統計 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">統計</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">総会話数</span>
                  <span className="font-semibold">24回</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">今月の褒め</span>
                  <span className="font-semibold">18回</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">継続日数</span>
                  <span className="font-semibold">12日</span>
                </div>
              </div>
            </Card>

            {/* プラン情報 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">プラン情報</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">現在のプラン</span>
                  <Badge variant={isPremiumUser ? 'success' : 'warning'}>
                    {isPremiumUser ? 'プレミアム' : 'トライアル'}
                  </Badge>
                </div>
                {subscription?.current_period_end && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">期限</span>
                    <span className="text-sm font-medium">
                      {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                )}
                <Button 
                  onClick={() => router.push('/billing')}
                  variant="outline" 
                  className="w-full"
                >
                  プラン管理
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* 最近のアクティビティ */}
        <Card className="mt-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">最近のアクティビティ</h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl">🎉</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">AIから褒めてもらいました</p>
                <p className="text-sm text-gray-600">2時間前 - たまさんとの会話</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl">🌱</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">木が成長しました</p>
                <p className="text-sm text-gray-600">1日前 - ステージ2に進化</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl">💬</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">新しいチャットを開始</p>
                <p className="text-sm text-gray-600">3日前 - まどか姉さんとの会話</p>
              </div>
            </div>
          </div>
        </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthenticatedLayout
      requiresPremium={false} 
      allowDuringTrial={true}
      showUpgradePrompt={true}
    >
      <DashboardContent />
    </AuthenticatedLayout>
  );
}