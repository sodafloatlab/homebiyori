/**
 * Authenticated Layout Component - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - 認証済みユーザー向けレイアウト
 * - ナビゲーションバー付き
 * - アクセス制御統合
 */

'use client';

import React from 'react';
import { NavigationBar } from './NavigationBar';
import { AccessGuard } from '@/components/features/billing/AccessGuard';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  requiresPremium?: boolean;
  allowDuringTrial?: boolean;
  showUpgradePrompt?: boolean;
}

export function AuthenticatedLayout({ 
  children, 
  requiresPremium = false,
  allowDuringTrial = true,
  showUpgradePrompt = true
}: AuthenticatedLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />
      
      <main>
        <AccessGuard
          requiresPremium={requiresPremium}
          allowDuringTrial={allowDuringTrial}
          showUpgradePrompt={showUpgradePrompt}
        >
          {children}
        </AccessGuard>
      </main>
    </div>
  );
}