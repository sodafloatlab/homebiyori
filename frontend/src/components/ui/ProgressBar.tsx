'use client';

import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  animated?: boolean;
  color?: 'blue' | 'green' | 'red' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ 
  progress, 
  animated = false, 
  color = 'blue',
  size = 'md',
  className = '',
  label,
  showPercentage = false
}: ProgressBarProps) {
  // プログレス値を0-100の範囲に制限
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  const sizeStyles = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6'
  };

  const colorStyles = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600'
  };

  const animationClass = animated ? 'transition-all duration-300 ease-in-out' : '';

  return (
    <div className={`w-full ${className}`} role="progressbar" aria-valuenow={clampedProgress} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {showPercentage && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeStyles[size]}`}>
        <div 
          className={`${colorStyles[color]} ${sizeStyles[size]} rounded-full ${animationClass}`}
          style={{ width: `${clampedProgress}%` }}
        >
          {animated && (
            <div className="h-full bg-white opacity-20 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}