'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { motion } from 'framer-motion';

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // TODO: AWS Cognito Google OAuth実装
      console.log('Google OAuth start');
      
      // 一時的にダッシュボードにリダイレクト（開発時）
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const breadcrumbItems = [
    {
      label: 'ホーム',
      href: '/',
      icon: <Home className="w-4 h-4" />
    },
    {
      label: 'ログイン',
      href: '/auth/signin'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* ヘッダー */}
      <div className="bg-white/95 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {/* メインヘッダー */}
          <div className="flex items-center justify-between">
            {/* 左側：戻るボタンとタイトル */}
            <div className="flex items-center space-x-3">
              <motion.button
                onClick={() => router.push('/')}
                className="p-2 rounded-xl hover:bg-emerald-50 transition-colors group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
              </motion.button>
              
              <div>
                <h1 className="text-xl font-bold text-emerald-800">ログイン</h1>
                <p className="text-sm text-emerald-600 mt-0.5">ほめびよりにようこそ</p>
              </div>
            </div>

            {/* 右側：ホームボタン */}
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={() => router.push('/')}
                className="p-2 rounded-xl hover:bg-emerald-50 transition-colors group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="ホームに戻る"
              >
                <Home className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
              </motion.button>
            </div>
          </div>

          {/* パンくずナビゲーション */}
          <motion.div 
            className="mt-3 pt-3 border-t border-emerald-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Breadcrumb items={breadcrumbItems} />
          </motion.div>
        </div>

        {/* プログレスバー */}
        <motion.div 
          className="h-0.5 bg-gradient-to-r from-emerald-500 to-green-400"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ transformOrigin: 'left' }}
        />
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-md mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          {/* ログインアイコン */}
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-emerald-800 mb-2">
            ほめびよりへようこそ
          </h2>
          <p className="text-emerald-600 text-sm mb-2">
            あなたの育児を優しく応援するAIキャラクターたちが待っています
          </p>
          <p className="text-emerald-500 text-sm">
            無料でご利用いただけます
          </p>
        </motion.div>

        {/* ログインフォーム */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Google OAuth ボタン */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-4 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-3 shadow-sm"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700 font-medium">ログイン中...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-gray-700 font-medium">Googleでログイン</span>
              </>
            )}
          </button>

          {/* セキュリティ・利便性の説明 */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="text-center">
              <p className="text-emerald-700 text-sm mb-2 font-medium">
                🔒 安全で簡単なログイン
              </p>
              <ul className="text-emerald-600 text-xs space-y-1">
                <li>• Googleアカウントで安全にログイン</li>
                <li>• パスワードの管理不要</li>
                <li>• ワンクリックで即座にアクセス</li>
              </ul>
            </div>
          </div>

          {/* 利用規約・プライバシーポリシー同意 */}
          <div className="text-center text-sm text-gray-600 leading-relaxed">
            <p className="mb-2">
              ログインすることで、以下に同意したものとみなされます：
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <button
                onClick={() => router.push('/legal/terms')}
                className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium transition-colors"
              >
                利用規約
              </button>
              <span className="hidden sm:inline text-gray-400">・</span>
              <button
                onClick={() => router.push('/legal/privacy')}
                className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium transition-colors"
              >
                プライバシーポリシー
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}