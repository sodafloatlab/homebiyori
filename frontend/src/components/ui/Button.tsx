'use client';

import React from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationStart' | 'onAnimationEnd'> {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
  animated?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant,
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  animated = true,
  className = '',
  disabled,
  ...props
}, ref) => {
  
  // ベーススタイル
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // バリアント別スタイル
  const variantStyles = {
    primary: 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 focus:ring-emerald-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-white text-emerald-700 border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 focus:ring-emerald-500 shadow-sm hover:shadow-md',
    outline: 'bg-transparent text-emerald-600 border-2 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 focus:ring-emerald-500',
    ghost: 'bg-transparent text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500 shadow-lg hover:shadow-xl'
  };

  // サイズ別スタイル
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm min-h-[32px]',
    md: 'px-4 py-3 text-base min-h-[44px]',
    lg: 'px-6 py-4 text-lg min-h-[48px]',
    xl: 'px-8 py-5 text-xl min-h-[56px]'
  };

  // アイコンサイズ
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7'
  };

  const combinedClassName = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  const iconSize = iconSizes[size];
  const isDisabled = disabled || loading;

  const buttonContent = (
    <>
      {loading ? (
        <LoadingSpinner 
          size={size === 'sm' ? 'sm' : 'md'} 
          color={variant === 'primary' || variant === 'danger' ? 'white' : 'emerald'} 
        />
      ) : (
        <>
          {leftIcon && (
            <span className={`${iconSize} ${children ? 'mr-2' : ''}`}>
              {leftIcon}
            </span>
          )}
          {children && <span>{children}</span>}
          {rightIcon && (
            <span className={`${iconSize} ${children ? 'ml-2' : ''}`}>
              {rightIcon}
            </span>
          )}
        </>
      )}
    </>
  );

  if (animated && !isDisabled) {
    return (
      <motion.button
        ref={ref}
        className={combinedClassName}
        disabled={isDisabled}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        {...props}
      >
        {buttonContent}
      </motion.button>
    );
  }

  return (
    <button
      ref={ref}
      className={combinedClassName}
      disabled={isDisabled}
      {...props}
    >
      {buttonContent}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;