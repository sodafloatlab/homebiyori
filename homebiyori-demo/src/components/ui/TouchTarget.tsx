'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TouchTargetProps {
  children: React.ReactNode;
  minSize?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'card' | 'item';
  className?: string;
  onClick?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  disabled?: boolean;
  animated?: boolean;
  hapticFeedback?: boolean;
}

const TouchTarget = ({
  children,
  minSize = 'md',
  variant = 'button',
  className = '',
  onClick,
  onTouchStart,
  onTouchEnd,
  disabled = false,
  animated = true,
  hapticFeedback = true
}: TouchTargetProps) => {
  
  // 最小タッチサイズ（44px以上を推奨）
  const minSizeStyles = {
    sm: 'min-h-[40px] min-w-[40px]',
    md: 'min-h-[44px] min-w-[44px]',
    lg: 'min-h-[48px] min-w-[48px]'
  };

  // バリアント別スタイル
  const variantStyles = {
    button: 'cursor-pointer select-none rounded-xl transition-all duration-200',
    card: 'cursor-pointer select-none rounded-2xl transition-all duration-300',
    item: 'cursor-pointer select-none transition-all duration-200'
  };

  // ベーススタイル
  const baseStyles = `
    ${minSizeStyles[minSize]}
    ${variantStyles[variant]}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
    touch-manipulation
    active:transform
    active:scale-95
  `.trim();

  // ハプティックフィードバック（Web Vibration API）
  const triggerHapticFeedback = () => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // 10ms の軽い振動
    }
  };

  const handleTouchStart = () => {
    if (!disabled) {
      triggerHapticFeedback();
      onTouchStart?.();
    }
  };

  const handleTouchEnd = () => {
    if (!disabled) {
      onTouchEnd?.();
    }
  };

  const handleClick = () => {
    if (!disabled) {
      onClick?.();
    }
  };

  if (animated && !disabled) {
    return (
      <motion.div
        className={baseStyles}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        transition={{ 
          duration: 0.1,
          ease: "easeInOut"
        }}
        // アクセシビリティ
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={baseStyles}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {children}
    </div>
  );
};

export default TouchTarget;