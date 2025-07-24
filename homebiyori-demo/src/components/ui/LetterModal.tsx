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
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-blue-900/20 via-green-900/30 to-yellow-900/20 backdrop-blur-sm"
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
                  {/* 水彩画風封筒 */}
                  <div className="relative">
                    {/* 封筒本体 */}
                    <div className="w-96 h-64 bg-gradient-to-br from-yellow-50 via-green-50 to-blue-50 rounded-2xl shadow-2xl border border-green-200/50 p-6 relative overflow-hidden backdrop-blur-sm">
                      {/* 水彩風背景効果 */}
                      <div className="absolute inset-0 bg-gradient-radial from-white/40 via-transparent to-transparent opacity-70 rounded-2xl" />
                      <div className="absolute top-4 right-4 w-16 h-16 bg-yellow-200/30 rounded-full blur-xl" />
                      <div className="absolute bottom-6 left-6 w-12 h-12 bg-green-200/30 rounded-full blur-lg" />
                      
                      {/* 封筒のフラップ（水彩風） */}
                      <motion.div
                        animate={{ 
                          rotateX: [0, -3, 0],
                          scale: [1, 1.01, 1]
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-green-100/80 to-green-200/60 rounded-t-2xl border-b border-green-300/30 backdrop-blur-sm"
                        style={{
                          background: 'linear-gradient(135deg, rgba(187, 247, 208, 0.6), rgba(134, 239, 172, 0.4))',
                          filter: 'drop-shadow(0 2px 8px rgba(34, 197, 94, 0.1))'
                        }}
                      />
                      
                      {/* 手紙の透け感 */}
                      <div className="absolute inset-6 top-20 bg-white/40 rounded-xl backdrop-blur-sm border border-white/30" />
                      
                      {/* 差出人（シンプルに） */}
                      <div className="absolute bottom-6 right-6 text-right z-10">
                        <p className="text-xs font-medium text-green-700/80 mb-1">あなたへの手紙</p>
                        <p className="text-lg font-bold text-green-800 drop-shadow-sm">
                          {aiRole}より
                        </p>
                      </div>
                      
                      {/* 開封を促すメッセージ（洗練） */}
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-x-0 bottom-16 text-center z-10"
                      >
                        <div className="bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 mx-auto inline-block shadow-lg border border-green-100">
                          <p className="text-sm text-green-700 font-medium">✉️ タップして手紙を開く</p>
                        </div>
                      </motion.div>
                      
                      {/* キラキラ効果 */}
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-yellow-300 rounded-full opacity-60"
                          style={{
                            left: `${15 + Math.random() * 70}%`,
                            top: `${10 + Math.random() * 80}%`,
                          }}
                          animate={{
                            scale: [0, 1, 0],
                            opacity: [0, 0.8, 0],
                            rotate: [0, 180]
                          }}
                          transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 3,
                          }}
                        />
                      ))}
                    </div>
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
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="w-[480px] bg-gradient-to-br from-white via-green-50/30 to-blue-50/30 rounded-2xl shadow-2xl border border-green-200/50 p-8 cursor-pointer backdrop-blur-sm relative overflow-hidden"
                  onClick={handleClose}
                >
                  {/* 水彩風の背景装飾 */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-6 right-8 w-24 h-24 bg-yellow-100/40 rounded-full blur-2xl" />
                    <div className="absolute bottom-8 left-6 w-20 h-20 bg-green-100/40 rounded-full blur-xl" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-100/20 rounded-full blur-3xl" />
                  </div>

                  {/* 手紙のヘッダー（静的） */}
                  <div className="relative z-10 flex items-center justify-between mb-6 pb-4 border-b border-green-200/50">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-200 via-blue-200 to-yellow-200 flex items-center justify-center text-green-800 font-bold mr-4 shadow-lg border border-white/50">
                        {aiRole.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-green-800 text-lg">{aiRole}</p>
                        <p className="text-sm text-green-600/80">あなたへの温かなメッセージ</p>
                      </div>
                    </div>
                    <div className="text-yellow-500 text-2xl drop-shadow-sm">
                      ✨
                    </div>
                  </div>
                  
                  {/* メッセージ本文（水彩風カード） */}
                  <div className="relative z-10 mb-8">
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-inner">
                      <p className="text-green-800 leading-relaxed text-base font-medium">
                        {message}
                      </p>
                    </div>
                  </div>
                  
                  {/* 閉じるボタン（水彩風） */}
                  <div className="relative z-10 text-center">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-3 bg-gradient-to-r from-green-200 to-blue-200 text-green-800 rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50 backdrop-blur-sm"
                      onClick={handleClose}
                    >
                      心温まりました ✨
                    </motion.button>
                  </div>
                  
                  {/* シャボン玉のような装飾効果 */}
                  {Array.from({ length: 6 }, (_, i) => (
                    <motion.div
                      key={i}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${15 + Math.random() * 70}%`,
                        top: `${10 + Math.random() * 80}%`
                      }}
                      animate={{ 
                        y: [-20, -40, -20],
                        opacity: [0.3, 0.8, 0.3],
                        scale: [0.5, 1, 0.5]
                      }}
                      transition={{ 
                        duration: 4 + Math.random() * 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.8
                      }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full border border-white/40"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, 
                            rgba(255, 255, 255, 0.8) 0%, 
                            rgba(187, 247, 208, 0.3) 40%, 
                            rgba(134, 239, 172, 0.6) 100%)`,
                        }}
                      />
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