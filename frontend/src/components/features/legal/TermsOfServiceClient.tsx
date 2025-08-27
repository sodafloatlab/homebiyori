/**
 * Terms of Service Client Component - SSG対応版
 * 
 * ■機能概要■
 * - クライアントサイド機能を分離
 * - ナビゲーション処理
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';
import Footer from '@/components/layout/Footer';

export default function TermsOfServiceClient() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    const pageRoutes: { [key: string]: string } = {
      'home': '/',
      'privacy-policy': '/legal/privacy',
      'commercial-transaction': '/legal/commercial',
      'contact': '/contact',
      'faq': '/faq'
    };
    
    const route = pageRoutes[screen];
    if (route) {
      router.push(route);
    }
  };

  const handleBack = () => {
    router.back();
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
              onClick={handleBack}
            >
              戻る
            </Button>
            
            <div className="text-center">
              <Typography variant="h1" color="primary">
                利用規約
              </Typography>
            </div>
            
            <div className="w-20"></div> {/* スペーサー */}
          </div>
        </ResponsiveContainer>
      </div>

      {/* メインコンテンツ */}
      <ResponsiveContainer maxWidth="4xl" padding="lg" className="py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12">
          <div className="max-w-4xl mx-auto">
            
            <div className="mb-8 text-center">
              <Typography variant="caption" color="secondary">
                最終更新日：2024年8月27日
              </Typography>
            </div>

            {/* 1. サービスの概要 */}
            <section className="mb-12">
              <Typography variant="h2" color="primary" className="mb-6 pb-3 border-b-2 border-emerald-200">
                1. サービスの概要
              </Typography>
              
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <Typography variant="body">
                  「ほめびより」（以下、「本サービス」という）は、育児を頑張る保護者の方々にAIが優しく寄り添い、日々の育児の努力を認め、褒めてくれるサービスです。
                </Typography>
                
                <Typography variant="body">
                  本サービスは、子育て中の保護者が自己肯定感を高め、より前向きに育児に取り組めるよう支援することを目的としています。
                </Typography>

                <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 my-6">
                  <Typography variant="h4" color="primary" className="mb-3 flex items-center">
                    <span className="mr-2">🌱</span>
                    サービスの特徴
                  </Typography>
                  <ul className="space-y-2 text-gray-700">
                    <li>• 3つの個性豊かなAIキャラクターとの対話</li>
                    <li>• 育児努力の「成長の木」としての可視化</li>
                    <li>• 日々の小さな努力や進歩への認めと褒め</li>
                    <li>• 個人情報の適切な保護とプライバシーの遵守</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 2. 利用条件 */}
            <section className="mb-12">
              <Typography variant="h2" color="primary" className="mb-6 pb-3 border-b-2 border-emerald-200">
                2. 利用条件
              </Typography>
              
              <div className="space-y-6">
                <div>
                  <Typography variant="h3" color="primary" className="mb-3">
                    2.1 利用資格
                  </Typography>
                  <div className="space-y-3 text-gray-700">
                    <Typography variant="body">
                      本サービスは18歳以上かつ日本国内に居住する方を対象としています。未成年者の利用には保護者の同意が必要です。
                    </Typography>
                    <Typography variant="body">
                      アカウント登録時には、正確な情報を入力していただき、継続的に最新の情報を維持してください。
                    </Typography>
                  </div>
                </div>

                <div>
                  <Typography variant="h3" color="primary" className="mb-3">
                    2.2 アカウント管理
                  </Typography>
                  <div className="space-y-3 text-gray-700">
                    <Typography variant="body">
                      ユーザーは自身のアカウント情報の管理に責任を負います。第三者による不正利用を発見した場合は、速やかに弊社に通報してください。
                    </Typography>
                    <Typography variant="body">
                      アカウントの共有、譲渡、販売は禁止しています。違反が発覚した場合はアカウント停止の対象となります。
                    </Typography>
                  </div>
                </div>

                <div>
                  <Typography variant="h3" color="primary" className="mb-3">
                    2.3 サービスの利用方法
                  </Typography>
                  <div className="space-y-3 text-gray-700">
                    <Typography variant="body">
                      本サービスは7日間の無料トライアル期間を経て、有料プランに移行します。料金詳細については公式サイトをご確認ください。
                    </Typography>
                    <Typography variant="body">
                      ユーザーはいつでもサービスを解約できます。解約手続きはアカウント設定ページから行ってください。
                    </Typography>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. 禁止事項 */}
            <section className="mb-12">
              <Typography variant="h2" color="primary" className="mb-6 pb-3 border-b-2 border-emerald-200">
                3. 禁止事項
              </Typography>
              
              <div className="bg-red-50 p-6 rounded-xl border border-red-200 mb-6">
                <Typography variant="h4" color="primary" className="mb-3 flex items-center text-red-800">
                  <span className="mr-2">⚠️</span>
                  以下の行為は禁止しています
                </Typography>
              </div>

              <div className="space-y-4">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-3 mt-1">•</span>
                    <div>
                      <strong>不適切なコンテンツの投稿</strong>：暴力的、性的、差別的、反社会的な内容の投稿
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-3 mt-1">•</span>
                    <div>
                      <strong>他者の権利侵害</strong>：著作権、商標権、プライバシー権等の侵害
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-3 mt-1">•</span>
                    <div>
                      <strong>システムの悪用</strong>：ハッキング、ウイルスの拡散、サービスの正常な運営を妨げる行為
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-3 mt-1">•</span>
                    <div>
                      <strong>商業目的での利用</strong>：弊社の許可なく商業目的でサービスを利用すること
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-emerald-500 mr-3 mt-1">•</span>
                    <div>
                      <strong>虚偽情報の提供</strong>：意図的に虚偽の情報を提供すること
                    </div>
                  </li>
                </ul>
              </div>
            </section>

            {/* 4. 個人情報の取り扱い */}
            <section className="mb-12">
              <Typography variant="h2" color="primary" className="mb-6 pb-3 border-b-2 border-emerald-200">
                4. 個人情報の取り扱い
              </Typography>
              
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 mb-6">
                <Typography variant="body" className="text-blue-800">
                  個人情報の取り扱いについての詳細は、別途「プライバシーポリシー」をご確認ください。
                </Typography>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <Typography variant="body">
                  弊社は、ユーザーのプライバシーを尊重し、個人情報の保護に細心の注意を払っています。収集した情報はサービスの提供と改善の目的のみに使用します。
                </Typography>
                <Typography variant="body">
                  第三者への情報提供は、法令に基づく場合を除き行いません。ユーザーはいつでも自分のデータの確認、修正、削除を求めることができます。
                </Typography>
              </div>
            </section>

            {/* 5. サービスの変更と停止 */}
            <section className="mb-12">
              <Typography variant="h2" color="primary" className="mb-6 pb-3 border-b-2 border-emerald-200">
                5. サービスの変更と停止
              </Typography>
              
              <div className="space-y-4 text-gray-700">
                <Typography variant="body">
                  弊社はサービスの内容や料金体系を事前通告なく変更する場合があります。重要な変更については、メールやサービス内通知にてお知らせします。
                </Typography>
                <Typography variant="body">
                  システムメンテナンスや緊急事態により、一時的にサービスを停止する場合があります。これらの停止によって生じた損害について、弊社は責任を負いかねます。
                </Typography>
              </div>
            </section>

            {/* 6. 免責事項 */}
            <section className="mb-12">
              <Typography variant="h2" color="primary" className="mb-6 pb-3 border-b-2 border-emerald-200">
                6. 免責事項
              </Typography>
              
              <div className="space-y-4 text-gray-700">
                <Typography variant="body">
                  本サービスは現状有姿で提供されます。弊社はサービスの完全性、精度、継続性、安全性を保証するものではありません。
                </Typography>
                <Typography variant="body">
                  ユーザーが本サービスの利用によって直接的または間接的に損害を被った場合でも、弊社の故意または重過失による場合を除き、弊社は一切の責任を負いません。
                </Typography>
              </div>
            </section>

            {/* 7. 準拠法と管轄裁判所 */}
            <section className="mb-12">
              <Typography variant="h2" color="primary" className="mb-6 pb-3 border-b-2 border-emerald-200">
                7. 準拠法と管轄裁判所
              </Typography>
              
              <div className="space-y-4 text-gray-700">
                <Typography variant="body">
                  本規約は日本法に準拠し、日本法に従って解釈されます。本サービスに関連して生じた紛争は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
                </Typography>
              </div>
            </section>

            {/* お問い合わせ */}
            <section>
              <Typography variant="h2" color="primary" className="mb-6 pb-3 border-b-2 border-emerald-200">
                お問い合わせ
              </Typography>
              
              <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200">
                <Typography variant="body" className="mb-4">
                  本利用規約に関してご不明な点がございましたら、お気軽にお問い合わせください。
                </Typography>
                
                <Button 
                  variant="primary" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleNavigate('contact')}
                >
                  お問い合わせフォームへ
                </Button>
              </div>
            </section>

          </div>
        </div>
      </ResponsiveContainer>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}