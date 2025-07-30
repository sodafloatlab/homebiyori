'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TypographyProps {
  variant: 'hero' | 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'small';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
}

const Typography = ({
  variant,
  color = 'neutral',
  weight = 'normal',
  align = 'left',
  children,
  className = '',
  animated = false
}: TypographyProps) => {
  
  // タイポグラフィのスタイル定義
  const variantStyles = {
    hero: 'text-4xl md:text-6xl lg:text-7xl leading-tight',
    h1: 'text-3xl md:text-4xl lg:text-5xl leading-tight font-bold',
    h2: 'text-2xl md:text-3xl lg:text-4xl leading-tight font-bold',
    h3: 'text-xl md:text-2xl lg:text-3xl leading-tight font-semibold',
    h4: 'text-lg md:text-xl lg:text-2xl leading-tight font-semibold',
    body: 'text-base md:text-lg leading-relaxed',
    caption: 'text-sm md:text-base leading-relaxed',
    small: 'text-xs md:text-sm leading-normal'
  };

  // カラーパレット定義
  const colorStyles = {
    primary: 'text-emerald-800',
    secondary: 'text-emerald-600',
    success: 'text-green-700',
    warning: 'text-amber-700',
    error: 'text-red-700',
    neutral: 'text-gray-800'
  };

  // フォントウェイト定義
  const weightStyles = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };

  // テキストアライメント定義
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  // HTMLタグを決定
  const getTag = () => {
    switch (variant) {
      case 'hero':
      case 'h1':
        return 'h1';
      case 'h2':
        return 'h2';
      case 'h3':
        return 'h3';
      case 'h4':
        return 'h4';
      case 'body':
      case 'caption':
        return 'p';
      case 'small':
        return 'span';
      default:
        return 'p';
    }
  };

  const Tag = getTag() as React.ElementType;
  
  const combinedClassName = `
    ${variantStyles[variant]}
    ${colorStyles[color]}
    ${weightStyles[weight]}
    ${alignStyles[align]}
    ${className}
  `.trim();

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Tag className={combinedClassName}>
          {children}
        </Tag>
      </motion.div>
    );
  }

  return (
    <Tag className={combinedClassName}>
      {children}
    </Tag>
  );
};

export default Typography;