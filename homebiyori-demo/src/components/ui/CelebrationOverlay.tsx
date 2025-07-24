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
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-blue-900/20 via-green-900/30 to-yellow-900/20 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative bg-gradient-to-br from-white via-green-50/50 to-blue-50/50 rounded-3xl shadow-2xl p-10 mx-4 max-w-lg text-center border border-green-200/50 backdrop-blur-sm overflow-hidden"
          >
            {/* 水彩風背景装飾 */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-8 right-10 w-28 h-28 bg-yellow-100/40 rounded-full blur-2xl" />
              <div className="absolute bottom-10 left-8 w-24 h-24 bg-green-100/40 rounded-full blur-xl" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-blue-100/20 rounded-full blur-3xl" />
            </div>

            {/* 感謝のシンボル（シンプル） */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative z-10 text-7xl mb-6 drop-shadow-sm"
            >
              🌸
            </motion.div>
            
            {/* メッセージ（水彩風） */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="relative z-10 mb-6"
            >
              <h2 className="text-2xl font-bold text-green-800 mb-3 drop-shadow-sm">
                ✨ 素敵な投稿をありがとう ✨
              </h2>
              
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-inner">
                <p className="text-green-700 text-base font-medium leading-relaxed">
                  あなたの一歩一歩が<br />
                  木を美しく成長させています
                </p>
              </div>
            </motion.div>
            
            {/* シャボン玉のような祝福エフェクト */}
            {Array.from({ length: 12 }, (_, i) => (
              <motion.div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  left: '50%',
                  top: '50%'
                }}
                initial={{ 
                  opacity: 0,
                  scale: 0,
                  x: 0,
                  y: 0
                }}
                animate={{ 
                  opacity: [0, 0.8, 0],
                  scale: [0, 1, 0.5],
                  x: (Math.random() - 0.5) * 300,
                  y: (Math.random() - 0.5) * 300,
                  rotate: Math.random() * 360
                }}
                transition={{ 
                  duration: 3 + Math.random(),
                  delay: Math.random() * 1.5,
                  ease: "easeOut"
                }}
              >
                {i % 3 === 0 ? (
                  // シャボン玉
                  <div 
                    className="w-4 h-4 rounded-full border border-white/50"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, 
                        rgba(255, 255, 255, 0.9) 0%, 
                        rgba(187, 247, 208, 0.4) 40%, 
                        rgba(134, 239, 172, 0.7) 100%)`,
                    }}
                  />
                ) : i % 3 === 1 ? (
                  // 花びら
                  <div className="text-pink-300 text-lg">🌸</div>
                ) : (
                  // キラキラ
                  <div className="text-yellow-400 text-sm">✨</div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}