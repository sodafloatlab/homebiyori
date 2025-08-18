'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';
import Footer from '@/components/layout/Footer';

export default function CommercialTransactionPage() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Navigate to:', screen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      {/* ヘッダー */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <ResponsiveContainer maxWidth="2xl" padding="lg">
          <div className="flex items-center justify-between py-4">
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft className="w-5 h-5" />}
              onClick={() => router.back()}
            >
              戻る
            </Button>
            <div className="flex items-center space-x-2">
              <div className="text-2xl">🌱</div>
              <Typography variant="h4" color="primary">ほめびより</Typography>
            </div>
            <div className="w-20"></div>
          </div>
        </ResponsiveContainer>
      </div>

      {/* メインコンテンツ */}
      <ResponsiveContainer maxWidth="2xl" padding="lg" className="py-12">
        <div className="bg-white rounded-3xl shadow-lg p-12">
          <Typography variant="h1" color="primary" className="mb-8 text-center">
            特定商取引法に基づく表記
          </Typography>
          
          <div className="prose prose-emerald max-w-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-emerald-50 p-6 rounded-2xl">
                <Typography variant="h4" color="primary" className="mb-4">
                  販売事業者名
                </Typography>
                <Typography variant="body" color="secondary">
                  株式会社ほめびより
                </Typography>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl">
                <Typography variant="h4" color="primary" className="mb-4">
                  代表者
                </Typography>
                <Typography variant="body" color="secondary">
                  代表取締役 田中太郎
                </Typography>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl">
                <Typography variant="h4" color="primary" className="mb-4">
                  所在地
                </Typography>
                <Typography variant="body" color="secondary">
                  〒150-0001<br />
                  東京都渋谷区神宮前1-1-1
                </Typography>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl">
                <Typography variant="h4" color="primary" className="mb-4">
                  連絡先
                </Typography>
                <Typography variant="body" color="secondary">
                  メール：support@homebiyori.com<br />
                  電話：03-1234-5678
                </Typography>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl">
                <Typography variant="h4" color="primary" className="mb-4">
                  販売価格
                </Typography>
                <Typography variant="body" color="secondary">
                  月額580円（税込）<br />
                  ※初月のみ300円（税込）
                </Typography>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl">
                <Typography variant="h4" color="primary" className="mb-4">
                  料金の支払方法
                </Typography>
                <Typography variant="body" color="secondary">
                  クレジットカード決済
                </Typography>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl">
                <Typography variant="h4" color="primary" className="mb-4">
                  料金の支払時期
                </Typography>
                <Typography variant="body" color="secondary">
                  月額料金は毎月自動決済
                </Typography>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl">
                <Typography variant="h4" color="primary" className="mb-4">
                  提供時期
                </Typography>
                <Typography variant="body" color="secondary">
                  決済確認後、即時サービス提供開始
                </Typography>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl md:col-span-2">
                <Typography variant="h4" color="primary" className="mb-4">
                  返品・交換・キャンセルについて
                </Typography>
                <Typography variant="body" color="secondary">
                  デジタルコンテンツという商品の性質上、お客様のご都合による返品・返金はお受けできません。<br />
                  ただし、システム障害等により正常にサービスをご利用いただけない場合は、この限りではありません。
                </Typography>
              </div>

              <div className="bg-emerald-50 p-6 rounded-2xl md:col-span-2">
                <Typography variant="h4" color="primary" className="mb-4">
                  免責事項
                </Typography>
                <Typography variant="body" color="secondary">
                  本サービスは育児支援を目的としており、医学的なアドバイスを提供するものではありません。<br />
                  お子様の健康に関する事項については、必ず医療専門家にご相談ください。
                </Typography>
              </div>
            </div>

            <Typography variant="small" color="secondary" className="mt-12 text-center border-t pt-6">
              最終更新日：2025年8月17日
            </Typography>
          </div>
        </div>
      </ResponsiveContainer>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}