/**
 * エラーハンドリング統一Hook
 * アプリケーション全体のエラー処理を統一
 */

import { useCallback } from 'react';
import { getErrorMessage, extractApiErrorMessage } from '@/lib/utils';

export interface UseErrorHandlerOptions {
  logErrors?: boolean;
  showToasts?: boolean;
  reportErrors?: boolean;
}

export interface UseErrorHandlerReturn {
  handleError: (error: any, defaultMessage?: string) => string;
  handleApiError: (error: any, defaultMessage?: string) => string;
  reportError: (error: any, context?: string) => void;
}

export const useErrorHandler = (
  options: UseErrorHandlerOptions = {}
): UseErrorHandlerReturn => {
  const {
    logErrors = true,
    showToasts = false,
    reportErrors = false
  } = options;

  const reportError = useCallback((error: any, context?: string) => {
    if (logErrors) {
      console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    }

    if (reportErrors) {
      // TODO: 外部エラー報告サービス(Sentry等)との連携
      // errorReportingService.report(error, context);
    }
  }, [logErrors, reportErrors]);

  const handleError = useCallback((
    error: any, 
    defaultMessage = '予期しないエラーが発生しました'
  ): string => {
    const errorMessage = getErrorMessage(error) || defaultMessage;
    
    reportError(error, 'General Error Handler');
    
    if (showToasts) {
      // TODO: Toast表示との連携
      // showErrorToast(errorMessage);
    }
    
    return errorMessage;
  }, [reportError, showToasts]);

  const handleApiError = useCallback((
    error: any,
    defaultMessage = 'サーバーとの通信でエラーが発生しました'
  ): string => {
    const errorMessage = extractApiErrorMessage(error) || defaultMessage;
    
    reportError(error, 'API Error Handler');
    
    if (showToasts) {
      // TODO: Toast表示との連携
      // showErrorToast(errorMessage);
    }
    
    return errorMessage;
  }, [reportError, showToasts]);

  return {
    handleError,
    handleApiError,
    reportError
  };
};