'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animated?: boolean;
  touchOptimized?: boolean;
}

const ResponsiveContainer = ({
  children,
  maxWidth = 'lg',
  padding = 'md',
  className = '',
  animated = false,
  touchOptimized = true
}: ResponsiveContainerProps) => {
  
  // 最大幅の設定
  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-full'
  };

  // パディングの設定（モバイルファーストで responsive）
  const paddingStyles = {
    none: '',
    sm: 'px-3 py-2 sm:px-4 sm:py-3',
    md: 'px-4 py-4 sm:px-6 sm:py-6',
    lg: 'px-6 py-6 sm:px-8 sm:py-8',
    xl: 'px-8 py-8 sm:px-12 sm:py-12'
  };

  // タッチ最適化スタイル
  const touchStyles = touchOptimized ? 'touch-manipulation' : '';

  const combinedClassName = `
    ${maxWidthStyles[maxWidth]}
    ${paddingStyles[padding]}
    ${touchStyles}
    mx-auto
    w-full
    ${className}
  `.trim();

  if (animated) {
    return (
      <motion.div
        className={combinedClassName}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={combinedClassName}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;