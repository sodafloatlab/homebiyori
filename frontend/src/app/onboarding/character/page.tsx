/**
 * Character Selection Page - オンボーディング Step 2
 * 
 * ■機能概要■
 * - AIキャラクター選択
 * - 3つのキャラクターから選択
 * - オンボーディング完了処理
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import useAuthStore from '@/stores/authStore';

type CharacterType = 'mittyan' | 'madokasan' | 'hideji';

interface Character {
  id: CharacterType;
  name: string;
  description: string;
  personality: string;
  emoji: string;
  color: string;
  gradient: string;
}

const characters: Character[] = [
  {
    id: 'mittyan',
    name: 'みっちゃん',
    description: '優しくて聞き上手な癒し系キャラクター',
    personality: '共感力が高く、あなたの気持ちに寄り添います',
    emoji: '🌸',
    color: 'pink',
    gradient: 'from-pink-100 to-rose-100'
  },
  {
    id: 'madokasan',
    name: 'まどか姉さん',
    description: 'しっかり者で頼りになるお姉さんキャラクター',
    personality: '的確なアドバイスで育児をサポートします',
    emoji: '💪',
    color: 'blue',
    gradient: 'from-blue-100 to-indigo-100'
  },
  {
    id: 'hideji',
    name: 'ヒデじい',
    description: '明るくて元気いっぱいな友達キャラクター',
    personality: '一緒に楽しく育児を頑張りましょう',
    emoji: '✨',
    color: 'yellow',
    gradient: 'from-yellow-100 to-orange-100'
  }
];

export default function CharacterSelectionPage() {
  const router = useRouter();
  const { user, updateProfile, completeOnboarding, isLoading } = useAuthStore();
  
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // キャラクター選択処理
  const handleCharacterSelect = (character: CharacterType) => {
    setSelectedCharacter(character);
  };

  // オンボーディング完了処理
  const handleComplete = async () => {
    if (!selectedCharacter) return;

    setIsSubmitting(true);

    try {
      // まずローカル状態を更新（即座に反映）
      console.log('📝 Updating local profile state...');
      updateProfile({
        ai_character: selectedCharacter,
        onboarding_completed: true
      });

      // バックエンドでオンボーディング完了処理を試行
      console.log('🌐 Attempting backend onboarding completion...');
      try {
        const success = await completeOnboarding({
          ai_character: selectedCharacter
        });

        if (success) {
          console.log('✅ Backend onboarding completed successfully');
        }
      } catch (backendError) {
        // バックエンドエラーはログ出力のみ（処理は続行）
        console.warn('⚠️ Backend onboarding API failed (graceful degradation):', {
          error: backendError,
          message: 'Continuing with local state only'
        });
        
        // バックエンド接続失敗を記録
        // プロフィールエラーとして保存（後で同期リトライ可能）
        const store = useAuthStore.getState();
        store.setProfileError('バックエンドとの同期に失敗しました。データはローカルに保存されています。');
      }

      // ローカル状態でオンボーディング完了
      console.log('✅ Onboarding completed (local state)');
      
      // チャット機能画面にリダイレクト
      router.push('/chat');
      
    } catch (criticalError) {
      console.error('❌ Critical onboarding error:', criticalError);
      
      // 重大なエラー（ローカル状態更新も失敗）の場合のみエラー表示
      // ただし、それでも続行を試みる
      router.push('/chat');
      
    } finally {
      setIsSubmitting(false);
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
        className="w-full max-w-2xl"
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
              <Sparkles className="w-8 h-8 text-emerald-600" />
            </motion.div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              AIキャラクターを選択してください
            </h1>
            <p className="text-gray-600">
              あなたの育児をサポートする相棒を選びましょう
            </p>
          </div>

          {/* プログレスバー */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>ステップ 2 / 2</span>
              <span>100% 完了</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-emerald-500 h-2 rounded-full"
                initial={{ width: "50%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>

          {/* キャラクター選択 */}
          <div className="grid gap-4 mb-8">
            {characters.map((character, index) => (
              <motion.div
                key={character.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                onClick={() => handleCharacterSelect(character.id)}
                className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-300 ${
                  selectedCharacter === character.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg transform scale-105'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                {/* 選択インジケーター */}
                {selectedCharacter === character.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </motion.div>
                )}

                <div className="flex items-center space-x-4">
                  {/* キャラクター絵文字 */}
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${character.gradient} flex items-center justify-center text-2xl`}>
                    {character.emoji}
                  </div>

                  {/* キャラクター情報 */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {character.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {character.description}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {character.personality}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 完了ボタン */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Button
              onClick={handleComplete}
              variant="primary"
              size="lg"
              disabled={!selectedCharacter || isSubmitting || isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center"
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  完了処理中...
                </>
              ) : (
                <>
                  オンボーディング完了
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </motion.div>

          {/* ヒント */}
          {selectedCharacter && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4"
            >
              <div className="flex items-start space-x-3">
                <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-emerald-700">
                  <p className="font-medium mb-1">
                    {characters.find(c => c.id === selectedCharacter)?.name} を選択しました
                  </p>
                  <p className="text-emerald-600">
                    後から設定画面でキャラクターを変更することも可能です
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* フッター */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="text-center mt-6"
          >
            <p className="text-xs text-gray-500">
              設定完了後、すぐにAIとチャットを開始できます
            </p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}