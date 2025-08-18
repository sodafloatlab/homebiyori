/**
 * Navigation Bar Component - Issue #15 新戦略対応版
 * 
 * ■機能概要■
 * - アプリケーション内ナビゲーション
 * - 認証状態表示
 * - トライアル期間表示
 */

'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useBilling } from '@/lib/hooks';

interface NavigationBarProps {
  showAuth?: boolean;
}

export function NavigationBar({ showAuth = true }: NavigationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isTrialUser, 
    isPremiumUser, 
    daysRemaining,
    isTrialActive 
  } = useBilling();

  const navigationItems = [
    { path: '/dashboard', label: 'ダッシュボード', icon: '🏠' },
    { path: '/chat', label: 'チャット', icon: '💬' },
    { path: '/tree', label: '成長の木', icon: '🌳' },
    { path: '/billing', label: '課金管理', icon: '💳' },
  ];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleSignOut = () => {
    // TODO: サインアウト処理実装
    console.log('Sign out');
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => handleNavigation('/dashboard')}
          >
            <div className="text-2xl">🌱</div>
            <h1 className="text-xl font-bold text-gray-900">ほめびより</h1>
          </div>

          {/* メインナビゲーション */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`
                  flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${pathname === item.path 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* 右側メニュー */}
          {showAuth && (
            <div className="flex items-center space-x-4">
              {/* プラン表示 */}
              {isTrialUser && isTrialActive && (
                <div className="hidden sm:flex items-center space-x-2">
                  <Badge variant="warning" size="sm">
                    トライアル
                  </Badge>
                  <span className="text-sm text-gray-600">
                    残り{daysRemaining}日
                  </span>
                </div>
              )}
              
              {isPremiumUser && (
                <Badge variant="success" size="sm">
                  プレミアム
                </Badge>
              )}

              {/* アクションボタン */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNavigation('/billing')}
                  className="hidden sm:flex"
                >
                  課金管理
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                >
                  ログアウト
                </Button>
              </div>
            </div>
          )}

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: モバイルメニュー表示
                console.log('Toggle mobile menu');
              }}
            >
              ☰
            </Button>
          </div>
        </div>
      </div>

      {/* トライアル期間警告バー */}
      {isTrialUser && isTrialActive && daysRemaining <= 3 && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="max-w-6xl mx-auto px-6 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span>⚠️</span>
                <span>
                  トライアル期間が残り{daysRemaining}日です。継続利用にはアップグレードが必要です。
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                onClick={() => handleNavigation('/billing/subscribe')}
              >
                アップグレード
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}