/**
 * Access Guard Component - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - ページ単位のアクセス制御
 * - トライアル期間チェック
 * - 期限切れユーザーの課金誘導
 * - 自動リダイレクト処理
 */

'use client';

import React, { ReactNode } from 'react';
import { usePageGuard } from '@/lib/hooks';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { UpgradePrompt } from './UpgradePrompt';

interface AccessGuardProps {
  children: ReactNode;
  requiresPremium?: boolean;
  allowDuringTrial?: boolean;
  redirectTo?: string;
  showUpgradePrompt?: boolean;
  fallback?: ReactNode;
}

export function AccessGuard({
  children,
  requiresPremium = false,
  allowDuringTrial = true,
  redirectTo = '/billing/subscribe',
  showUpgradePrompt = true,
  fallback
}: AccessGuardProps) {
  const { isLoading, canAccess, subscription, accessControl } = usePageGuard({
    requiresPremium,
    allowDuringTrial,
    redirectTo
  });

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">アクセス権限を確認中...</p>
        </div>
      </div>
    );
  }

  // アクセス拒否 - カスタムフォールバックまたはアップグレードプロンプト表示
  if (!canAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgradePrompt && accessControl?.restriction_reason === 'trial_expired') {
      return <UpgradePrompt />;
    }

    // その他のアクセス拒否の場合は空を返す（リダイレクト処理済み）
    return null;
  }

  // アクセス許可 - 子コンポーネントを表示
  return <>{children}</>;
}

// =====================================
// 特定用途向けのプリセットガード
// =====================================

interface PremiumGuardProps {
  children: ReactNode;
  allowDuringTrial?: boolean;
  fallback?: ReactNode;
}

export function PremiumGuard({ children, allowDuringTrial = true, fallback }: PremiumGuardProps) {
  return (
    <AccessGuard
      requiresPremium={true}
      allowDuringTrial={allowDuringTrial}
      fallback={fallback}
    >
      {children}
    </AccessGuard>
  );
}

interface TrialGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function TrialGuard({ children, fallback }: TrialGuardProps) {
  return (
    <AccessGuard
      requiresPremium={false}
      allowDuringTrial={true}
      fallback={fallback}
    >
      {children}
    </AccessGuard>
  );
}