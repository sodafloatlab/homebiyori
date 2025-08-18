'use client';

import React from 'react';
import Button from './Button';
import { WarningButton } from './WarningButton';
import LoadingSpinner from './LoadingSpinner';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: 'warning' | 'danger' | 'info';
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  onConfirm,
  onCancel,
  loading = false,
  variant = 'warning'
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const iconMap = {
    warning: '⚠️',
    danger: '🚨',
    info: 'ℹ️'
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-modal="true"
      role="dialog"
      aria-labelledby="dialog-title"
    >
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <span className="text-2xl" role="img" aria-label={variant}>
              {iconMap[variant]}
            </span>
          </div>

          {/* Title */}
          <h3 
            id="dialog-title"
            className="text-lg font-semibold leading-6 text-gray-900 dark:text-white text-center mb-4"
          >
            {title}
          </h3>

          {/* Message */}
          <div className="text-sm text-gray-600 dark:text-gray-300 text-center mb-6">
            {message}
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={onCancel}
              disabled={loading}
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
            >
              {cancelText}
            </Button>
            
            <WarningButton
              onClick={onConfirm}
              disabled={loading}
              loading={loading}
              size="md"
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" color="white" />
                  処理中...
                </>
              ) : (
                confirmText
              )}
            </WarningButton>
          </div>
        </div>
      </div>
    </div>
  );
}