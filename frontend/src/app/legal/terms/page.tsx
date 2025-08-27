/**
 * Terms of Service Page - SSG対応版
 * 
 * ■機能概要■
 * - 利用規約ページ（SSG最適化）
 * - 静的生成でSEO最適化
 * - メタデータ最適化
 */

import type { Metadata } from 'next';
import TermsOfServiceClient from '@/components/features/legal/TermsOfServiceClient';

// メタデータ設定（SSG対応）
export const metadata: Metadata = {
  title: '利用規約 - ほめびより',
  description: 'ほめびよりの利用規約。サービス利用にあたっての重要な条件や取り決め、禁止事項等を記載しています。',
  keywords: ['利用規約', 'サービス条件', '条件', 'ほめびより'],
  openGraph: {
    title: '利用規約 - ほめびより',
    description: 'ほめびよりの利用規約ページ。サービス利用にあたっての重要な情報をご確認いただけます。',
    type: 'article',
    locale: 'ja_JP',
  },
};

export default function TermsOfServicePage() {
  return <TermsOfServiceClient />;
}