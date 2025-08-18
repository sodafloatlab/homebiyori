/**
 * Subscribe Page - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - プラン選択・課金誘導ページ
 * - トライアル期間終了ユーザー向け
 * - 魅力的なプラン表示
 */

'use client';

import React from 'react';
import { UpgradePrompt } from '@/components/features/billing/UpgradePrompt';

export default function SubscribePage() {
  return <UpgradePrompt />;
}