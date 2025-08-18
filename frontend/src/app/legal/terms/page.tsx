'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';
import Footer from '@/components/layout/Footer';

export default function TermsOfServicePage() {
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
            利用規約
          </Typography>
          
          <div className="prose prose-emerald max-w-none">
            <div className="mb-8">
              <Typography variant="body" color="secondary" className="mb-4">
                最終更新日：2025年1月31日
              </Typography>
              <Typography variant="body" color="secondary">
                本利用規約（以下「本規約」）は、ほめびより（以下「当サービス」）が提供するWebアプリケーション「ほめびより」（以下「本サービス」）の利用条件を定めるものです。
              </Typography>
            </div>

            <div className="space-y-8">
              <section>
                <Typography variant="h3" color="primary" className="mb-4">第1条（適用）</Typography>
                <div className="space-y-3 text-gray-700">
                  <p>1. 本規約は、ユーザーと当サービスとの間の本サービスの利用に関わる一切の関係に適用されるものとします。</p>
                  <p>2. 本サービス上で当サービスが公示する個別規定は、本規約の一部を構成するものとします。</p>
                  <p>3. ユーザーが本サービスを利用した場合、本規約の全ての内容に同意したものとみなします。</p>
                </div>
              </section>

              <section>
                <Typography variant="h3" color="primary" className="mb-4">第2条（利用登録）</Typography>
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
                <Typography variant="h3" color="primary" className="mb-4">第3条（ユーザーIDおよびパスワードの管理）</Typography>
                <div className="space-y-3 text-gray-700">
                  <p>1. ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。</p>
                  <p>2. ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。</p>
                  <p>3. ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、そのユーザーIDを登録しているユーザー自身による利用とみなします。</p>
                </div>
              </section>

              <section>
                <Typography variant="h3" color="primary" className="mb-4">第4条（利用料金および支払方法）</Typography>
                <div className="space-y-3 text-gray-700">
                  <p>1. ユーザーは、本サービスの有料部分の対価として、当社が別途定め、本サイトに表示する利用料金を、当社が指定する方法により支払うものとします。</p>
                  <p>2. ユーザーが利用料金の支払を遅滞した場合には、ユーザーは年14.6％の割合による遅延損害金を支払うものとします。</p>
                  <p>3. 当社は、利用料金を改定することがあります。この場合、当社は改定後の利用料金を本サイトに掲示し、改定の効力発生日の30日前までにユーザーに通知します。</p>
                </div>
              </section>

              <section>
                <Typography variant="h3" color="primary" className="mb-4">第5条（禁止事項）</Typography>
                <div className="space-y-3 text-gray-700">
                  <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません：</p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>法令または公序良俗に違反する行為</li>
                    <li>犯罪行為に関連する行為</li>
                    <li>本サービス内またはこれに関連して、虚偽の情報を登録する行為</li>
                    <li>当社、ほかのユーザー、または第三者の著作権、商標権ほかの知的財産権を侵害する行為</li>
                    <li>当社、ほかのユーザー、または第三者の財産、プライバシーを侵害する行為</li>
                    <li>当社、ほかのユーザー、または第三者を誹謗中傷し、または名誉を毀損する行為</li>
                    <li>過度に暴力的な表現、露骨な性的表現、人種、国籍、信条、性別、社会的身分、門地等による差別につながる表現、自殺、自傷行為、薬物乱用を誘引または助長する表現、その他反社会的な内容を含み他人に不快感を与える表現を投稿または送信する行為</li>
                    <li>営業、宣伝、広告、勧誘、その他営利を目的とする行為（当社の認めたものを除きます。）、性行為やわいせつな行為を目的とする行為、面識のない異性との出会いや交際を目的とする行為、他のユーザーに対する嫌がらせや誹謗中傷を目的とする行為、その他本サービスが予定している利用目的と異なる目的で本サービスを利用する行為</li>
                    <li>宗教活動または宗教団体への勧誘行為</li>
                    <li>反社会的勢力に対して直接または間接に利益を供与する行為</li>
                    <li>コンピュータウィルスその他の有害なコンピュータプログラムを含む情報を送信する行為</li>
                    <li>当社のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                    <li>本サービスによって得られた情報を商業的に利用する行為</li>
                    <li>当社のサービスの運営を妨害するおそれのある行為</li>
                    <li>不正アクセスをし、またはこれを試みる行為</li>
                    <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                    <li>違法、不正または不当な目的を持って本サービスを利用する行為</li>
                    <li>本サービスの他のユーザーまたはその他の第三者に不利益、損害または不快感を与える行為</li>
                    <li>その他、当社が不適切と判断する行為</li>
                  </ul>
                </div>
              </section>

              <section>
                <Typography variant="h3" color="primary" className="mb-4">第6条（本サービスの提供の停止等）</Typography>
                <div className="space-y-3 text-gray-700">
                  <p>1. 当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                    <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                    <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                    <li>その他、当社が本サービスの提供が困難と判断した場合</li>
                  </ul>
                  <p>2. 当社は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。</p>
                </div>
              </section>

              <div className="mt-12 p-6 bg-emerald-50 rounded-lg">
                <Typography variant="body" color="secondary" className="text-center">
                  本利用規約に関するお問い合わせは、本サービス内のお問い合わせフォームよりご連絡ください。
                </Typography>
              </div>
            </div>

            <Typography variant="small" color="secondary" className="mt-12 text-center border-t pt-6">
              最終更新日：2025年1月31日
            </Typography>
          </div>
        </div>
      </ResponsiveContainer>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}