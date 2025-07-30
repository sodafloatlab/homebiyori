'use client';

import { useState } from 'react';
import TopPage from './TopPage';
import AuthScreen from './AuthScreen';
import CharacterSelection from './CharacterSelection';
import ChatScreen from './ChatScreen';
import TreeView from './TreeView';
import GroupChatScreen from './GroupChatScreen';

export type AiRole = 'tama' | 'madoka' | 'hide';
export type MoodType = 'praise' | 'listen';
export type AppScreen = 'landing' | 'auth' | 'character-selection' | 'chat' | 'tree' | 'group-chat';
export type UserPlan = 'free' | 'premium';
export type ChatMode = 'normal' | 'deep';

export interface Fruit {
  id: string;
  userMessage: string;
  aiResponse: string;
  aiRole: AiRole;
  createdAt: string;
  emotion: string;
}

export interface ChatHistory {
  id: string;
  userMessage: string;
  aiResponse: string;
  aiRole: AiRole;
  timestamp: number;
  mode: ChatMode;
}

interface AppState {
  currentScreen: AppScreen;
  previousScreen: AppScreen | null;
  selectedAiRole: AiRole | null;
  currentMood: MoodType;
  totalCharacters: number;
  fruits: Fruit[];
  userPlan: UserPlan;
  chatMode: ChatMode;
  chatHistory: ChatHistory[];
}

const MainApp = () => {
  const [appState, setAppState] = useState<AppState>({
    currentScreen: 'landing',
    previousScreen: null,
    selectedAiRole: null,
    currentMood: 'praise',
    totalCharacters: 0,
    fruits: [],
    userPlan: 'premium', // デモ用にプレミアムプランを設定
    chatMode: 'normal',
    chatHistory: []
  });

  const handleNavigate = (screen: AppScreen) => {
    setAppState(prev => ({ 
      ...prev, 
      previousScreen: prev.currentScreen,
      currentScreen: screen 
    }));
  };

  const handleCharacterSelect = (role: AiRole, mood: MoodType) => {
    setAppState(prev => ({
      ...prev,
      selectedAiRole: role,
      currentMood: mood,
      currentScreen: 'chat'
    }));
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

  const handleAuthSuccess = () => {
    setAppState(prev => ({
      ...prev,
      currentScreen: 'character-selection'
    }));
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
          />
        );
      case 'tree':
        return (
          <TreeView 
            totalCharacters={appState.totalCharacters}
            fruits={appState.fruits}
            onNavigate={handleNavigate}
            previousScreen={appState.previousScreen}
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