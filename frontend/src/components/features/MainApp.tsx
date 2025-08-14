'use client';

import React, { useState, useEffect } from 'react';
import { AppScreen, AppState, AiRole, MoodType } from '@/types';
import { useAuth, useChat, useTree, useNotifications, useMaintenance } from '@/lib/hooks';
import TopPage from './TopPage';
import AuthScreen from './AuthScreen';
import CharacterSelection from './CharacterSelection';
import ChatScreen from './ChatScreen';
import TreeView from './TreeView';
import GroupChatScreen from './chat/GroupChatScreen';
import NotificationsPage from './notifications/NotificationsPage';
import StaticPages from './StaticPages';
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
  const [toastMessage, setToastMessage] = useState({ type: 'info' as const, title: '', message: '' });

  // ストア
  const auth = useAuth();
  const chat = useChat();
  const tree = useTree();
  const notifications = useNotifications();
  const maintenance = useMaintenance();
  const subscription = useSubscription();

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
            setCurrentScreen('character-selection'); // 初回設定
          }
          
          // データを並行読み込み
          await Promise.all([
            chat.loadChatHistory(),
            tree.loadTreeStatus(),
            notifications.loadNotifications()
          ]);
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
      'landing', 'auth', 'character-selection', 'chat', 'tree', 
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
    if (screen === 'group-chat' && auth.user?.plan === 'free') {
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
      handleNavigate('character-selection');
    }
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
        
      case 'character-selection':
        return (
          <CharacterSelection 
            onCharacterSelect={handleCharacterSelect}
            onNavigate={handleNavigate}
          />
        );
        
      case 'chat':
        return (
          <ChatScreen
            selectedAiRole={chat.selectedAiRole || 'mittyan'}
            currentMood={chat.currentMood || 'praise'}
            onNavigate={handleNavigate}
            onCharacterChange={() => handleNavigate('character-selection')}
          />
        );
        
      case 'tree':
        return (
          <TreeView
            onNavigate={handleNavigate}
            previousScreen={previousScreen || 'chat'}
          />
        );
        
      case 'notifications':
        return (
          <NotificationsPage
            onNavigate={handleNavigate}
            previousScreen={previousScreen}
            userPlan={auth.user?.plan || 'free'}
            userInfo={auth.user ? {
              email: auth.user.email || '',
              nickname: auth.user.nickname || '',
              plan: auth.user.plan || 'free'
            } : undefined}
            isLoggedIn={auth.isLoggedIn}
            onPlanChange={(plan) => {
              console.log('Plan change requested:', plan);
            }}
            onPlanChangeRequest={(plan) => {
              if (plan === 'premium') {
                handleNavigate('premium');
              }
            }}
            onLogout={auth.logout}
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
          <StaticPages
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
          />
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
              chat.addChatHistory({ userMessage, aiResponse, aiRole });
            }}
            totalCharacters={tree.status?.experience || 0}
            fruits={tree.fruits}
            userPlan={auth.user?.plan || 'free'}
            chatMode={chat.currentMode || 'normal'}
            chatHistory={chat.history}
            onChatModeChange={(mode) => chat.setCurrentMode(mode)}
            globalMessages={chat.messages}
            onAddGlobalMessage={(message) => chat.addMessage(message)}
            onMoodChange={(mood) => chat.setCurrentMood(mood)}
            userInfo={auth.user ? {
              email: auth.user.email || '',
              nickname: auth.user.nickname || '',
              plan: auth.user.plan || 'free'
            } : undefined}
            isLoggedIn={auth.isLoggedIn}
            onPlanChange={(plan) => {
              // プラン変更処理
              console.log('Plan change requested:', plan);
            }}
            onPlanChangeRequest={(plan) => {
              if (plan === 'premium') {
                handleNavigate('premium');
              }
            }}
            onLogout={auth.logout}
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
                
                await subscription.createSubscription({ plan });
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
              {maintenance.getEstimatedRecoveryTime() && (
                <p className="text-sm text-gray-500 mb-4">
                  予定復旧時刻: {maintenance.getEstimatedRecoveryTime()}
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