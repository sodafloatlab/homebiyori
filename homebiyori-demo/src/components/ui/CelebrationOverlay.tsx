'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface CelebrationOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function CelebrationOverlay({ isVisible, onClose }: CelebrationOverlayProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // 3秒後に自動で閉じる
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm text-center"
          >
            {/* 拍手アニメーション */}
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -5, 5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 1,
                repeat: 2,
                ease: "easeInOut"
              }}
              className="text-6xl mb-4"
            >
              👏
            </motion.div>
            
            {/* メッセージ */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-bold text-gray-800 mb-2"
            >
              ✨ 投稿ありがとうございます ✨
            </motion.h2>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-600 text-sm"
            >
              あなたの一歩、<br />大事に受け取りました。
            </motion.p>
            
            {/* キラキラパーティクル */}
            {Array.from({ length: 6 }, (_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  scale: 0,
                  x: 0,
                  y: 0
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 200
                }}
                transition={{ 
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut"
                }}
                className="absolute text-yellow-400 text-lg pointer-events-none"
                style={{
                  left: '50%',
                  top: '50%'
                }}
              >
                ✨
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}