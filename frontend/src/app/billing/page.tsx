/**
 * Billing Page - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - サブスクリプション管理ダッシュボード
 * - アクセス制御適用
 * - トライアル・プレミアム両対応
 */

'use client';

import React from 'react';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { SubscriptionDashboard } from '@/components/features/billing/SubscriptionDashboard';

export default function BillingPage() {
  return (
    <AuthenticatedLayout
      requiresPremium={false} 
      allowDuringTrial={true}
      showUpgradePrompt={false}
    >
      <SubscriptionDashboard />
    </AuthenticatedLayout>
  );
}