'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';
import Footer from '@/components/layout/Footer';

export default function PrivacyPolicyPage() {
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
            プライバシーポリシー
          </Typography>
          
          <div className="prose prose-emerald max-w-none">
            <Typography variant="body" color="secondary" className="mb-6">
              株式会社ほめびより（以下「当社」）は、本ウェブサイト上で提供するサービス（以下「本サービス」）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。
            </Typography>

            <Typography variant="h3" color="primary" className="mt-8 mb-4">
              第1条（個人情報）
            </Typography>
            <Typography variant="body" color="secondary" className="mb-6">
              「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
            </Typography>

            <Typography variant="h3" color="primary" className="mt-8 mb-4">
              第2条（個人情報の収集方法）
            </Typography>
            <Typography variant="body" color="secondary" className="mb-6">
              当社は、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレス、銀行口座番号、クレジットカード番号、運転免許証番号などの個人情報をお尋ねすることがあります。また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、当社の提携先（情報提供元、広告主、広告配信先などを含みます。以下「提携先」といいます。）などから収集することがあります。
            </Typography>

            <Typography variant="h3" color="primary" className="mt-8 mb-4">
              第3条（個人情報を収集・利用する目的）
            </Typography>
            <Typography variant="body" color="secondary" className="mb-6">
              当社が個人情報を収集・利用する目的は、以下のとおりです。
            </Typography>
            <ul className="list-disc ml-6 mb-6">
              <li className="mb-2">
                <Typography variant="body" color="secondary">
                  当社サービスの提供・運営のため
                </Typography>
              </li>
              <li className="mb-2">
                <Typography variant="body" color="secondary">
                  ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）
                </Typography>
              </li>
              <li className="mb-2">
                <Typography variant="body" color="secondary">
                  ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等及び当社が提供する他のサービスの案内のメールを送付するため
                </Typography>
              </li>
              <li className="mb-2">
                <Typography variant="body" color="secondary">
                  メンテナンス、重要なお知らせなど必要に応じたご連絡のため
                </Typography>
              </li>
            </ul>

            <Typography variant="h3" color="primary" className="mt-8 mb-4">
              第4条（利用目的の変更）
            </Typography>
            <Typography variant="body" color="secondary" className="mb-6">
              当社は、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、個人情報の利用目的を変更するものとします。
            </Typography>

            <Typography variant="h3" color="primary" className="mt-8 mb-4">
              第5条（個人情報の第三者提供）
            </Typography>
            <Typography variant="body" color="secondary" className="mb-6">
              当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
            </Typography>

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