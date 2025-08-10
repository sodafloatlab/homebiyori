'use client';

import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { TouchTarget } from './TouchTarget';

interface WarningButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

export function WarningButton({ 
  children, 
  onClick, 
  disabled = false, 
  loading = false,
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
  ...props
}: WarningButtonProps) {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const baseClasses = `
    inline-flex items-center justify-center rounded-lg font-semibold
    transition-all duration-200 min-h-[44px] min-w-[44px]
    bg-red-600 text-white border-2 border-red-600
    hover:bg-red-700 hover:border-red-700
    focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
    disabled:bg-red-400 disabled:border-red-400 disabled:cursor-not-allowed
    disabled:opacity-60 disabled:transform-none
    active:transform active:scale-95
  `;

  return (
    <TouchTarget
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeStyles[size]} ${className}`}
      aria-label={ariaLabel}
      role="button"
      tabIndex={0}
      {...props}
    >
      {loading && (
        <LoadingSpinner 
          size="sm" 
          className="mr-2" 
          color="white"
        />
      )}
      <span className={loading ? 'opacity-70' : ''}>{children}</span>
    </TouchTarget>
  );
}