'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Headphones } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import TouchTarget from '@/components/ui/TouchTarget';
import Toast from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { UserService } from '@/lib/services/userService';
import { MoodType } from '@/types';

interface InteractionModeToggleProps {
  currentMode: MoodType;
  onModeChange: (mode: MoodType) => void;
  disabled?: boolean;
  className?: string;
}

const InteractionModeToggle = ({
  currentMode,
  onModeChange,
  disabled = false,
  className = ''
}: InteractionModeToggleProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }>({
    type: 'success',
    title: '',
    message: ''
  });

  const handleModeChange = async (newMode: MoodType) => {
    if (isLoading || disabled || newMode === currentMode) return;

    setIsLoading(true);

    try {
      // AI設定更新（プロフィールに統合）
      await UserService.updateAIPreferences({ interaction_mode: newMode });
      
      // 成功時のローカル状態更新
      onModeChange(newMode);
      
      setToastMessage({
        type: 'success',
        title: '設定を更新しました',
        message: `対話モードを「${newMode === 'praise' ? 'ほめほめ' : '聞いて'}」に変更しました`
      });
      setShowToast(true);

    } catch (error) {
      console.error('Failed to update interaction mode:', error);
      setToastMessage({
        type: 'error',
        title: '更新に失敗しました',
        message: '対話モードの変更に失敗しました。再度お試しください。'
      });
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20 ${className}`}>
      <Typography variant="h4" color="primary" className="mb-4 flex items-center">
        <MessageSquare className="w-5 h-5 mr-2" />
        対話モード
      </Typography>
      
      <div className="grid grid-cols-2 gap-3">
        {/* ほめほめモード */}
        <TouchTarget
          onClick={() => handleModeChange('praise')}
          disabled={isLoading || disabled}
          className={`p-4 rounded-xl border-2 text-center transition-all duration-200 relative ${
            currentMode === 'praise'
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {currentMode === 'praise' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 rounded-full"
            />
          )}
          
          <div className="flex flex-col items-center space-y-2">
            <MessageSquare className={`w-6 h-6 ${
              currentMode === 'praise' ? 'text-emerald-600' : 'text-gray-500'
            }`} />
            <div>
              <div className="font-semibold text-sm">ほめほめ</div>
              <div className="text-xs opacity-75 leading-tight">
                がんばりを<br />褒めてもらう
              </div>
            </div>
          </div>
        </TouchTarget>

        {/* 聞いてモード */}
        <TouchTarget
          onClick={() => handleModeChange('listen')}
          disabled={isLoading || disabled}
          className={`p-4 rounded-xl border-2 text-center transition-all duration-200 relative ${
            currentMode === 'listen'
              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {currentMode === 'listen' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"
            />
          )}
          
          <div className="flex flex-col items-center space-y-2">
            <Headphones className={`w-6 h-6 ${
              currentMode === 'listen' ? 'text-blue-600' : 'text-gray-500'
            }`} />
            <div>
              <div className="font-semibold text-sm">聞いて</div>
              <div className="text-xs opacity-75 leading-tight">
                気持ちを<br />聞いてもらう
              </div>
            </div>
          </div>
        </TouchTarget>
      </div>

      {/* 現在のモード説明 */}
      <div className="mt-4 p-3 rounded-lg bg-gray-50">
        <Typography variant="small" color="secondary" className="text-center">
          {currentMode === 'praise' ? (
            <>
              <span className="text-emerald-600 font-medium">ほめほめモード</span>では、
              育児の頑張りを積極的に褒めてくれます
            </>
          ) : (
            <>
              <span className="text-blue-600 font-medium">聞いてモード</span>では、
              あなたの気持ちに寄り添って聞いてくれます
            </>
          )}
        </Typography>
      </div>

      {/* ローディング表示 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            <Typography variant="small" color="secondary">
              設定を更新中...
            </Typography>
          </div>
        </div>
      )}

      {/* トースト通知 */}
      <Toast
        type={toastMessage.type}
        title={toastMessage.title}
        message={toastMessage.message}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        position="bottom-center"
      />
    </div>
  );
};

export default InteractionModeToggle;