'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, User, Crown, Mail, HelpCircle } from 'lucide-react';
import { AppScreen, UserPlan, UserInfo } from '@/types';
import UserMenu from '../ui/UserMenu';
import NotificationBell from '../ui/NotificationBell';

interface NavigationStep {
  screen: AppScreen;
  label: string;
  icon?: React.ReactNode;
}

interface NavigationHeaderProps {
  currentScreen: AppScreen;
  title: string;
  subtitle?: string;
  onNavigate: (screen: AppScreen) => void;
  canGoBack?: boolean;
  previousScreen?: AppScreen | null;
  userPlan?: UserPlan;
  showBreadcrumb?: boolean;
  userInfo?: UserInfo;
  isLoggedIn?: boolean;
  onPlanChange?: (plan: UserPlan) => void;
  onPlanChangeRequest?: (plan: UserPlan) => void;
  onLogout?: () => void;
  onNicknameChange?: (nickname: string) => void;
  onEmailChange?: (email: string) => void;
}

const NavigationHeader = ({
  currentScreen,
  title,
  subtitle,
  onNavigate,
  canGoBack = true,
  previousScreen,
  userPlan,
  showBreadcrumb = true,
  userInfo,
  isLoggedIn = false,
  onPlanChange,
  onPlanChangeRequest,
  onLogout,
  onNicknameChange,
  onEmailChange
}: NavigationHeaderProps) => {
  
  // 画面の階層構造を定義
  const screenHierarchy: Record<AppScreen, { parent?: AppScreen; label: string; icon?: React.ReactNode }> = {
    'landing': { label: 'ホーム', icon: <Home className="w-4 h-4" /> },
    'auth': { parent: 'landing', label: 'ログイン' },
    'character-selection': { parent: 'auth', label: 'キャラクター選択', icon: <User className="w-4 h-4" /> },
    'chat': { parent: 'character-selection', label: 'チャット' },
    'group-chat': { parent: 'character-selection', label: 'グループチャット', icon: <Crown className="w-4 h-4" /> },
    'tree': { parent: 'chat', label: '成長の木' },
    'premium': { parent: 'landing', label: 'プレミアムプラン', icon: <Crown className="w-4 h-4" /> },
    'subscription-cancel': { parent: 'landing', label: 'プラン解約', icon: <Crown className="w-4 h-4" /> },
    'terms-of-service': { parent: 'landing', label: '利用規約' },
    'privacy-policy': { parent: 'landing', label: 'プライバシーポリシー' },
    'commercial-transaction': { parent: 'landing', label: '特定商取引法表記' },
    'notifications': { parent: 'landing', label: '通知' },
    'contact': { parent: 'landing', label: 'お問い合わせ', icon: <Mail className="w-4 h-4" /> },
    'faq': { parent: 'landing', label: 'よくある質問', icon: <HelpCircle className="w-4 h-4" /> },
    'user-onboarding': { parent: 'auth', label: 'ユーザー登録' },
    'dashboard': { parent: 'landing', label: 'ダッシュボード' },
    'billing': { parent: 'landing', label: '課金管理' },
    'account-settings': { parent: 'landing', label: 'アカウント設定' }
  };

  // パンくずナビゲーションの生成
  const generateBreadcrumb = (): NavigationStep[] => {
    const breadcrumb: NavigationStep[] = [];
    let current: AppScreen | undefined = currentScreen;
    
    while (current) {
      const screenInfo: { parent?: AppScreen; label: string; icon?: React.ReactNode } = screenHierarchy[current];
      if (screenInfo) {
        breadcrumb.unshift({
          screen: current,
          label: screenInfo.label,
          icon: screenInfo.icon
        });
        current = screenInfo.parent;
      } else {
        break;
      }
    }
    
    return breadcrumb;
  };

  const breadcrumb = generateBreadcrumb();

  // 戻る画面を決定
  const getBackScreen = (): AppScreen => {
    if (previousScreen) return previousScreen;
    const parentScreen = screenHierarchy[currentScreen]?.parent;
    return parentScreen || 'landing';
  };

  return (
    <motion.div 
      className="bg-white/95 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-40"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* メインヘッダー */}
        <div className="flex items-center justify-between">
          {/* 左側：戻るボタンとタイトル */}
          <div className="flex items-center space-x-3">
            {canGoBack && currentScreen !== 'landing' && (
              <motion.button
                onClick={() => onNavigate(getBackScreen())}
                className="p-2 rounded-xl hover:bg-emerald-50 transition-colors group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
              </motion.button>
            )}
            
            <div>
              <h1 className="text-xl font-bold text-emerald-800">{title}</h1>
              {subtitle && (
                <p className="text-sm text-emerald-600 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* 右側：ユーザーメニューとその他の要素 */}
          <div className="flex items-center space-x-2">
            {currentScreen !== 'landing' && (
              <motion.button
                onClick={() => onNavigate('landing')}
                className="p-2 rounded-xl hover:bg-emerald-50 transition-colors group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="ホームに戻る"
              >
                <Home className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700" />
              </motion.button>
            )}
            
            {/* 通知ベル（ログイン時のみ表示） */}
            {isLoggedIn && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 }}
              >
                <NotificationBell onNavigate={onNavigate} />
              </motion.div>
            )}
            
            {/* ユーザーメニュー（ログイン時のみ表示） */}
            {isLoggedIn && userInfo && onLogout && onNicknameChange && onEmailChange && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <UserMenu
                  userInfo={userInfo}
                  onPlanChange={onPlanChange}
                  onPlanChangeRequest={onPlanChangeRequest}
                  onLogout={onLogout}
                  onNicknameChange={onNicknameChange}
                  onEmailChange={onEmailChange}
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* パンくずナビゲーション */}
        {showBreadcrumb && breadcrumb.length > 1 && (
          <motion.nav 
            className="mt-3 pt-3 border-t border-emerald-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <ol className="flex items-center space-x-2 text-sm">
              {breadcrumb.map((step, index) => (
                <li key={step.screen} className="flex items-center">
                  {index > 0 && (
                    <span className="mx-2 text-emerald-300">/</span>
                  )}
                  
                  {index < breadcrumb.length - 1 ? (
                    <button
                      onClick={() => onNavigate(step.screen)}
                      className="flex items-center space-x-1 text-emerald-500 hover:text-emerald-700 transition-colors"
                    >
                      {step.icon}
                      <span>{step.label}</span>
                    </button>
                  ) : (
                    <span className="flex items-center space-x-1 text-emerald-800 font-medium">
                      {step.icon}
                      <span>{step.label}</span>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </motion.nav>
        )}
      </div>

      {/* プログレスバー（オプション） */}
      {currentScreen !== 'landing' && (
        <motion.div 
          className="h-0.5 bg-gradient-to-r from-emerald-500 to-green-400"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ transformOrigin: 'left' }}
        />
      )}
    </motion.div>
  );
};

export default NavigationHeader;