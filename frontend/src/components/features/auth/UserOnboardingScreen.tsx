'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { AppScreen } from '@/types';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/lib/hooks';

interface UserOnboardingScreenProps {
  onNavigate: (screen: AppScreen) => void;
  onComplete: () => void;
}

const UserOnboardingScreen = ({ onNavigate, onComplete }: UserOnboardingScreenProps) => {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  }>({ 
    type: 'success', 
    title: '', 
    message: '' 
  });

  const auth = useAuth();

  // ニックネームのバリデーション
  const validateNickname = (value: string): string => {
    if (!value.trim()) {
      return 'ニックネームを入力してください';
    }
    if (value.length < 2) {
      return 'ニックネームは2文字以上で入力してください';
    }
    if (value.length > 20) {
      return 'ニックネームは20文字以内で入力してください';
    }
    return '';
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateNickname(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // ニックネームを保存してオンボーディング完了
      await auth.updateProfile({ 
        nickname: nickname.trim(),
        onboarding_completed: true 
      });

      setToastMessage({
        type: 'success',
        title: '設定完了！',
        message: `ようこそ、${nickname.trim()}さん！キャラクター選択画面に移動します。`
      });
      setShowToast(true);

      // 少し待ってから次の画面に遷移
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('プロフィールの保存に失敗しました。もう一度お試しください。');
      setToastMessage({
        type: 'error',
        title: '保存エラー',
        message: 'ニックネームの保存に失敗しました。'
      });
      setShowToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 入力フィールドの変更処理
  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNickname(value);
    
    // リアルタイムバリデーション
    if (error) {
      const validationError = validateNickname(value);
      setError(validationError);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
            <User className="w-8 h-8 text-emerald-600" />
          </div>
          <Typography variant="h1" className="text-emerald-800 mb-2">
            はじめまして！
          </Typography>
          <Typography variant="body" className="text-emerald-600 max-w-md mx-auto">
            ほめびよりへようこそ。まずはあなたのニックネームを教えてください。
          </Typography>
        </motion.div>

        {/* メインコンテンツ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-md mx-auto"
        >
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-emerald-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label 
                  htmlFor="nickname" 
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  ニックネーム
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="nickname"
                    value={nickname}
                    onChange={handleNicknameChange}
                    placeholder="例：ママさん、太郎パパ"
                    className={`
                      w-full px-4 py-3 rounded-xl border-2 transition-colors duration-200
                      ${error 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-gray-200 focus:border-emerald-500'
                      }
                      focus:outline-none focus:ring-0
                    `}
                    disabled={isSubmitting}
                    maxLength={20}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {nickname.length > 0 && !error && (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                </div>
                
                {/* 文字数カウンター */}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    2〜20文字で入力してください
                  </span>
                  <span className={`text-xs ${nickname.length > 20 ? 'text-red-500' : 'text-gray-500'}`}>
                    {nickname.length}/20
                  </span>
                </div>

                {/* エラーメッセージ */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center mt-3 text-red-600 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </div>

              {/* 説明テキスト */}
              <div className="bg-emerald-50 rounded-xl p-4">
                <Typography variant="caption" className="text-emerald-700">
                  💡 ニックネームは後から設定で変更できます
                </Typography>
              </div>

              {/* 送信ボタン */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={isSubmitting || !!error || !nickname.trim()}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">保存中...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span>次へ進む</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </div>
                )}
              </Button>
            </form>
          </div>
        </motion.div>

        {/* フッター情報 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8"
        >
          <Typography variant="caption" className="text-emerald-600">
            次のステップ: AIキャラクター選択
          </Typography>
        </motion.div>
      </div>

      {/* トースト通知 */}
      <Toast
        type={toastMessage.type}
        title={toastMessage.title}
        message={toastMessage.message}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        position="top-center"
      />
    </div>
  );
};

export default UserOnboardingScreen;