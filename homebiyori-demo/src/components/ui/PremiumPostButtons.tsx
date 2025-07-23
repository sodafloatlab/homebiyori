'use client';

import { motion } from 'framer-motion';

interface PremiumPostButtonsProps {
  onPost: (type: 'photo' | 'text') => void;
}

export default function PremiumPostButtons({ onPost }: PremiumPostButtonsProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.8 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* 主行動ボタン */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.button
          onClick={() => onPost('photo')}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white font-semibold py-8 px-8 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          {/* 背景エフェクト */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* グロー効果 */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
               style={{
                 background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                 filter: 'blur(8px)'
               }} />
          
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-4xl"
            >
              📷
            </motion.div>
            <div className="text-center">
              <h3 className="text-lg font-bold mb-1">写真から投稿する</h3>
              <p className="text-blue-100 text-sm opacity-90">子供の笑顔や日常の一コマを</p>
            </div>
          </div>
          
          {/* シマー効果 */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 rotate-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent w-4" />
          </div>
        </motion.button>
        
        <motion.button
          onClick={() => onPost('text')}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 text-white font-semibold py-8 px-8 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          {/* 背景エフェクト */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* グロー効果 */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
               style={{
                 background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
                 filter: 'blur(8px)'
               }} />
          
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <motion.div
              animate={{ 
                rotate: [0, -5, 5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              className="text-4xl"
            >
              📝
            </motion.div>
            <div className="text-center">  
              <h3 className="text-lg font-bold mb-1">今日のえらいを書く</h3>
              <p className="text-emerald-100 text-sm opacity-90">頑張ったことを文字で記録</p>
            </div>
          </div>
          
          {/* シマー効果 */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 rotate-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent w-4" />
          </div>
        </motion.button>
      </div>
      
      {/* プレミアムヒントカード */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-lg"
      >
        <div className="flex items-start space-x-4">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-3xl"
          >
            💡
          </motion.div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-slate-800 mb-2">小さなことでも大丈夫です</h4>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></span>
                「今日も一日がんばった」
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                「子供が笑ってくれた」
              </p>
              <p className="flex items-center">
                <span className="w-2 h-2 bg-pink-400 rounded-full mr-3"></span>
                「おいしいご飯を作れた」
              </p>
            </div>
            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200/50">
              <p className="text-xs text-amber-700 font-medium">
                ✨ どんな小さな瞬間も、あなたの大切な育児の記録です
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}