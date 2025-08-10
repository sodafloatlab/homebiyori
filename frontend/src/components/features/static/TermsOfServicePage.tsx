'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';

interface TermsOfServicePageProps {
  onClose: () => void;
}

const TermsOfServicePage = ({ onClose }: TermsOfServicePageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-emerald-600" />
              <Typography variant="h4" className="text-emerald-900">利用規約</Typography>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>戻る</span>
            </Button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-gray max-w-none"
        >
          <div className="mb-8">
            <Typography variant="body" className="text-gray-600 mb-4">
              最終更新日：2025年1月31日
            </Typography>
            <Typography variant="body" className="text-gray-600">
              本利用規約（以下「本規約」）は、ほめびより（以下「当サービス」）が提供するWebアプリケーション「ほめびより」（以下「本サービス」）の利用条件を定めるものです。
            </Typography>
          </div>

          <div className="space-y-8">
            <section>
              <Typography variant="h3" className="text-emerald-800 mb-4">第1条（適用）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>1. 本規約は、ユーザーと当サービスとの間の本サービスの利用に関わる一切の関係に適用されるものとします。</p>
                <p>2. 本サービス上で当サービスが公示する個別規定は、本規約の一部を構成するものとします。</p>
                <p>3. ユーザーが本サービスを利用した場合、本規約の全ての内容に同意したものとみなします。</p>
              </div>
            </section>

            <section>
              <Typography variant="h3" className="text-emerald-800 mb-4">第2条（利用登録）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>1. 本サービスの利用を希望する者は、本規約に同意の上、当サービスの定める方法によって利用登録を申請するものとします。</p>
                <p>2. 当サービスは、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                  <li>本規約に違反したことがある者からの申請である場合</li>
                  <li>未成年者、成年被後見人、被保佐人または被補助人からの申請であり、法定代理人、後見人、保佐人または補助人の同意等を得ていない場合</li>
                  <li>その他、当社が利用登録を相当でないと判断した場合</li>
                </ul>
              </div>
            </section>

            <section>
              <Typography variant="h3" className="text-emerald-800 mb-4">第3条（ユーザーIDおよびパスワードの管理）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>1. ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。</p>
                <p>2. ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。</p>
                <p>3. ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、そのユーザーIDを登録しているユーザー自身による利用とみなします。</p>
              </div>
            </section>

            {/* 以下、その他の条項も同様の形式で続く */}

            <div className="mt-12 p-6 bg-gray-50 rounded-lg">
              <Typography variant="body" className="text-gray-600 text-center">
                本利用規約に関するお問い合わせは、本サービス内のお問い合わせフォームよりご連絡ください。
              </Typography>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;