/**
 * 非同期操作管理Hook
 * ローディング状態とエラーハンドリングを統一管理
 */

import { useState, useCallback, useRef } from 'react';

export interface UseAsyncOperationOptions {
  initialLoading?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

export interface UseAsyncOperationReturn {
  isLoading: boolean;
  execute: <T>(
    operation: () => Promise<T>,
    onError?: (error: any) => T
  ) => Promise<T>;
  cancel: () => void;
}

export const useAsyncOperation = (
  options: UseAsyncOperationOptions = {}
): UseAsyncOperationReturn => {
  const [isLoading, setIsLoading] = useState(options.initialLoading || false);
  const cancelRef = useRef<boolean>(false);
  
  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    onError?: (error: any) => T
  ): Promise<T> => {
    if (isLoading) {
      throw new Error('Operation already in progress');
    }

    try {
      cancelRef.current = false;
      setIsLoading(true);
      
      const result = await operation();
      
      if (cancelRef.current) {
        throw new Error('Operation was cancelled');
      }
      
      options.onSuccess?.(result);
      return result;
      
    } catch (error) {
      if (cancelRef.current) {
        throw error;
      }
      
      options.onError?.(error);
      
      if (onError) {
        return onError(error);
      }
      
      throw error;
      
    } finally {
      if (!cancelRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading, options]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    execute,
    cancel
  };
};