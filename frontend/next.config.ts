import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静的エクスポート設定（S3 + CloudFront対応）
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  
  // 環境変数の明示的な設定
  env: {
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_USER_POOL_WEB_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_WEB_CLIENT_ID,
    NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    NEXT_PUBLIC_COGNITO_REGION: process.env.NEXT_PUBLIC_COGNITO_REGION,
    NEXT_PUBLIC_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
    NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
    NEXT_PUBLIC_OAUTH_DOMAIN: process.env.NEXT_PUBLIC_OAUTH_DOMAIN,
    NEXT_PUBLIC_OAUTH_REDIRECT_SIGNIN: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGNIN,
    NEXT_PUBLIC_OAUTH_REDIRECT_SIGNOUT: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_SIGNOUT,
  },
  
  // レスポンシブ対応パフォーマンス最適化
  compress: true,
  poweredByHeader: false,
  
  // 画像最適化設定（静的エクスポート対応）
  images: {
    unoptimized: true, // 静的エクスポート用（必須）
    
    // レスポンシブ対応
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // 次世代フォーマット対応
    formats: ['image/webp', 'image/avif'],
    
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
  
  // セキュリティヘッダー設定は静的エクスポートでは使用不可
  // CloudFrontレベルで設定することを推奨
};

export default nextConfig;
