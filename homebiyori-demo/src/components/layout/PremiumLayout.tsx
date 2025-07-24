'use client';

import { motion } from 'framer-motion';

interface PremiumLayoutProps {
  children: React.ReactNode;
}

export default function PremiumLayout({ children }: PremiumLayoutProps) {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-stone-50 to-green-50 relative overflow-hidden">
      {/* 高品質背景エフェクト */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-green-100/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-yellow-200/10 to-orange-200/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-200/10 to-purple-200/10 rounded-full blur-3xl" />
      </div>

      {/* 微細なノイズテクスチャ */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-multiply" 
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
           }} />

      <div className="relative z-10">
        {/* プレミアムヘッダー */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center py-8 px-6"
        >
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <h1 className="font-zen-maru-gothic text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent mb-3 tracking-tight">
              ほめびより
            </h1>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mx-auto mb-4" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-6 space-y-3"
          >
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="font-zen-maru-gothic text-slate-700 text-base md:text-lg font-medium max-w-lg mx-auto"
            >
              育児を頑張るあなたを、AIが優しく褒めてくれる
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="flex items-center justify-center space-x-2 text-emerald-600"
            >
              <span className="w-8 h-px bg-gradient-to-r from-transparent to-emerald-400"></span>
              <span className="text-sm font-zen-maru-gothic font-bold">今日も一歩ずつ</span>
              <span className="w-8 h-px bg-gradient-to-l from-transparent to-emerald-400"></span>
            </motion.div>
          </motion.div>
        </motion.header>

        {/* メインコンテンツ */}
        <main className="px-4 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            {children}
          </motion.div>
        </main>

        {/* プレミアムフッター */}
        <motion.footer 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div className="bg-white/80 backdrop-blur-xl border-t border-white/20 shadow-2xl">
            <div className="flex justify-around py-4 px-2">
              {[
                { icon: "🔍", label: "実一覧", color: "hover:bg-blue-50 hover:text-blue-600" },
                { icon: "💬", label: "褒め履歴", color: "hover:bg-pink-50 hover:text-pink-600" },
                { icon: "🧸", label: "設定", color: "hover:bg-emerald-50 hover:text-emerald-600" }
              ].map((item, index) => (
                <motion.button
                  key={item.label}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-xl transition-all duration-200 ${item.color}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4 + index * 0.1, duration: 0.5 }}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-zen-maru-gothic text-xs font-bold text-gray-700">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}