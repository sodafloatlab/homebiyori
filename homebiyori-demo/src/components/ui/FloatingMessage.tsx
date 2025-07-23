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
            x: position.x - 100, 
            y: position.y - 150 
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.8, 
            y: position.y - 200 
          }}
          transition={{ 
            duration: 0.6,
            ease: "easeOut"
          }}
          className="fixed z-50 pointer-events-none"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-6 max-w-80">
            {/* 吹き出しの矢印 */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="w-4 h-4 bg-white/95 border-b border-r border-white/30 transform rotate-45"></div>
            </div>
            
            {/* AIキャラクター表示 */}
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-yellow-400 flex items-center justify-center text-white text-sm font-bold mr-2">
                {aiRole.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{aiRole}</p>
                <p className="text-xs text-gray-500">{date}</p>
              </div>
            </div>
            
            {/* メッセージ */}
            <p className="text-sm text-gray-700 leading-relaxed">
              {message}
            </p>
            
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