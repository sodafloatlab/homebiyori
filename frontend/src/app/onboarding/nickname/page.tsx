/**
 * Nickname Registration Page - オンボーディング Step 1
 * 
 * ■機能概要■
 * - ニックネーム登録
 * - バリデーション付きフォーム
 * - キャラクター選択画面へ遷移
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, ArrowRight, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import useAuthStore from '@/stores/authStore';

interface FormErrors {
  nickname?: string;
}

export default function NicknameOnboardingPage() {
  const router = useRouter();
  const { user, updateProfile, isLoading } = useAuthStore();
  
  const [nickname, setNickname] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ニックネームバリデーション
  const validateNickname = (value: string): string | null => {
    if (!value.trim()) {
      return 'ニックネームを入力してください';
    }
    if (value.trim().length < 2) {
      return 'ニックネームは2文字以上で入力してください';
    }
    if (value.trim().length > 20) {
      return 'ニックネームは20文字以内で入力してください';
    }
    if (!/^[a-zA-Z0-9あ-んア-ヶ一-龯ー\s]+$/.test(value)) {
      return '使用できない文字が含まれています';
    }
    return null;
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      setErrors({ nickname: nicknameError });
      return;
    }
    
    setErrors({});
    setIsSubmitting(true);

    try {
      // まずローカル状態を更新（即座に反映）
      console.log('📝 Updating local nickname...');
      updateProfile({
        nickname: nickname.trim()
      });

      // バックエンドにニックネーム保存を試行
      console.log('🌐 Attempting backend nickname save...');
      try {
        const { default: UserService } = await import('@/lib/services/userService');
        await UserService.updateProfile({ nickname: nickname.trim() });
        console.log('✅ Nickname saved to backend');
      } catch (backendError) {
        // バックエンドエラーはログ出力のみ（処理は続行）
        console.warn('⚠️ Backend nickname save failed (graceful degradation):', {
          error: backendError,
          message: 'Continuing with local state only'
        });
        
        // バックエンド接続失敗を記録
        const store = useAuthStore.getState();
        store.setProfileError('バックエンドとの同期に失敗しました。データはローカルに保存されています。');
      }

      // ローカル状態でニックネーム保存完了
      console.log('✅ Nickname saved (local state)');

      // キャラクター選択画面に遷移
      router.push('/onboarding/character');
      
    } catch (criticalError) {
      // ローカル状態更新も失敗した場合のみエラー表示
      console.error('❌ Critical nickname save error:', criticalError);
      setErrors({ nickname: 'ニックネームの保存に失敗しました。再度お試しください。' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 入力変更時のリアルタイムバリデーション
  const handleNicknameChange = (value: string) => {
    setNickname(value);
    
    // エラーがある場合はリアルタイムでクリア
    if (errors.nickname && value.trim()) {
      const error = validateNickname(value);
      if (!error) {
        setErrors(prev => ({ ...prev, nickname: undefined }));
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <p className="text-gray-600">認証が必要です</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <User className="w-8 h-8 text-emerald-600" />
            </motion.div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ニックネームを教えてください
            </h1>
            <p className="text-gray-600">
              AIがあなたを呼ぶ際の名前を設定します
            </p>
          </div>

          {/* プログレスバー */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>ステップ 1 / 2</span>
              <span>50% 完了</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-emerald-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "50%" }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                ニックネーム
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => handleNicknameChange(e.target.value)}
                placeholder="例: みき、田中さん、パパ"
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors ${
                  errors.nickname 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300 bg-white'
                }`}
                disabled={isSubmitting || isLoading}
                maxLength={20}
              />
              
              {/* エラーメッセージ */}
              {errors.nickname && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-sm mt-2"
                >
                  {errors.nickname}
                </motion.p>
              )}
              
              {/* 文字数カウンター */}
              <div className="text-right text-xs text-gray-400 mt-1">
                {nickname.length} / 20 文字
              </div>
            </div>

            {/* ヒント */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-emerald-50 border border-emerald-200 rounded-lg p-4"
            >
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-emerald-700">
                  <p className="font-medium mb-1">ニックネームのヒント</p>
                  <ul className="space-y-1 text-emerald-600">
                    <li>• ひらがな、カタカナ、漢字、英数字が使えます</li>
                    <li>• 後から変更することも可能です</li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* 送信ボタン */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || isLoading || !nickname.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center"
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  保存中...
                </>
              ) : (
                <>
                  次へ進む
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* フッター */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-6"
          >
            <p className="text-xs text-gray-500">
              次のステップでAIキャラクターを選択します
            </p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}