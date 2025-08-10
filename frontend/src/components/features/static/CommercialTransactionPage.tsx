'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Building2 } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';

interface CommercialTransactionPageProps {
  onClose: () => void;
}

const CommercialTransactionPage = ({ onClose }: CommercialTransactionPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <ResponsiveContainer maxWidth="2xl" padding="sm">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Building2 className="w-6 h-6 text-green-600" />
              <Typography variant="h4" color="primary">特定商取引法に基づく表記</Typography>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              戻る
            </Button>
          </div>
        </ResponsiveContainer>
      </div>

      {/* メインコンテンツ */}
      <ResponsiveContainer maxWidth="2xl" padding="lg" className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center mb-8">
            <Typography variant="h2" color="primary" className="mb-4">
              特定商取引法に基づく表記
            </Typography>
            <Typography variant="body" color="secondary">
              特定商取引法第11条に基づく表示
            </Typography>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Typography variant="h4" color="primary" className="mb-3">販売業者</Typography>
                <Typography variant="body" color="secondary">ほめびより（個人事業）</Typography>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Typography variant="h4" color="primary" className="mb-3">運営責任者</Typography>
                <Typography variant="body" color="secondary">[運営者名]</Typography>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Typography variant="h4" color="primary" className="mb-3">所在地</Typography>
                <Typography variant="body" color="secondary">
                  〒000-0000<br />
                  [住所詳細]
                </Typography>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Typography variant="h4" color="primary" className="mb-3">連絡先</Typography>
                <Typography variant="body" color="secondary">
                  電話番号：[電話番号]<br />
                  メール：[メールアドレス]
                </Typography>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Typography variant="h4" color="primary" className="mb-3">販売価格</Typography>
                <Typography variant="body" color="secondary">
                  月額プラン：580円（税込）<br />
                  年額プラン：5,800円（税込）<br />
                  ※無料版でも基本機能は利用可能
                </Typography>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Typography variant="h4" color="primary" className="mb-3">支払方法</Typography>
                <Typography variant="body" color="secondary">
                  クレジットカード決済<br />
                  （VISA、MasterCard、JCB、AMEX、Diners）
                </Typography>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Typography variant="h4" color="primary" className="mb-3">支払時期</Typography>
                <Typography variant="body" color="secondary">
                  月額プラン：毎月同日<br />
                  年額プラン：年額一括前払い
                </Typography>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <Typography variant="h4" color="primary" className="mb-3">サービス提供時期</Typography>
                <Typography variant="body" color="secondary">
                  決済完了後、即座にサービス提供開始
                </Typography>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <Typography variant="h4" color="primary" className="mb-3">返品・キャンセル</Typography>
              <Typography variant="body" color="secondary">
                デジタルコンテンツの性質上、サービス提供開始後の返品・キャンセルはお受けできません。<br />
                ただし、サービス障害等の弊社事由による場合はこの限りではありません。
              </Typography>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <Typography variant="h4" color="primary" className="mb-3">解約について</Typography>
              <Typography variant="body" color="secondary">
                アプリ内の設定画面からいつでも解約可能です。<br />
                解約後は次回課金日からサービス停止となります。
              </Typography>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <Typography variant="body" color="secondary" className="text-center">
              本表記に関するお問い合わせは、アプリ内のお問い合わせフォームよりご連絡ください。
            </Typography>
          </div>
        </motion.div>
      </ResponsiveContainer>
    </div>
  );
};

export default CommercialTransactionPage;