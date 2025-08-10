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

        {/* メインコンテンツ */}
        <main className="px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            {children}
          </motion.div>
        </main>

      </div>
    </div>
  );
}