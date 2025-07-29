'use client';

import { useState } from 'react';
import TopPage from './TopPage';
import CharacterSelection from './CharacterSelection';
import ChatScreen from './ChatScreen';
import TreeView from './TreeView';

export type AiRole = 'tama' | 'madoka' | 'hide';
export type MoodType = 'praise' | 'listen';
export type AppScreen = 'landing' | 'character-selection' | 'chat' | 'tree';

export interface Fruit {
  id: string;
  userMessage: string;
  aiResponse: string;
  aiRole: AiRole;
  createdAt: string;
  emotion: string;
}

interface AppState {
  currentScreen: AppScreen;
  selectedAiRole: AiRole | null;
  currentMood: MoodType;
  totalCharacters: number;
  fruits: Fruit[];
}

const MainApp = () => {
  const [appState, setAppState] = useState<AppState>({
    currentScreen: 'landing',
    selectedAiRole: null,
    currentMood: 'praise',
    totalCharacters: 0,
    fruits: []
  });

  const handleNavigate = (screen: AppScreen) => {
    setAppState(prev => ({ ...prev, currentScreen: screen }));
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

  const renderCurrentScreen = () => {
    switch (appState.currentScreen) {
      case 'landing':
        return <TopPage onNavigate={handleNavigate} />;
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
            totalCharacters={appState.totalCharacters}
            fruits={appState.fruits}
          />
        );
      case 'tree':
        return (
          <TreeView 
            totalCharacters={appState.totalCharacters}
            fruits={appState.fruits}
            onNavigate={handleNavigate}
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