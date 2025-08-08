// ========================================
// Core Types (Demo互換 + バックエンド統合)
// ========================================

export type AiRole = 'tama' | 'madoka' | 'hide';
export type MoodType = 'praise' | 'listen';
export type AppScreen = 'landing' | 'auth' | 'character-selection' | 'chat' | 'tree' | 'group-chat' | 'premium' | 'subscription-cancel' | 'terms-of-service' | 'privacy-policy' | 'commercial-transaction' | 'contact' | 'faq';
export type UserPlan = 'free' | 'premium';
export type ChatMode = 'normal' | 'deep';

// ========================================
// API Integration Types (バックエンド統合)
// ========================================

// バックエンドのAICharacter enumと統合
export type AICharacter = 'tama' | 'madoka' | 'hide';

// バックエンドのPraiseLevelと統合
export type PraiseLevel = 'normal' | 'deep';

// API レスポンス共通型
export interface APIResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  status: 'success' | 'error';
}

// Cognito認証情報
export interface AuthUser {
  userId: string;
  email?: string;
  nickname?: string;
  accessToken: string;
  refreshToken?: string;
}

// ========================================
// Chat Types (Demo互換)
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
// User Types (バックエンド統合拡張)
// ========================================

export interface UserInfo {
  email: string;
  nickname: string;
  avatar?: string;
  plan: UserPlan;
}

// バックエンドUserProfileモデルと連携
export interface UserProfile {
  user_id: string;
  nickname?: string;
  ai_character: AICharacter;
  praise_level: PraiseLevel;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdate {
  nickname?: string;
  onboarding_completed?: boolean;
}

export interface AIPreferences {
  ai_character: AICharacter;
  praise_level: PraiseLevel;
}

// ========================================
// Tree & Fruit Types (バックエンド統合拡張)
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

// バックエンドtree_serviceと連携
export interface TreeStatus {
  tree_id: string;
  user_id: string;
  level: number;
  experience: number;
  theme_color: string;
  created_at: string;
  updated_at: string;
}

// ========================================
// Navigation Types (Demo互換)
// ========================================

export interface BasePageProps {
  onNavigate: (screen: AppScreen) => void;
  onClose: () => void;
}

export interface NavigationProps {
  onNavigate: (screen: AppScreen) => void;
}

// ========================================
// App State Types (Zustand対応)
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

// Zustand stores interface
export interface AuthState {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ChatState {
  messages: ChatMessage[];
  history: ChatHistory[];
  isLoading: boolean;
  error: string | null;
}

export interface TreeState {
  status: TreeStatus | null;
  fruits: Fruit[];
  isLoading: boolean;
  error: string | null;
}

// ========================================
// Component Props (Demo互換)
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
  // ユーザー情報関連
  userInfo?: UserInfo;
  isLoggedIn?: boolean;
  onPlanChange?: (plan: UserPlan) => void;
  onPlanChangeRequest?: (plan: UserPlan) => void;
  onLogout?: () => void;
  onNicknameChange?: (nickname: string) => void;
  onEmailChange?: (email: string) => void;
}

export interface ChatScreenProps extends BaseChatProps {
  selectedAiRole: AiRole;
  currentMood: MoodType;
}

export interface GroupChatScreenProps extends BaseChatProps {
  currentMood: MoodType;
  selectedAiRole: AiRole | null;
}

// ========================================
// API Request/Response Types
// ========================================

export interface ChatRequest {
  message: string;
  ai_character: AICharacter;
  praise_level: PraiseLevel;
}

export interface ChatResponse {
  response: string;
  emotion: string;
  character_used: AICharacter;
  praise_level_used: PraiseLevel;
}

export interface MaintenanceInfo {
  is_maintenance_mode: boolean;
  maintenance_message?: string;
  estimated_recovery_time?: string;
  affected_services?: string[];
}