/**
 * フロントエンドテスト用環境変数設定
 * 
 * テスト実行時に使用する環境変数を定義します。
 * 本番環境の設定を模擬した値を設定します。
 */

// Next.js公開環境変数のモック値
process.env.NEXT_PUBLIC_API_BASE_URL = 'https://test-api.homebiyori.com/api';
process.env.NEXT_PUBLIC_AWS_REGION = 'ap-northeast-1';
process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID = 'ap-northeast-1_TEST123456';
process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID = 'TEST_CLIENT_ID_123456789';
process.env.NEXT_PUBLIC_COGNITO_DOMAIN = 'homebiyori-test-auth';
process.env.NEXT_PUBLIC_CDN_URL = 'https://test-cdn.homebiyori.com';
process.env.NEXT_PUBLIC_ENVIRONMENT = 'test';

// テスト固有の設定
process.env.NODE_ENV = 'test';
process.env.__NEXT_TEST_MODE = 'true';