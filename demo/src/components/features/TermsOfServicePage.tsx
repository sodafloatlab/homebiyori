'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';
import { AppScreen } from './MainApp';

interface TermsOfServicePageProps {
  onNavigate: (screen: AppScreen) => void;
  onClose: () => void;
}

const TermsOfServicePage = ({ onClose }: TermsOfServicePageProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <ResponsiveContainer maxWidth="2xl" padding="sm">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-emerald-600" />
              <Typography variant="h4" color="primary">利用規約</Typography>
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
          className="prose prose-gray max-w-none"
        >
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

            <section>
              <Typography variant="h3" color="primary" className="mb-4">第7条（著作権）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>1. ユーザーは、自ら著作権等の必要な知的財産権を有するか、または必要な権利者の許諾を得た文章、画像や映像等の情報に関してのみ、本サービスを利用し、投稿ないしアップロードすることができるものとします。</p>
                <p>2. ユーザーが本サービスを利用して投稿ないしアップロードした文章、画像、映像等の著作権については、当該ユーザーその他既存の権利者に留保されるものとします。ただし、当社は、本サービスを利用して投稿ないしアップロードされた文章、画像、映像等について、本サービスの改良、品質の向上、または不備の是正等ならびに本サービスの周知宣伝等に必要な範囲で利用できるものとし、ユーザーは、この利用に関して、著作者人格権を行使しないものとします。</p>
                <p>3. 前項本文の定めるものを除き、本サービスおよび本サービスに関連する一切の情報についての著作権およびその他の知的財産権はすべて当社または当社にその利用を許諾した権利者に帰属し、ユーザーは無断で複製、譲渡、貸与、翻訳、改変、転載、公衆送信（送信可能化を含みます。）、伝送、配布、出版、営業使用等をしてはならないものとします。</p>
              </div>
            </section>

            <section>
              <Typography variant="h3" color="primary" className="mb-4">第8条（利用制限および登録抹消）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>1. 当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、投稿データを削除し、ユーザーに対して本サービスの全部もしくは一部の利用を制限しまたはユーザーとしての登録を抹消することができるものとします。</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>本規約のいずれかの条項に違反した場合</li>
                  <li>登録事項に虚偽の事実があることが判明した場合</li>
                  <li>料金等の支払債務の不履行があった場合</li>
                  <li>当社からの連絡に対し、一定期間返答がない場合</li>
                  <li>本サービスについて、最終の利用から一定期間利用がない場合</li>
                  <li>その他、当社が本サービスの利用を適当でないと判断した場合</li>
                </ul>
                <p>2. 当社は、本条に基づき当社が行った行為によりユーザーに生じた損害について、一切の責任を負いません。</p>
              </div>
            </section>

            <section>
              <Typography variant="h3" color="primary" className="mb-4">第9条（退会）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>1. ユーザーは、当社の定める退会手続により、本サービスから退会できるものとします。</p>
                <p>2. 退会にあたり、当社に対する債務が有る場合は、ユーザーは、退会後も当該債務を免れるものではありません。</p>
              </div>
            </section>

            <section>
              <Typography variant="h3" color="primary" className="mb-4">第10条（保証の否認および免責事項）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>1. 当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</p>
                <p>2. 当社は、本サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。ただし、本サービスに関する当社とユーザーとの間の契約（本規約を含みます。）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。</p>
                <p>3. 前項ただし書に定める場合であっても、当社は、当社の過失（重過失を除きます。）による債務不履行または不法行為によりユーザーに生じた損害のうち特別な事情から生じた損害（当社またはユーザーが損害発生につき予見し、または予見し得た場合を含みます。）について一切の責任を負いません。また、当社の過失（重過失を除きます。）による債務不履行または不法行為によりユーザーに生じた損害の賠償は、ユーザーから当該損害が発生した月に受領した利用料の額を上限とします。</p>
                <p>4. 当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</p>
              </div>
            </section>

            <section>
              <Typography variant="h3" color="primary" className="mb-4">第11条（サービス内容の変更等）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。</p>
              </div>
            </section>

            <section>
              <Typography variant="h3" color="primary" className="mb-4">第12条（利用規約の変更）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>1. 当社は以下の場合には、ユーザーの個別の同意を要せず、本規約を変更することができるものとします。</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>本規約の変更がユーザーの一般の利益に適合するとき。</li>
                  <li>本規約の変更が本サービス利用契約の目的に反せず、かつ、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき。</li>
                </ul>
                <p>2. 当社はユーザーに対し、前項による本規約の変更にあたり、事前に、本規約を変更する旨及び変更後の本規約の内容並びにその効力発生時期を通知いたします。</p>
              </div>
            </section>

            <section>
              <Typography variant="h3" color="primary" className="mb-4">第13条（個人情報の取扱い）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。</p>
              </div>
            </section>

            <section>
              <Typography variant="h3" color="primary" className="mb-4">第14条（通知または連絡）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。当社は、ユーザーから、当社が別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。</p>
              </div>
            </section>

            <section>
              <Typography variant="h3" color="primary" className="mb-4">第15条（権利義務の譲渡の禁止）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。</p>
              </div>
            </section>

            <section>
              <Typography variant="h3" color="primary" className="mb-4">第16条（準拠法・裁判管轄）</Typography>
              <div className="space-y-3 text-gray-700">
                <p>1. 本規約の解釈にあたっては、日本法を準拠法とします。</p>
                <p>2. 本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。</p>
              </div>
            </section>

            <div className="mt-12 p-6 bg-gray-50 rounded-lg">
              <Typography variant="body" color="secondary" className="text-center">
                本利用規約に関するお問い合わせは、本サービス内のお問い合わせフォームよりご連絡ください。
              </Typography>
            </div>
          </div>
        </motion.div>
      </ResponsiveContainer>
    </div>
  );
};

export default TermsOfServicePage;