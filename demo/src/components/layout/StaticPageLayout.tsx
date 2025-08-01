'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import NavigationHeader from './NavigationHeader';
import Footer from './Footer';
import { BasePageProps, AppScreen } from '@/types';

interface StaticPageLayoutProps extends BasePageProps {
  title: string;
  subtitle?: string;
  currentScreen: AppScreen;
  previousScreen?: AppScreen;
  icon?: LucideIcon;
  children: React.ReactNode;
  showBackButton?: boolean;
  showFooter?: boolean;
}

const StaticPageLayout = ({ 
  title,
  subtitle,
  currentScreen,
  previousScreen = 'landing',
  icon: Icon,
  children,
  showBackButton = true,
  showFooter = true,
  onNavigate,
  onClose
}: StaticPageLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      <NavigationHeader
        currentScreen={currentScreen}
        title={title}
        subtitle={subtitle}
        onNavigate={onNavigate}
        previousScreen={previousScreen}
      />

      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダーアイコン */}
        {Icon && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-800 mb-2">
              {title}
            </h2>
            {subtitle && (
              <p className="text-emerald-600 text-sm">
                {subtitle}
              </p>
            )}
          </motion.div>
        )}

        {/* メインコンテンツ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          {children}
        </motion.div>

        {/* 戻るボタン */}
        {showBackButton && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <button
              onClick={onClose}
              className="inline-flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>前のページに戻る</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* フッター */}
      {showFooter && <Footer onNavigate={onNavigate} />}
    </div>
  );
};

export default StaticPageLayout;