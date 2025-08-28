'use client';

import React, { useState, useEffect } from 'react';
import { AppScreen, AppState, AiRole, MoodType } from '@/types';
import { useAuth, useMaintenance } from '@/lib/hooks';
import useChatStore from '@/stores/chatStore';
import TopPage from './TopPage';
import AuthScreen from './auth/AuthScreen';
import UserOnboardingScreen from './auth/UserOnboardingScreen';
import CharacterSelection from './character/CharacterSelection';
import GroupChatScreen from './chat/GroupChatScreen';
import NotificationsPage from './notifications/NotificationsPage';
import { PremiumLandingPage } from './premium/PremiumLandingPage';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Toast from '@/components/ui/Toast';
import { useSubscription } from '@/lib/hooks';

const MainApp = () => {
  // 初期状態は常にlandingでSSR/クライアント間の一貫性を保つ
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [previousScreen, setPreviousScreen] = useState<AppScreen | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({ type: 'info', title: '', message: '' });

  // ストア
  const auth = useAuth();
  const maintenance = useMaintenance();
  const subscription = useSubscription();
  const chat = useChatStore();

  // 初期化処理
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 認証状態をチェック
        const isAuthenticated = await auth.checkAuthStatus();
        
        if (isAuthenticated) {
          // 認証済みの場合、オンボーディング状況に応じて適切な画面に
          if (auth.profile?.onboarding_completed) {
            setCurrentScreen('character-selection'); // または最後に使用した画面
          } else {
            setCurrentScreen('user-onboarding'); // 初回オンボーディング
          }
          
          // 初期化完了（データ読み込みは各コンポーネントで実行）
          // await Promise.all([]);
        }
        
        // URL解析による画面復元
        const urlScreen = getScreenFromURL();
        if (urlScreen !== 'landing') {
          setCurrentScreen(urlScreen);
        }
        
      } catch (error) {
        console.error('App initialization error:', error);
        setToastMessage({
          type: 'error',
          title: '初期化エラー',
          message: 'アプリの初期化に失敗しました。再読み込みしてください。'
        });
        setShowToast(true);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // URL解析
  const getScreenFromURL = (): AppScreen => {
    if (typeof window === 'undefined') return 'landing';
    
    const hash = window.location.hash.replace('#', '');
    const validScreens: AppScreen[] = [
      'landing', 'auth', 'user-onboarding', 'character-selection', 'chat', 'tree', 
      'group-chat', 'notifications', 'premium', 'subscription-cancel', 'terms-of-service', 
      'privacy-policy', 'commercial-transaction', 'contact', 'faq'
    ];
    
    return validScreens.includes(hash as AppScreen) ? (hash as AppScreen) : 'landing';
  };

  // History API関連の設定
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 現在のURLを更新
    const currentUrl = currentScreen === 'landing' ? '/' : `/#${currentScreen}`;
    window.history.replaceState({ screen: currentScreen }, '', currentUrl);
  }, [currentScreen]);

  // ブラウザの戻る/進むボタン対応
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        const targetScreen = event.state.screen as AppScreen;
        handleNavigate(targetScreen, false); // History APIを更新しない
      } else {
        handleNavigate('landing', false);
      }
      
      // ページ上部にスクロール
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ナビゲーション処理
  const handleNavigate = (screen: AppScreen, updateHistory: boolean = true) => {
    // グループチャットへのアクセス時、無料ユーザーはプレミアムページにリダイレクト
    if (screen === 'group-chat' && (!subscription.subscription || subscription.subscription.status === 'canceled' || subscription.subscription.status === 'expired')) {
      console.log('Free user attempting to access group chat, redirecting to premium');
      setPreviousScreen(currentScreen);
      setCurrentScreen('premium');
      
      if (updateHistory && typeof window !== 'undefined') {
        window.history.pushState({ screen: 'premium' }, '', '/#premium');
        window.scrollTo(0, 0);
      }
      
      // プレミアムアップグレード促進のトースト表示
      setToastMessage({
        type: 'info',
        title: 'プレミアム限定機能',
        message: 'グループチャット機能はプレミアムプラン限定です。'
      });
      setShowToast(true);
      return;
    }

    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);

    if (updateHistory && typeof window !== 'undefined') {
      const url = screen === 'landing' ? '/' : `/#${screen}`;
      window.history.pushState({ screen }, '', url);
      window.scrollTo(0, 0);
    }
  };

  // キャラクター選択完了時
  const handleCharacterSelect = (role: AiRole, mood: MoodType) => {
    // チャットストアに設定
    chat.setSelectedAiRole(role);
    chat.setCurrentMood(mood);
    
    // チャット画面に移動
    handleNavigate('chat');
  };

  // 認証成功時
  const handleAuthSuccess = (userProfile: any) => {
    if (userProfile.onboarding_completed) {
      handleNavigate('character-selection');
    } else {
      handleNavigate('user-onboarding');
    }
  };

  // オンボーディング完了時
  const handleOnboardingComplete = () => {
    handleNavigate('character-selection');
  };

  // 現在の画面に応じてコンポーネントをレンダリング
  const renderCurrentScreen = () => {
    // メンテナンスモードの場合、特定画面以外は制限
    if (maintenance.isMaintenanceMode && !['landing', 'terms-of-service', 'privacy-policy'].includes(currentScreen)) {
      return <TopPage onNavigate={handleNavigate} />;
    }

    switch (currentScreen) {
      case 'landing':
        return <TopPage onNavigate={handleNavigate} />;
        
      case 'auth':
        return (
          <AuthScreen 
            onNavigate={handleNavigate}
            onAuthSuccess={handleAuthSuccess}
          />
        );

      case 'user-onboarding':
        return (
          <UserOnboardingScreen
            onNavigate={handleNavigate}
            onComplete={handleOnboardingComplete}
          />
        );
        
      case 'character-selection':
        return (
          <CharacterSelection 
            onCharacterSelect={handleCharacterSelect}
            onNavigate={handleNavigate}
          />
        );
        
      case 'chat':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">チャット画面</h2>
            <p className="text-gray-600">ChatScreen コンポーネントが実装されていません</p>
            <button 
              onClick={() => handleNavigate('character-selection')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              キャラクター選択に戻る
            </button>
          </div>
        );
        
      case 'tree':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">木の成長表示</h2>
            <p className="text-gray-600">TreeView コンポーネントが実装されていません</p>
            <button 
              onClick={() => handleNavigate('character-selection')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              キャラクター選択に戻る
            </button>
          </div>
        );
        
      case 'notifications':
        return (
          <NotificationsPage
            onNavigate={handleNavigate}
            previousScreen={previousScreen}
            userPlan={(subscription.subscription && subscription.subscription.status === 'active') ? 'premium' : 'free'}
            userInfo={auth.user ? {
              email: auth.user.email || '',
              nickname: auth.user.nickname || '',
              plan: (subscription.subscription && subscription.subscription.status === 'active') ? 'premium' : 'free'
            } : undefined}
            isLoggedIn={auth.isAuthenticated}
            onPlanChange={(plan) => {
              console.log('Plan change requested:', plan);
            }}
            onPlanChangeRequest={(plan) => {
              if (plan === 'premium') {
                handleNavigate('premium');
              }
            }}
            onLogout={auth.signOut}
            onNicknameChange={(nickname) => {
              console.log('Nickname change:', nickname);
            }}
            onEmailChange={(email) => {
              console.log('Email change:', email);
            }}
          />
        );

      case 'terms-of-service':
      case 'privacy-policy':
      case 'commercial-transaction':
      case 'contact':
      case 'faq':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">FAQ</h2>
            <p className="text-gray-600">StaticPages コンポーネントが実装されていません</p>
            <button 
              onClick={() => handleNavigate('landing')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              ホームに戻る
            </button>
          </div>
        );

      case 'group-chat':
        return (
          <GroupChatScreen
            currentMood={chat.currentMood || 'praise'}
            selectedAiRole={chat.selectedAiRole}
            onNavigate={handleNavigate}
            onAddCharacters={(count) => {
              // 文字数追加処理
              console.log('Adding characters:', count);
            }}
            onAddFruit={(userMessage, aiResponse, emotion) => {
              // 実の生成処理
              console.log('Adding fruit:', { userMessage, aiResponse, emotion });
            }}
            onAddChatHistory={(userMessage, aiResponse, aiRole) => {
              // チャット履歴追加
              chat.addToHistory({ 
                id: Date.now().toString(),
                userMessage, 
                aiResponse, 
                aiRole, 
                timestamp: Date.now(), 
                mode: 'normal' 
              });
            }}
            totalCharacters={0}
            fruits={[]}
            userPlan={(subscription.subscription && subscription.subscription.status === 'active') ? 'premium' : 'free'}
            chatMode={'normal'}
            chatHistory={chat.history}
            onChatModeChange={(mode) => console.log('Chat mode change:', mode)}
            globalMessages={chat.messages}
            onAddGlobalMessage={(message) => chat.addMessage(message)}
            onMoodChange={(mood) => chat.setCurrentMood(mood)}
            userInfo={auth.user ? {
              email: auth.user.email || '',
              nickname: auth.user.nickname || '',
              plan: (subscription.subscription && subscription.subscription.status === 'active') ? 'premium' : 'free'
            } : undefined}
            isLoggedIn={auth.isAuthenticated}
            onPlanChange={(plan) => {
              // プラン変更処理
              console.log('Plan change requested:', plan);
            }}
            onPlanChangeRequest={(plan) => {
              if (plan === 'premium') {
                handleNavigate('premium');
              }
            }}
            onLogout={auth.signOut}
            onNicknameChange={(nickname) => {
              // ニックネーム変更処理
              console.log('Nickname change:', nickname);
            }}
            onEmailChange={(email) => {
              // メール変更処理
              console.log('Email change:', email);
            }}
          />
        );

      case 'premium':
        return (
          <PremiumLandingPage
            onClose={() => handleNavigate(previousScreen || 'character-selection')}
            onSubscribe={async (plan) => {
              try {
                setToastMessage({
                  type: 'info',
                  title: 'プレミアムプラン登録',
                  message: `${plan === 'monthly' ? '月額' : '年額'}プランの登録処理を開始します。`
                });
                setShowToast(true);
                
                console.log('Plan change requested:', plan);
              } catch (error) {
                setToastMessage({
                  type: 'error',
                  title: '登録エラー',
                  message: 'プレミアムプランの登録に失敗しました。しばらく時間をおいてから再度お試しください。'
                });
                setShowToast(true);
              }
            }}
          />
        );

      case 'subscription-cancel':
        return (
          <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <div className="text-6xl mb-4">😢</div>
              <h2 className="text-2xl font-bold text-red-800 mb-4">解約手続き</h2>
              <p className="text-red-600 mb-6">プレミアムプランの解約をご希望ですか？</p>
              <p className="text-sm text-gray-500 mb-6">※解約システム実装予定</p>
              <div className="space-y-3">
                <button
                  onClick={() => handleNavigate('premium')}
                  className="w-full px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                >
                  解約手続きを進める
                </button>
                <button
                  onClick={() => handleNavigate('chat')}
                  className="w-full px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors"
                >
                  チャットに戻る
                </button>
              </div>
            </div>
          </div>
        );
        
      default:
        return <TopPage onNavigate={handleNavigate} />;
    }
  };

  // 初期化中のローディング表示
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" color="emerald" />
          <div className="mt-6">
            <h2 className="text-xl font-medium text-emerald-800">Homebiyori</h2>
            <p className="text-emerald-600 mt-2">アプリを初期化しています...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Application Error:', error);
        console.error('Error Info:', errorInfo);
        
        // エラー報告
        setToastMessage({
          type: 'error',
          title: 'アプリケーションエラー',
          message: '予期しないエラーが発生しました。'
        });
        setShowToast(true);
      }}
    >
      <div className="min-h-screen">
        {renderCurrentScreen()}
        
        {/* グローバルトースト通知 */}
        <Toast
          type={toastMessage.type}
          title={toastMessage.title}
          message={toastMessage.message}
          isVisible={showToast}
          onClose={() => setShowToast(false)}
          position="top-center"
        />

        {/* メンテナンスモーダル */}
        {maintenance.showMaintenanceModal && maintenance.maintenanceInfo && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 mx-4 max-w-md text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                システムメンテナンス
              </h3>
              <p className="text-gray-600 mb-6">
                {maintenance.maintenanceInfo.maintenance_message || 
                 'システムの改善作業を行っています。'}
              </p>
              {maintenance.estimatedRecoveryTime && (
                <p className="text-sm text-gray-500 mb-4">
                  予定復旧時刻: {maintenance.estimatedRecoveryTime}
                </p>
                )}
              <button
                onClick={() => maintenance.setShowModal(false)}
                className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                了解
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default MainApp;