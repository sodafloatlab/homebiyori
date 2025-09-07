/**
 * Chat Page - メインチャット機能ページ
 * 
 * ■機能概要■
 * - AIとのメインチャット機能
 * - 選択されたキャラクターとの対話
 * - 認証とオンボーディング完了チェック
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import ChatScreen from '@/components/features/chat/ChatScreen';
import useAuthStore from '@/stores/authStore';
import { Card } from '@/components/ui/Card';

export default function ChatPage() {
  const router = useRouter();
  const { user, profile, isLoading } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializePage = async () => {
      if (!isLoading && !user) {
        // 未認証ユーザーはサインイン画面へ
        router.push('/auth/signin');
        return;
      }

      if (user && profile) {
        if (!profile.onboarding_completed) {
          // オンボーディング未完了はニックネーム登録へ
          router.push('/onboarding/nickname');
          return;
        }
        
        // 正常にチャット画面を表示
        setIsInitializing(false);
      }
    };

    initializePage();
  }, [user, profile, isLoading, router]);

  if (isLoading || isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">チャットを準備しています...</p>
        </Card>
      </div>
    );
  }

  if (!user || !profile?.onboarding_completed) {
    return null; // リダイレクト処理中
  }

  return (
    <AuthenticatedLayout
      requiresPremium={false}
      allowDuringTrial={true}
      showUpgradePrompt={false}
    >
      <ChatScreen
        selectedAiRole={profile.ai_character}
        currentMood="praise"
        onNavigate={(screen) => {
          // ナビゲーション処理（必要に応じて実装）
          console.log('Navigate to:', screen);
        }}
        onCharacterChange={() => {
          // キャラクター変更処理
          router.push('/onboarding/character');
        }}
        onMoodChange={(mood) => {
          console.log('Mood change:', mood);
        }}
      />
    </AuthenticatedLayout>
  );
}