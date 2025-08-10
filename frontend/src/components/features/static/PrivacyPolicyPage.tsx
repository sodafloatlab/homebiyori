'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';

interface PrivacyPolicyPageProps {
  onClose: () => void;
}

const PrivacyPolicyPage = ({ onClose }: PrivacyPolicyPageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <ResponsiveContainer maxWidth="2xl" padding="sm">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-blue-600" />
              <Typography variant="h4" color="primary">プライバシーポリシー</Typography>
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
          className="text-center"
        >
          <Typography variant="h2" color="primary" className="mb-6">
            プライバシーポリシー
          </Typography>
          <Typography variant="body" color="secondary" className="mb-8">
            最終更新日：2025年1月31日
          </Typography>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-8">
            <Typography variant="body" color="secondary">
              プライバシーポリシーの詳細内容は現在準備中です。<br />
              お客様の個人情報保護については、関連法規に基づき適切に取り扱います。
            </Typography>
          </div>

          <Typography variant="small" color="secondary">
            詳細についてはお問い合わせフォームよりご連絡ください。
          </Typography>
        </motion.div>
      </ResponsiveContainer>
    </div>
  );
};

export default PrivacyPolicyPage;