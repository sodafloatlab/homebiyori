/**
 * Robots.txt Generator - SEO最適化
 * 
 * ■機能概要■
 * - 動的robots.txt生成
 * - クローラー制御
 * - プライバシー保護
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://homebiyori.com';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/faq',
          '/legal/terms',
          '/legal/privacy', 
          '/legal/commercial',
          '/contact',
        ],
        disallow: [
          // 認証関連ページ
          '/auth/',
          '/dashboard/',
          '/billing/',
          
          // プライベートページ  
          '/settings/',
          '/profile/',
          
          // APIエンドポイント
          '/api/',
          
          // Next.js内部ファイル
          '/_next/',
          '/_vercel/',
          
          // 開発用ファイル
          '/*.json',
          '/*.xml',
        ],
        crawlDelay: 1, // 1秒間隔でクロール
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        crawlDelay: 0, // Googleは制限なし
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        crawlDelay: 1,
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}