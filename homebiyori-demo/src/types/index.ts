// ========================================
// Core Types
// ========================================

export type AiRole = 'tama' | 'madoka' | 'hide';
export type MoodType = 'praise' | 'listen';
export type AppScreen = 'landing' | 'auth' | 'character-selection' | 'chat' | 'tree' | 'group-chat' | 'premium' | 'terms-of-service' | 'privacy-policy' | 'commercial-transaction' | 'contact' | 'faq';
export type UserPlan = 'free' | 'premium';
export type ChatMode = 'normal' | 'deep';

// ========================================
// Chat Types
// ========================================

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: number;
  aiRole?: AiRole;
  mood?: MoodType;
  emotion?: string;
  systemType?: 'join' | 'leave' | 'mode-change' | 'info';
}

export interface ChatHistory {
  id: string;
  userMessage: string;
  aiResponse: string;
  aiRole: AiRole;
  timestamp: number;
  mode: ChatMode;
}

// ========================================
// Character & Tree Types
// ========================================

export interface CharacterInfo {
  name: string;
  image: string;
  color: 'rose' | 'sky' | 'amber';
}

export interface Fruit {
  id: string;
  userMessage: string;
  aiResponse: string;
  aiRole: AiRole;
  createdAt: string;
  emotion: string;
}

// ========================================
// Navigation Types
// ========================================

export interface BasePageProps {
  onNavigate: (screen: AppScreen) => void;
  onClose: () => void;
}

export interface NavigationProps {
  onNavigate: (screen: AppScreen) => void;
}

// ========================================
// App State Types
// ========================================

export interface AppState {
  currentScreen: AppScreen;
  previousScreen: AppScreen | null;
  selectedAiRole: AiRole | null;
  currentMood: MoodType;
  totalCharacters: number;
  fruits: Fruit[];
  userPlan: UserPlan;
  chatMode: ChatMode;
  chatHistory: ChatHistory[];
  globalMessages: ChatMessage[];
}

// ========================================
// Chat Screen Props
// ========================================

export interface BaseChatProps {
  onNavigate: (screen: AppScreen) => void;
  onAddCharacters: (count: number) => void;
  onAddFruit: (userMessage: string, aiResponse: string, emotion: string) => void;
  onAddChatHistory: (userMessage: string, aiResponse: string, aiRole: AiRole) => void;
  totalCharacters: number;
  fruits: Fruit[];
  userPlan: UserPlan;
  chatMode: ChatMode;
  chatHistory: ChatHistory[];
  onChatModeChange: (mode: ChatMode) => void;
  globalMessages: ChatMessage[];
  onAddGlobalMessage: (message: ChatMessage) => void;
  onMoodChange?: (mood: MoodType) => void;
}

export interface ChatScreenProps extends BaseChatProps {
  selectedAiRole: AiRole;
  currentMood: MoodType;
}

export interface GroupChatScreenProps extends BaseChatProps {
  currentMood: MoodType;
  selectedAiRole: AiRole | null;
}