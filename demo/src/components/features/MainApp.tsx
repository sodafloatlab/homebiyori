'use client';

import { useState, useEffect } from 'react';
import { 
  AppScreen, 
  AppState, 
  AiRole, 
  MoodType, 
  UserPlan, 
  ChatMessage,
  ChatMode,
  Fruit,
  ChatHistory,
  UserInfo
} from '@/types';
import { generateMessageId } from '@/lib/utils';
import { AI_GREETINGS } from '@/lib/constants';
import TopPage from './TopPage';
import AuthScreen from './AuthScreen';
import CharacterSelection from './CharacterSelection';
import ChatScreen from './ChatScreen';
import TreeView from './TreeView';
import GroupChatScreen from './GroupChatScreen';
import PremiumLandingPage from './PremiumLandingPage';
import TermsOfServicePage from './TermsOfServicePage';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import CommercialTransactionPage from './CommercialTransactionPage';
import ContactFormPage from './ContactFormPage';
import FAQPage from './FAQPage';
import SubscriptionCancelPage from './SubscriptionCancelPage';

// 型定義を外部エクスポート（後方互換性のため）
export type { AiRole, MoodType, AppScreen, UserPlan, ChatMode, ChatMessage } from '@/types';
export type { Fruit, ChatHistory } from '@/types';

const MainApp = () => {
  // 初期状態は常にlandingでSSR/クライアント間の一貫性を保つ
  const [appState, setAppState] = useState<AppState>({
    currentScreen: 'landing',
    previousScreen: null,
    selectedAiRole: null,
    currentMood: 'praise',
    totalCharacters: 0,
    fruits: [],
    userPlan: 'premium', // デモ用にプレミアムユーザーから開始
    chatMode: 'normal',
    chatHistory: [],
    globalMessages: []
  });

  // ユーザー情報の状態管理
  const [userInfo, setUserInfo] = useState<UserInfo>({
    email: 'user@example.com',
    nickname: 'ユーザー',
    avatar: undefined,
    plan: 'premium' // デモ用にプレミアムユーザーから開始
  });

  // ログイン状態の管理
  const [isLoggedIn, setIsLoggedIn] = useState(true); // デモ用にログイン済みとして開始

  // ユーザー情報とアプリ状態の同期
  useEffect(() => {
    setAppState(prev => ({
      ...prev,
      userPlan: userInfo.plan
    }));
  }, [userInfo.plan]);

  // クライアントサイドでのみURL解析を行い、初期画面を設定
  useEffect(() => {
    const getScreenFromURL = (): AppScreen => {
      const hash = window.location.hash.replace('#', '');
      const validScreens: AppScreen[] = [
        'landing', 'auth', 'character-selection', 'chat', 'tree', 
        'group-chat', 'premium', 'subscription-cancel', 'terms-of-service', 'privacy-policy', 
        'commercial-transaction', 'contact', 'faq'
      ];
      
      return validScreens.includes(hash as AppScreen) ? (hash as AppScreen) : 'landing';
    };

    const urlScreen = getScreenFromURL();
    if (urlScreen !== appState.currentScreen) {
      setAppState(prev => ({
        ...prev,
        currentScreen: urlScreen
      }));
    }
  }, []); // 空の依存配列で初回のみ実行

  // チャット画面間の切り替えを検出してシステムメッセージを追加
  useEffect(() => {
    const { currentScreen, previousScreen } = appState;
    
    // チャット画面間の切り替えのみを検出（メッセージが存在する場合のみ）
    if (appState.globalMessages.length > 0) {
      if (previousScreen === 'chat' && currentScreen === 'group-chat') {
        // 1:1チャットからグループチャットへ
        const switchMessage: ChatMessage = {
          id: generateMessageId('system-switch-group'),
          text: 'グループチャットに切り替わりました',
          sender: 'system',
          timestamp: Date.now(),
          systemType: 'mode-change'
        };
        handleAddGlobalMessage(switchMessage);
      } else if (previousScreen === 'group-chat' && currentScreen === 'chat') {
        // グループチャットから1:1チャットへ
        const switchMessage: ChatMessage = {
          id: generateMessageId('system-switch-single'),
          text: '1:1チャットに切り替わりました',
          sender: 'system',
          timestamp: Date.now(),
          systemType: 'mode-change'
        };
        handleAddGlobalMessage(switchMessage);
      }
    }
  }, [appState.currentScreen, appState.previousScreen]); // globalMessages.lengthを依存配列から削除

  // History API関連の設定
  useEffect(() => {
    // 初期状態をHistoryに保存
    if (typeof window !== 'undefined') {
      const currentUrl = appState.currentScreen === 'landing' ? '/' : `/#${appState.currentScreen}`;
      window.history.replaceState({ screen: appState.currentScreen }, '', currentUrl);
    }
  }, [appState.currentScreen]);

  // ブラウザの戻る/進むボタン対応
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        const targetScreen = event.state.screen as AppScreen;
        setAppState(prev => ({
          ...prev,
          previousScreen: prev.currentScreen,
          currentScreen: targetScreen
        }));
      } else {
        // stateがない場合はランディングページに戻る
        setAppState(prev => ({
          ...prev,
          previousScreen: prev.currentScreen,
          currentScreen: 'landing'
        }));
      }
      
      // ページ上部にスクロール
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  const handleNavigate = (screen: AppScreen) => {
    setAppState(prev => ({ 
      ...prev, 
      previousScreen: prev.currentScreen,
      currentScreen: screen 
    }));

    // History APIに状態を保存（URLも更新）
    if (typeof window !== 'undefined') {
      const url = screen === 'landing' ? '/' : `/#${screen}`;
      window.history.pushState({ screen }, '', url);
      
      // ページ上部にスクロール
      window.scrollTo(0, 0);
    }
  };

  const handleCharacterSelect = (role: AiRole, mood: MoodType) => {
    setAppState(prev => ({
      ...prev,
      selectedAiRole: role,
      currentMood: mood,
      previousScreen: prev.currentScreen,
      currentScreen: 'chat'
    }));

    // History APIに状態を保存
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: 'chat' }, '', '/#chat');
      
      // ページ上部にスクロール
      window.scrollTo(0, 0);
    }
  };

  const handleAddCharacters = (count: number) => {
    setAppState(prev => ({
      ...prev,
      totalCharacters: prev.totalCharacters + count
    }));
  };

  const handleAddFruit = (userMessage: string, aiResponse: string, emotion: string) => {
    if (!appState.selectedAiRole) return;
    
    const newFruit: Fruit = {
      id: Date.now().toString(),
      userMessage,
      aiResponse,
      aiRole: appState.selectedAiRole,
      createdAt: new Date().toLocaleDateString(),
      emotion
    };
    
    setAppState(prev => ({
      ...prev,
      fruits: [...prev.fruits, newFruit]
    }));
  };

  const handleAddChatHistory = (userMessage: string, aiResponse: string, aiRole: AiRole) => {
    const newChatHistory: ChatHistory = {
      id: Date.now().toString(),
      userMessage,
      aiResponse,
      aiRole,
      timestamp: Date.now(),
      mode: appState.chatMode
    };
    
    setAppState(prev => ({
      ...prev,
      chatHistory: [...prev.chatHistory.slice(-49), newChatHistory] // 最新50件まで保持
    }));
  };

  const handleChatModeChange = (mode: ChatMode) => {
    setAppState(prev => ({ ...prev, chatMode: mode }));
  };

  const handleMoodChange = (mood: MoodType) => {
    setAppState(prev => ({ ...prev, currentMood: mood }));
  };

  const handleAddGlobalMessage = (message: ChatMessage) => {
    setAppState(prev => ({
      ...prev,
      globalMessages: [...prev.globalMessages, message]
    }));
  };

  // ユーザー関連のハンドラー
  const handlePlanChange = (plan: UserPlan) => {
    setUserInfo(prev => ({ ...prev, plan }));
    setAppState(prev => ({ ...prev, userPlan: plan }));
  };

  const handlePlanChangeRequest = (targetPlan: UserPlan) => {
    if (targetPlan === 'premium') {
      // プレミアムプランへの変更：プレミアム説明画面へ
      handleNavigate('premium');
    } else {
      // 一般プランへの変更：サブスクリプションキャンセル画面へ
      handleNavigate('subscription-cancel');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAppState(prev => ({
      ...prev,
      currentScreen: 'landing',
      selectedAiRole: null,
      globalMessages: []
    }));
    
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: 'landing' }, '', '/');
      
      // ページ上部にスクロール
      window.scrollTo(0, 0);
    }
  };

  const handleNicknameChange = (nickname: string) => {
    setUserInfo(prev => ({ ...prev, nickname }));
  };

  const handleEmailChange = (email: string) => {
    setUserInfo(prev => ({ ...prev, email }));
  };

  // 初期挨拶メッセージ（アプリレベルで一度だけ実行）
  useEffect(() => {
    if (appState.globalMessages.length === 0 && appState.selectedAiRole && (appState.currentScreen === 'chat' || appState.currentScreen === 'group-chat')) {
      if (appState.currentScreen === 'chat') {
        // 1:1チャット用挨拶
        const greeting: ChatMessage = {
          id: generateMessageId('app-greeting-chat'),
          text: AI_GREETINGS[appState.selectedAiRole][appState.currentMood],
          sender: 'ai',
          timestamp: Date.now(),
          aiRole: appState.selectedAiRole,
          mood: appState.currentMood
        };
        handleAddGlobalMessage(greeting);
      } else if (appState.currentScreen === 'group-chat') {
        // グループチャット用挨拶
        const greetingMessage: ChatMessage = {
          id: generateMessageId('app-greeting-group'),
          text: 'みなさん、こんにちは！グループチャットにようこそ。今日はどんなことがありましたか？',
          sender: 'ai',
          timestamp: Date.now(),
          aiRole: 'madoka',
          mood: appState.currentMood
        };
        handleAddGlobalMessage(greetingMessage);
      }
    }
  }, [appState.selectedAiRole, appState.currentScreen, appState.currentMood, appState.globalMessages.length]);

  const handleAuthSuccess = (userPlan?: UserPlan) => {
    setAppState(prev => ({
      ...prev,
      previousScreen: prev.currentScreen,
      currentScreen: 'character-selection',
      userPlan: userPlan || prev.userPlan
    }));

    // History APIに状態を保存
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: 'character-selection' }, '', '/#character-selection');
      
      // ページ上部にスクロール
      window.scrollTo(0, 0);
    }
  };

  const renderCurrentScreen = () => {
    switch (appState.currentScreen) {
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
            userPlan={appState.userPlan}
            userInfo={userInfo}
            isLoggedIn={isLoggedIn}
            onPlanChange={handlePlanChange}
            onPlanChangeRequest={handlePlanChangeRequest}
            onLogout={handleLogout}
            onNicknameChange={handleNicknameChange}
            onEmailChange={handleEmailChange}
          />
        );
      case 'chat':
        return (
          <ChatScreen 
            selectedAiRole={appState.selectedAiRole!}
            currentMood={appState.currentMood}
            onNavigate={handleNavigate}
            onAddCharacters={handleAddCharacters}
            onAddFruit={handleAddFruit}
            onAddChatHistory={handleAddChatHistory}
            totalCharacters={appState.totalCharacters}
            fruits={appState.fruits}
            userPlan={appState.userPlan}
            chatMode={appState.chatMode}
            chatHistory={appState.chatHistory}
            onChatModeChange={handleChatModeChange}
            globalMessages={appState.globalMessages}
            onAddGlobalMessage={handleAddGlobalMessage}
            onMoodChange={handleMoodChange}
            userInfo={userInfo}
            isLoggedIn={isLoggedIn}
            onPlanChange={handlePlanChange}
            onPlanChangeRequest={handlePlanChangeRequest}
            onLogout={handleLogout}
            onNicknameChange={handleNicknameChange}
            onEmailChange={handleEmailChange}
          />
        );
      case 'tree':
        return (
          <TreeView 
            totalCharacters={appState.totalCharacters}
            fruits={appState.fruits}
            onNavigate={handleNavigate}
            previousScreen={appState.previousScreen}
            userPlan={appState.userPlan}
            userInfo={userInfo}
            isLoggedIn={isLoggedIn}
            onPlanChange={handlePlanChange}
            onPlanChangeRequest={handlePlanChangeRequest}
            onLogout={handleLogout}
            onNicknameChange={handleNicknameChange}
            onEmailChange={handleEmailChange}
          />
        );
      case 'group-chat':
        return (
          <GroupChatScreen 
            currentMood={appState.currentMood}
            onNavigate={handleNavigate}
            onAddCharacters={handleAddCharacters}
            onAddFruit={handleAddFruit}
            onAddChatHistory={handleAddChatHistory}
            totalCharacters={appState.totalCharacters}
            fruits={appState.fruits}
            userPlan={appState.userPlan}
            chatMode={appState.chatMode}
            chatHistory={appState.chatHistory}
            onChatModeChange={handleChatModeChange}
            globalMessages={appState.globalMessages}
            onAddGlobalMessage={handleAddGlobalMessage}
            selectedAiRole={appState.selectedAiRole}
            onMoodChange={handleMoodChange}
            userInfo={userInfo}
            isLoggedIn={isLoggedIn}
            onPlanChange={handlePlanChange}
            onPlanChangeRequest={handlePlanChangeRequest}
            onLogout={handleLogout}
            onNicknameChange={handleNicknameChange}
            onEmailChange={handleEmailChange}
          />
        );
      case 'premium':
        return (
          <PremiumLandingPage 
            onNavigate={handleNavigate}
            onClose={() => handleNavigate(appState.previousScreen || 'landing')}
          />
        );
      case 'subscription-cancel':
        return (
          <SubscriptionCancelPage 
            onNavigate={handleNavigate}
            onClose={() => handleNavigate(appState.previousScreen || 'landing')}
            userInfo={userInfo}
            isLoggedIn={isLoggedIn}
            onPlanChange={handlePlanChange}
            onPlanChangeRequest={handlePlanChangeRequest}
            onLogout={handleLogout}
            onNicknameChange={handleNicknameChange}
            onEmailChange={handleEmailChange}
          />
        );
      case 'terms-of-service':
        return (
          <TermsOfServicePage 
            onNavigate={handleNavigate}
            onClose={() => handleNavigate(appState.previousScreen || 'landing')}
          />
        );
      case 'privacy-policy':
        return (
          <PrivacyPolicyPage 
            onNavigate={handleNavigate}
            onClose={() => handleNavigate(appState.previousScreen || 'landing')}
          />
        );
      case 'commercial-transaction':
        return (
          <CommercialTransactionPage 
            onNavigate={handleNavigate}
            onClose={() => handleNavigate(appState.previousScreen || 'landing')}
          />
        );
      case 'contact':
        return (
          <ContactFormPage 
            onNavigate={handleNavigate}
            onClose={() => handleNavigate(appState.previousScreen || 'landing')}
          />
        );
      case 'faq':
        return (
          <FAQPage 
            onNavigate={handleNavigate}
            onClose={() => handleNavigate(appState.previousScreen || 'landing')}
          />
        );
      default:
        return <TopPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderCurrentScreen()}
    </div>
  );
};

export default MainApp;