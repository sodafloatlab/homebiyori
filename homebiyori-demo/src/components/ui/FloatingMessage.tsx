'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { getAIRoleStyle } from '@/lib/aiRoleStyles';

interface FloatingMessageProps {
  isVisible: boolean;
  message: string;
  aiRole: string;
  date: string;
  onClose: () => void;
  position: { x: number; y: number };
}

export default function FloatingMessage({ 
  isVisible, 
  message, 
  aiRole, 
  date, 
  onClose, 
  position 
}: FloatingMessageProps) {
  const roleStyle = getAIRoleStyle(aiRole);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // 4秒後に自動で閉じる
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  // メッセージボックスのサイズ（概算）
  const messageWidth = 320; // max-w-sm ≈ 384px、実際は少し小さめ
  const messageHeight = 200; // メッセージボックスの高さ（概算）

  // クリック位置の近くに表示するための位置計算
  const getAdjustedPosition = () => {
    if (typeof window === 'undefined') return { x: 50, y: 50 };
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 20;
    
    // クリック位置を基準に、上側に表示することを優先
    let targetX = position.x - (messageWidth / 2);
    let targetY = position.y - messageHeight - 40; // クリック位置の上に40px離して表示
    
    // 画面左右の境界チェック
    if (targetX < padding) {
      targetX = padding;
    } else if (targetX + messageWidth > viewportWidth - padding) {
      targetX = viewportWidth - messageWidth - padding;
    }
    
    // 画面上下の境界チェック
    if (targetY < padding) {
      // 上にはみ出る場合は、クリック位置の下に表示
      targetY = position.y + 40;
      // それでも下にはみ出る場合は、画面内に収める
      if (targetY + messageHeight > viewportHeight - padding) {
        targetY = viewportHeight - messageHeight - padding;
      }
    }
    
    return { x: targetX, y: targetY };
  };

  const adjustedPosition = getAdjustedPosition();
  

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ 
            opacity: 0, 
            scale: 0.7, 
            x: adjustedPosition.x, 
            y: adjustedPosition.y + 10
          }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            x: adjustedPosition.x, 
            y: adjustedPosition.y
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.9, 
            y: adjustedPosition.y - 10
          }}
          transition={{ 
            duration: 0.4,
            ease: "easeOut"
          }}
          className="fixed z-[100] pointer-events-none"
        >
          <div className="relative bg-gradient-to-br from-white/95 via-green-50/80 to-blue-50/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-green-200/70 p-6 max-w-sm overflow-hidden">
            {/* 水彩風背景装飾 */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2 right-3 w-12 h-12 bg-yellow-100/40 rounded-full blur-lg" />
              <div className="absolute bottom-3 left-2 w-8 h-8 bg-green-100/40 rounded-full blur-md" />
            </div>

            {/* 吹き出しの矢印（水彩風） */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10">
              <div className="w-4 h-4 bg-gradient-to-br from-white via-green-50/60 to-blue-50/40 border-b border-r border-green-200/50 transform rotate-45 backdrop-blur-sm"></div>
            </div>
            
            {/* AIキャラクター表示（静的） */}
            <div className="relative z-10 flex items-center mb-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleStyle.iconBg} flex items-center justify-center ${roleStyle.textColor} text-sm font-bold mr-3 shadow-lg border border-white/50`}>
                {roleStyle.displayName.charAt(0)}
              </div>
              <div>
                <p className={`text-sm font-semibold ${roleStyle.textColor}`}>{roleStyle.displayName}</p>
                <p className={`text-xs ${roleStyle.textColor.replace('800', '600')}/80`}>{date}</p>
              </div>
              <div className="ml-auto text-yellow-500 text-lg">
                ✨
              </div>
            </div>
            
            {/* メッセージ（水彩風カード） */}
            <div className="relative z-10 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-inner">
              <p className={`text-sm ${roleStyle.textColor} leading-relaxed font-medium`}>
                {message}
              </p>
            </div>

            {/* 小さなシャボン玉装飾 */}
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  left: `${20 + i * 25}%`,
                  top: `${15 + i * 20}%`
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full border border-white/40"
                  style={{
                    background: roleStyle.gradientStyle,
                  }}
                />
              </div>
            ))}
            
            {/* キラキラ効果 */}
            <div className="absolute -top-2 -right-2 text-yellow-400 text-lg">
              ✨
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}