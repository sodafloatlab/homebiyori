const config = {
  displayName: 'Frontend Tests',
  
  // テスト環境
  testEnvironment: 'jsdom',
  
  // テスト対象ディレクトリ
  roots: ['<rootDir>'],
  
  // テストファイルパターン
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  
  // 変換設定
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    }],
  },
  
  // モジュール名マッピング
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../frontend/src/$1',
    '^~/(.*)$': '<rootDir>/../../frontend/$1',
  },
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/setup-tests.js'],
  
  // カバレッジ設定
  collectCoverageFrom: [
    '../../frontend/src/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // 無視するパターン
  testPathIgnorePatterns: [
    '<rootDir>/../../frontend/.next/',
    '<rootDir>/../../frontend/out/',
    '/node_modules/',
  ],
  
  // モジュール解決設定
  moduleDirectories: ['node_modules', '<rootDir>/../../frontend'],
  
  // 環境変数
  setupFiles: ['<rootDir>/env-setup.js'],
  
  // ファイル拡張子
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
};

module.exports = config;