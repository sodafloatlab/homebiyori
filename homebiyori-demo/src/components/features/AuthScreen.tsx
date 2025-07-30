'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AppScreen } from './MainApp';
import NavigationHeader from '../layout/NavigationHeader';
import LoadingSpinner from '../ui/LoadingSpinner';
import Toast from '../ui/Toast';

interface AuthScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onAuthSuccess: () => void;
}

const AuthScreen = ({ onNavigate, onAuthSuccess }: AuthScreenProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ type: 'success' as const, title: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // デモ用の認証処理（実際のアプリでは本物の認証を実装）
    setTimeout(() => {
      setIsLoading(false);
      setToastMessage({
        type: 'success',
        title: '認証完了！',
        message: 'キャラクター選択画面に移動します'
      });
      setShowToast(true);
      
      // トースト表示後に画面遷移
      setTimeout(() => {
        onAuthSuccess();
      }, 1500);
    }, 2000);
  };

  const handleGoogleAuth = () => {
    setIsLoading(true);
    // デモ用のGoogle認証処理
    setTimeout(() => {
      setIsLoading(false);
      setToastMessage({
        type: 'success',
        title: 'Google認証完了！',
        message: 'ほめびよりへようこそ'
      });
      setShowToast(true);
      
      // トースト表示後に画面遷移
      setTimeout(() => {
        onAuthSuccess();
      }, 1500);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50" style={{
      backgroundColor: '#fdfdf8',
      backgroundImage: 'linear-gradient(135deg, #f0f9f0 0%, #fefffe 35%, #f8fcf0 100%)'
    }}>
      <NavigationHeader
        currentScreen="auth"
        title={isLogin ? 'ログイン' : '新規登録'}
        subtitle="ほめびよりにようこそ"
        onNavigate={onNavigate}
        previousScreen="landing"
      />

      {/* ローディングスピナー */}
      {isLoading && (
        <LoadingSpinner
          fullScreen
          message={isLogin ? 'ログイン中です...' : 'アカウント作成中です...'}
        />
      )}

      {/* トースト通知 */}
      <Toast
        type={toastMessage.type}
        title={toastMessage.title}
        message={toastMessage.message}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        position="top-center"
      />

      <div className="max-w-md mx-auto p-6">
        {/* ウェルカムメッセージ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-800 mb-2">
            ほめびよりへようこそ
          </h2>
          <p className="text-emerald-600 text-sm">
            あなたの育児を優しく応援するAIキャラクターたちが待っています
          </p>
        </motion.div>

        {/* Google認証ボタン */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full mb-6 p-4 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-3 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="font-medium text-gray-700">
            {isLoading ? 'ログイン中...' : 'Googleでログイン'}
          </span>
        </motion.button>

        {/* 区切り線 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative mb-6"
        >
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">または</span>
          </div>
        </motion.div>

        {/* メール認証フォーム */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              メールアドレス
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="example@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-emerald-700 mb-2">
              パスワード
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="パスワードを入力"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{isLogin ? 'ログイン中...' : 'アカウント作成中...'}</span>
              </div>
            ) : (
              isLogin ? 'ログイン' : 'アカウント作成'
            )}
          </button>
        </motion.form>

        {/* ログイン/新規登録切り替え */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6"
        >
          <p className="text-sm text-gray-600">
            {isLogin ? 'アカウントをお持ちでない方は' : '既にアカウントをお持ちの方は'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {isLogin ? '新規登録' : 'ログイン'}
            </button>
          </p>
        </motion.div>

        {/* デモ用説明 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl"
        >
          <p className="text-sm text-blue-800 text-center">
            <strong>デモ版</strong><br />
            認証ボタンを押すとデモ用認証が完了し、AIキャラクター選択画面に進みます
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthScreen;