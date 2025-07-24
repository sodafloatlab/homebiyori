'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

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
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // 4秒後に自動で閉じる
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ 
            opacity: 0, 
            scale: 0.5, 
            x: position.x, 
            y: position.y 
          }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            x: position.x - 120, 
            y: position.y - 180
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.6, 
            y: position.y - 220
          }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut"
          }}
          className="fixed z-50 pointer-events-none"
        >
          <div className="relative bg-gradient-to-br from-white via-green-50/60 to-blue-50/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-green-200/50 p-6 max-w-sm overflow-hidden">
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-200 via-blue-200 to-yellow-200 flex items-center justify-center text-green-800 text-sm font-bold mr-3 shadow-lg border border-white/50">
                {aiRole.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">{aiRole}</p>
                <p className="text-xs text-green-600/80">{date}</p>
              </div>
              <div className="ml-auto text-yellow-500 text-lg">
                ✨
              </div>
            </div>
            
            {/* メッセージ（水彩風カード） */}
            <div className="relative z-10 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-white/40 shadow-inner">
              <p className="text-sm text-green-800 leading-relaxed font-medium">
                {message}
              </p>
            </div>

            {/* 小さなシャボン玉装飾 */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  left: `${20 + i * 25}%`,
                  top: `${15 + i * 20}%`
                }}
                animate={{ 
                  y: [-5, -10, -5],
                  opacity: [0.3, 0.7, 0.3],
                  scale: [0.8, 1, 0.8]
                }}
                transition={{ 
                  duration: 3 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full border border-white/40"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, 
                      rgba(255, 255, 255, 0.8) 0%, 
                      rgba(187, 247, 208, 0.3) 40%, 
                      rgba(134, 239, 172, 0.6) 100%)`,
                  }}
                />
              </motion.div>
            ))}
            
            {/* キラキラ効果 */}
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
              }}
              className="absolute -top-2 -right-2 text-yellow-400 text-lg"
            >
              ✨
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}