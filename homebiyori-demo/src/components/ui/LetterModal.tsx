'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface LetterModalProps {
  isVisible: boolean;
  message: string;
  aiRole: string;
  onClose: () => void;
}

export default function LetterModal({ isVisible, message, aiRole, onClose }: LetterModalProps) {
  const [isOpened, setIsOpened] = useState(false);

  const handleEnvelopeClick = () => {
    setIsOpened(true);
  };

  const handleClose = () => {
    setIsOpened(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={!isOpened ? undefined : handleClose}
        >
          <div className="relative">
            {/* 封筒（未開封時） */}
            <AnimatePresence>
              {!isOpened && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="cursor-pointer"
                  onClick={handleEnvelopeClick}
                >
                  {/* 封筒の背景 */}
                  <div className="w-80 h-52 bg-yellow-100 rounded-lg shadow-2xl border-4 border-yellow-200 p-4 relative overflow-hidden">
                    {/* 封筒のフラップ */}
                    <motion.div
                      animate={{ 
                        rotateX: [0, -5, 0],
                        scale: [1, 1.02, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute top-0 left-0 right-0 h-16 bg-yellow-200 rounded-t-lg border-b-2 border-yellow-300"
                    />
                    
                    {/* 封筒の中身が透けて見える効果 */}
                    <div className="absolute inset-4 top-16 bg-white rounded opacity-30" />
                    
                    {/* 差出人 */}
                    <div className="absolute bottom-4 right-4 text-right">
                      <p className="text-sm font-bold text-gray-700">from</p>
                      <p className="text-lg font-bold text-pink-600">{aiRole}</p>
                    </div>
                    
                    {/* 開封を促すメッセージ */}
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-x-0 bottom-8 text-center"
                    >
                      <p className="text-sm text-gray-600 mb-2">💌 タップして開封</p>
                      <div className="text-2xl">👆</div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 手紙（開封後） */}
            <AnimatePresence>
              {isOpened && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, rotateY: -90 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  exit={{ scale: 0.8, opacity: 0, rotateY: 90 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="w-80 bg-white rounded-xl shadow-2xl border-2 border-pink-200 p-6 cursor-pointer"
                  onClick={handleClose}
                >
                  {/* 手紙のヘッダー */}
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-pink-100">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-yellow-400 flex items-center justify-center text-white font-bold mr-3">
                        {aiRole.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{aiRole}</p>
                        <p className="text-xs text-gray-500">あなたへ</p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className="text-pink-400 text-lg"
                    >
                      💖
                    </motion.div>
                  </div>
                  
                  {/* メッセージ本文 */}
                  <div className="mb-6">
                    <p className="text-gray-700 leading-relaxed text-sm mb-4">
                      {message}
                    </p>
                  </div>
                  
                  {/* 閉じるボタン */}
                  <div className="text-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-2 bg-pink-500 text-white rounded-full text-sm font-semibold shadow-lg hover:bg-pink-600 transition-colors"
                      onClick={handleClose}
                    >
                      ありがとう ✨
                    </motion.button>
                  </div>
                  
                  {/* 装飾的な要素 */}
                  {Array.from({ length: 4 }, (_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        rotate: 360,
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{ 
                        rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }
                      }}
                      className="absolute text-pink-300 text-xs pointer-events-none"
                      style={{
                        left: `${20 + i * 20}%`,
                        top: `${10 + i * 15}%`
                      }}
                    >
                      ✨
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}