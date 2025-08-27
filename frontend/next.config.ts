import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 戦略的混在構成設定
  // SSG + CSR ハイブリッド構成
  
  // レスポンシブ対応パフォーマンス最適化
  compress: true,
  poweredByHeader: false,
  
  // 画像最適化設定（SSG対応）
  images: {
    // レスポンシブ対応
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // 次世代フォーマット対応
    formats: ['image/webp', 'image/avif'],
    
    // 画質設定はローダーで個別設定
    // quality: 85, // コメントアウト（非対応）
    
    // 外部ドメイン許可（必要に応じて追加）
    remotePatterns: [
      // {
      //   protocol: 'https',
      //   hostname: 'images.unsplash.com',
      //   port: '',
      //   pathname: '/**',
      // },
    ],
  },
  
  // 実験的機能設定
  experimental: {
    // パフォーマンス最適化
    optimizeCss: true,
    
    // メタデータ最適化
    optimizeServerReact: true,
  },
  
  // SWCミニファイがデフォルトで有効なNext.js 15
  // swcMinify: true, // Next.js 15では非推奨
  
  // 静的アセット最適化
  assetPrefix: '',
  
  // セキュリティヘッダー設定
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
