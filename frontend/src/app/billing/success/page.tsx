/**
 * Billing Success Page - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - Stripe決済成功後のランディングページ
 * - アップグレード完了処理
 * - 次のステップ案内
 */

'use client';

import React from 'react';
import { CheckoutSuccess } from '@/components/features/billing/CheckoutSuccess';

export default function BillingSuccessPage() {
  return <CheckoutSuccess />;
}