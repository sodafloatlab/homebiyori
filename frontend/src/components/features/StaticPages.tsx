'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Mail, FileText, Shield, Scale, Phone } from 'lucide-react';
import { AppScreen } from '@/types';
import Typography from '@/components/ui/Typography';
import Button from '@/components/ui/Button';

interface StaticPagesProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

const StaticPages = ({ currentScreen, onNavigate }: StaticPagesProps) => {
  const getPageContent = () => {
    switch (currentScreen) {
      case 'terms-of-service':
        return {
          title: '利用規約',
          icon: <FileText className="w-6 h-6" />,
          content: (
            <div className="space-y-6">
              <section>
                <Typography variant="h4" color="primary" className="mb-3">第1条（適用範囲）</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  本利用規約（以下「本規約」といいます）は、当社が提供するHomebiyoriサービス（以下「本サービス」といいます）の利用に関して、利用者と当社との間の権利義務関係を定めることを目的とし、利用者と当社との間の本サービスの利用に関わる一切の関係に適用されます。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">第2条（利用登録）</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。
                </Typography>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                  <li>本規約に違反したことがある者からの申請である場合</li>
                  <li>その他、当社が利用登録を相当でないと判断した場合</li>
                </ul>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">第3条（ユーザーIDおよびパスワードの管理）</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  利用者は、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。利用者は、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">第4条（AI機能について）</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  本サービスは、人工知能（AI）技術を使用してユーザーとの対話を行います。AI応答は情報提供および感情的サポートを目的としており、医学的、法律的、またはその他の専門的アドバイスを意図したものではありません。重要な決定を行う前には、適切な専門家にご相談ください。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">第5条（禁止事項）</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed mb-2">
                  利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。
                </Typography>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>法令または公序良俗に違反する行為</li>
                  <li>犯罪行為に関連する行為</li>
                  <li>当社、本サービスの他の利用者、または第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                  <li>当社のサービスの運営を妨害するおそれのある行為</li>
                  <li>他の利用者に関する個人情報等を収集または蓄積する行為</li>
                  <li>不正アクセスをし、またはこれを試みる行為</li>
                  <li>その他、当社が不適切と判断する行為</li>
                </ul>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">第6条（本サービスの提供の停止等）</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  当社は、以下のいずれかの事由があると判断した場合、利用者に事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">第7条（著作権）</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  利用者は、自ら著作権等の必要な知的財産権を有するか、または必要な権利者の許諾を得た文章、画像や映像等の情報に関してのみ、本サービスを利用し、投稿ないしアップロードすることができるものとします。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">第8条（利用制限および登録抹消）</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  当社は、利用者が本規約のいずれかの条項に違反した場合、事前の通知なく利用者に対して本サービスの全部もしくは一部の利用を制限し、または利用者としての登録を抹消することができるものとします。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">第9条（免責事項）</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">第10条（規約の変更）</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  当社は、利用者の一般の利益に適合する場合には、利用者に通知することなく、いつでも本規約を変更することができるものとします。変更後の本規約は、本ウェブサイトに掲載したときから効力を生じるものとします。
                </Typography>
              </section>

              <section className="mt-8 p-4 bg-emerald-50 rounded-xl">
                <Typography variant="body" color="secondary" className="text-center">
                  制定日：2024年1月1日<br />
                  最終改定日：2024年8月1日
                </Typography>
              </section>
            </div>
          )
        };

      case 'privacy-policy':
        return {
          title: 'プライバシーポリシー',
          icon: <Shield className="w-6 h-6" />,
          content: (
            <div className="space-y-6">
              <section>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  Homebiyori（以下「当社」といいます）は、当社の提供するサービスHomebiyori（以下「本サービス」といいます）における、利用者についての個人情報を含む利用者情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">1. 収集する情報</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed mb-2">
                  当社は、本サービスの利用者から以下の情報を収集する場合があります：
                </Typography>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Googleアカウント情報（メールアドレス、プロフィール画像URL）</li>
                  <li>ユーザー設定情報（ニックネーム、AIキャラクター設定など）</li>
                  <li>チャット履歴およびメッセージ内容</li>
                  <li>サービス利用状況（ログイン日時、機能利用履歴など）</li>
                  <li>デバイス情報（IPアドレス、ブラウザ情報、OS情報など）</li>
                </ul>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">2. 情報の利用目的</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed mb-2">
                  収集した情報は、以下の目的で利用されます：
                </Typography>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>本サービスの提供および運営</li>
                  <li>ユーザーサポートの提供</li>
                  <li>サービスの改善および新機能の開発</li>
                  <li>利用状況の分析および統計作成</li>
                  <li>セキュリティの維持および不正利用の防止</li>
                  <li>法令に基づく対応</li>
                </ul>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">3. AI処理について</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  本サービスでは、ユーザーのメッセージに対してパーソナライズされた応答を提供するため、Amazon Bedrockを通じてAI処理を行います。メッセージ内容は応答生成の目的でのみ処理され、適切なセキュリティ対策の下で取り扱われます。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">4. 情報の第三者提供</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed mb-2">
                  当社は、利用者の同意を得ることなく、第三者に個人情報を提供することはありません。ただし、以下の場合を除きます：
                </Typography>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>法令に基づく場合</li>
                  <li>人の生命、身体または財産の保護のために必要がある場合</li>
                  <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
                  <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
                </ul>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">5. 情報の保存期間</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  チャット履歴は利用プランに応じて一定期間保存され、期間経過後は自動的に削除されます。プレミアムプランでは180日間、一般プランでは30日間保存されます。ユーザー情報およびアカウント設定は、アカウント削除まで保存されます。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">6. 情報の安全管理</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  当社は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。AWS等の信頼性の高いクラウドサービスを利用し、暗号化通信およびアクセス制御を実施しています。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">7. 利用者の権利</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed mb-2">
                  利用者は、自己の個人情報について以下の権利を有します：
                </Typography>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>個人情報の開示請求権</li>
                  <li>個人情報の訂正・追加・削除請求権</li>
                  <li>個人情報の利用停止・消去請求権</li>
                  <li>アカウントの削除権</li>
                </ul>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">8. Cookie等の利用</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  本サービスでは、サービス利用状況の分析、利便性向上のためCookieおよび類似技術を使用する場合があります。これらの情報は統計的な分析にのみ利用され、個人を特定するものではありません。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">9. プライバシーポリシーの変更</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  当社は、本ポリシーを随時見直し、予告なく変更することがあります。変更後のプライバシーポリシーは、本ウェブサイトに掲載した時点から効力を生じます。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">10. お問い合わせ</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  本ポリシーに関するお問い合わせは、本サービス内のお問い合わせフォームまたは以下の連絡先までお願いいたします。
                </Typography>
                <div className="mt-2 p-3 bg-emerald-50 rounded-lg">
                  <Typography variant="body" color="primary">
                    Email: privacy@homebiyori.com
                  </Typography>
                </div>
              </section>

              <section className="mt-8 p-4 bg-emerald-50 rounded-xl">
                <Typography variant="body" color="secondary" className="text-center">
                  制定日：2024年1月1日<br />
                  最終改定日：2024年8月1日
                </Typography>
              </section>
            </div>
          )
        };

      case 'commercial-transaction':
        return {
          title: '特定商取引法に基づく表記',
          icon: <Scale className="w-6 h-6" />,
          content: (
            <div className="space-y-6">
              <section>
                <Typography variant="h4" color="primary" className="mb-3">事業者情報</Typography>
                <div className="bg-emerald-50 p-4 rounded-xl space-y-2">
                  <div>
                    <Typography variant="small" weight="bold" color="secondary">事業者名</Typography>
                    <Typography variant="body" color="primary">株式会社Homebiyori</Typography>
                  </div>
                  <div>
                    <Typography variant="small" weight="bold" color="secondary">代表者</Typography>
                    <Typography variant="body" color="primary">代表取締役 田中太郎</Typography>
                  </div>
                  <div>
                    <Typography variant="small" weight="bold" color="secondary">所在地</Typography>
                    <Typography variant="body" color="primary">〒100-0001 東京都千代田区千代田1-1-1</Typography>
                  </div>
                  <div>
                    <Typography variant="small" weight="bold" color="secondary">電話番号</Typography>
                    <Typography variant="body" color="primary">03-1234-5678</Typography>
                  </div>
                  <div>
                    <Typography variant="small" weight="bold" color="secondary">メールアドレス</Typography>
                    <Typography variant="body" color="primary">support@homebiyori.com</Typography>
                  </div>
                </div>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">販売価格</Typography>
                <div className="space-y-3">
                  <div className="p-3 border border-emerald-200 rounded-lg">
                    <Typography variant="body" weight="bold" color="primary">一般プラン</Typography>
                    <Typography variant="body" color="secondary">無料（一部機能制限あり）</Typography>
                  </div>
                  <div className="p-3 border border-emerald-200 rounded-lg">
                    <Typography variant="body" weight="bold" color="primary">プレミアムプラン</Typography>
                    <Typography variant="body" color="secondary">月額980円（税込）</Typography>
                  </div>
                </div>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">支払い方法</Typography>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>クレジットカード（Visa、Mastercard、JCB、American Express）</li>
                  <li>デビットカード</li>
                  <li>PayPal</li>
                </ul>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">支払い時期</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  プレミアムプラン契約時に初回決済が行われ、以降は毎月同日に自動決済されます。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">サービス提供時期</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  プレミアムプラン決済完了後、即座にサービスが利用可能になります。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">解約・返金について</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed mb-2">
                  プレミアムプランはいつでも解約可能です。解約手続きは以下の通りです：
                </Typography>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>アプリ内設定画面から「解約手続き」を選択</li>
                  <li>解約理由を選択（任意）</li>
                  <li>解約確認画面で「解約する」をクリック</li>
                </ul>
                <Typography variant="body" color="secondary" className="leading-relaxed mt-2">
                  解約後も、現在の課金期間終了まではプレミアム機能をご利用いただけます。日割り返金は行っておりません。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">免責事項</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  本サービスはAI技術を使用した感情サポートサービスです。医学的、法律的、その他専門的なアドバイスを提供するものではありません。重要な決定を行う際は、適切な専門家にご相談ください。
                </Typography>
              </section>
            </div>
          )
        };

      case 'contact':
        return {
          title: 'お問い合わせ',
          icon: <Mail className="w-6 h-6" />,
          content: (
            <div className="space-y-6">
              <section>
                <Typography variant="body" color="secondary" className="leading-relaxed">
                  Homebiyoriをご利用いただき、ありがとうございます。ご質問、ご要望、不具合報告など、お気軽にお問い合わせください。
                </Typography>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-4">お問い合わせ方法</Typography>
                
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex items-center mb-3">
                      <Mail className="w-5 h-5 mr-2 text-emerald-600" />
                      <Typography variant="body" weight="bold" color="primary">メールでのお問い合わせ</Typography>
                    </div>
                    <Typography variant="body" color="secondary" className="mb-2">
                      以下のメールアドレスまでお気軽にお問い合わせください。
                    </Typography>
                    <div className="bg-white p-3 rounded-lg border">
                      <Typography variant="body" color="primary">support@homebiyori.com</Typography>
                    </div>
                    <Typography variant="small" color="secondary" className="mt-2">
                      ※返信には1-2営業日いただく場合があります
                    </Typography>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center mb-3">
                      <Phone className="w-5 h-5 mr-2 text-blue-600" />
                      <Typography variant="body" weight="bold" color="primary">電話でのお問い合わせ</Typography>
                    </div>
                    <Typography variant="body" color="secondary" className="mb-2">
                      緊急時や重要な問題については、お電話でもお受けしています。
                    </Typography>
                    <div className="bg-white p-3 rounded-lg border">
                      <Typography variant="body" color="primary">03-1234-5678</Typography>
                    </div>
                    <Typography variant="small" color="secondary" className="mt-2">
                      受付時間：平日 10:00-18:00（土日祝除く）
                    </Typography>
                  </div>
                </div>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">よくある質問</Typography>
                
                <div className="space-y-4">
                  <details className="group">
                    <summary className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <Typography variant="body" weight="medium" color="primary">
                        アカウントを削除したい
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-3 border border-gray-200 border-t-0 rounded-b-lg">
                      <Typography variant="body" color="secondary">
                        設定画面の「アカウント管理」から「アカウント削除」を選択してください。削除されたデータは復元できませんのでご注意ください。
                      </Typography>
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <Typography variant="body" weight="medium" color="primary">
                        プレミアムプランの解約方法
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-3 border border-gray-200 border-t-0 rounded-b-lg">
                      <Typography variant="body" color="secondary">
                        設定画面の「サブスクリプション管理」から「解約手続き」を選択してください。解約後も現在の課金期間終了まではプレミアム機能をご利用いただけます。
                      </Typography>
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <Typography variant="body" weight="medium" color="primary">
                        AIの応答がおかしい
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-3 border border-gray-200 border-t-0 rounded-b-lg">
                      <Typography variant="body" color="secondary">
                        AIは学習データに基づいて応答を生成するため、時折不適切な内容が含まれる可能性があります。問題のある応答を発見された場合は、具体的な内容を添えてお問い合わせください。
                      </Typography>
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <Typography variant="body" weight="medium" color="primary">
                        チャット履歴が消えた
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-3 border border-gray-200 border-t-0 rounded-b-lg">
                      <Typography variant="body" color="secondary">
                        チャット履歴はプランに応じて自動削除されます。一般プランでは30日、プレミアムプランでは180日間保存されます。バックアップ機能は現在開発中です。
                      </Typography>
                    </div>
                  </details>
                </div>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-3">お問い合わせ時のお願い</Typography>
                <Typography variant="body" color="secondary" className="leading-relaxed mb-2">
                  迅速で適切な対応のため、以下の情報をお教えください：
                </Typography>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>ご利用中のプラン（一般/プレミアム）</li>
                  <li>問題が発生した日時</li>
                  <li>ご利用環境（ブラウザ、デバイス）</li>
                  <li>問題の詳細な状況</li>
                  <li>エラーメッセージがあれば、その内容</li>
                </ul>
              </section>

              <section className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <Typography variant="body" color="secondary" className="text-center">
                  🤖 AI機能に関するお問い合わせについて<br />
                  本サービスのAI機能は感情的サポートを目的としており、医学的・専門的アドバイスではありません。<br />
                  重要な判断は専門家にご相談ください。
                </Typography>
              </section>
            </div>
          )
        };

      case 'faq':
        return {
          title: 'よくある質問',
          icon: <FileText className="w-6 h-6" />,
          content: (
            <div className="space-y-6">
              <section>
                <Typography variant="h4" color="primary" className="mb-4">サービス全般</Typography>
                
                <div className="space-y-4">
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg cursor-pointer hover:bg-emerald-100">
                      <Typography variant="body" weight="medium" color="primary">
                        Homebiyoriとはどのようなサービスですか？
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 border border-emerald-200 border-t-0 rounded-b-lg bg-white">
                      <Typography variant="body" color="secondary" className="leading-relaxed">
                        Homebiyoriは、育児中の親御さんを対象としたAIチャットサービスです。3つの個性豊かなAIキャラクター（たまさん、まどか姉さん、ヒデじい）があなたの育児の悩みや喜びに寄り添い、優しい言葉で励まします。会話を通じて「ほめの実」が育ち、あなただけの成長の木を作り上げていきます。
                      </Typography>
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg cursor-pointer hover:bg-emerald-100">
                      <Typography variant="body" weight="medium" color="primary">
                        利用料金はかかりますか？
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 border border-emerald-200 border-t-0 rounded-b-lg bg-white">
                      <Typography variant="body" color="secondary" className="leading-relaxed">
                        基本機能は無料でご利用いただけます。プレミアムプラン（月額980円）では、グループチャット機能、チャット履歴の長期保存（180日）、ディープモードなどの追加機能をご利用いただけます。
                      </Typography>
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg cursor-pointer hover:bg-emerald-100">
                      <Typography variant="body" weight="medium" color="primary">
                        どのような方が対象ですか？
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 border border-emerald-200 border-t-0 rounded-b-lg bg-white">
                      <Typography variant="body" color="secondary" className="leading-relaxed">
                        主に育児中の親御さんを対象としていますが、子育てに関わる全ての方（祖父母、保育士、ベビーシッターなど）にもご利用いただけます。年齢や性別を問わず、どなたでもお気軽にお使いください。
                      </Typography>
                    </div>
                  </details>
                </div>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-4">AIキャラクターについて</Typography>
                
                <div className="space-y-4">
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100">
                      <Typography variant="body" weight="medium" color="primary">
                        3つのAIキャラクターの違いは何ですか？
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 border border-blue-200 border-t-0 rounded-b-lg bg-white">
                      <Typography variant="body" color="secondary" className="leading-relaxed">
                        <strong>たまさん</strong>：お母さんのような優しさで包み込むキャラクター<br />
                        <strong>まどか姉さん</strong>：明るく元気なお姉さんタイプ<br />
                        <strong>ヒデじい</strong>：人生経験豊富なおじいちゃんタイプ<br />
                        それぞれ異なる話し方や反応で、あなたの気分に合わせて選択できます。
                      </Typography>
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100">
                      <Typography variant="body" weight="medium" color="primary">
                        キャラクターを途中で変更できますか？
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 border border-blue-200 border-t-0 rounded-b-lg bg-white">
                      <Typography variant="body" color="secondary" className="leading-relaxed">
                        はい、いつでも変更可能です。チャット画面の設定アイコンから「キャラクター変更」を選択してください。変更後も、これまでの会話履歴や成長の木は引き継がれます。
                      </Typography>
                    </div>
                  </details>
                </div>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-4">機能について</Typography>
                
                <div className="space-y-4">
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100">
                      <Typography variant="body" weight="medium" color="primary">
                        「ほめの実」とは何ですか？
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 border border-green-200 border-t-0 rounded-b-lg bg-white">
                      <Typography variant="body" color="secondary" className="leading-relaxed">
                        AIとの会話で感情的なキーワード（嬉しい、疲れた、愛情など）が検出されると生成される「実」です。あなたの心の動きを記録し、成長の木に実ります。実をクリックすると、その時の会話を振り返ることができます。
                      </Typography>
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100">
                      <Typography variant="body" weight="medium" color="primary">
                        成長の木はどのように育ちますか？
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 border border-green-200 border-t-0 rounded-b-lg bg-white">
                      <Typography variant="body" color="secondary" className="leading-relaxed">
                        AIとの会話回数に応じて6段階で成長します。芽→小さな苗→若木→中木→大木→完全成長の順で育ち、各段階で木の見た目が変化します。継続的な利用により、あなただけの成長記録が形になります。
                      </Typography>
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100">
                      <Typography variant="body" weight="medium" color="primary">
                        グループチャットとは何ですか？
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 border border-green-200 border-t-0 rounded-b-lg bg-white">
                      <Typography variant="body" color="secondary" className="leading-relaxed">
                        プレミアムプラン限定機能で、3つのAIキャラクター全員と同時にチャットできます。それぞれ異なる視点からのアドバイスや励ましを受けられるため、より多角的なサポートが得られます。
                      </Typography>
                    </div>
                  </details>
                </div>
              </section>

              <section>
                <Typography variant="h4" color="primary" className="mb-4">セキュリティとプライバシー</Typography>
                
                <div className="space-y-4">
                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100">
                      <Typography variant="body" weight="medium" color="primary">
                        会話内容は他の人に見られませんか？
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 border border-purple-200 border-t-0 rounded-b-lg bg-white">
                      <Typography variant="body" color="secondary" className="leading-relaxed">
                        いいえ、あなたの会話内容は暗号化されて保存され、他のユーザーが閲覧することはできません。運営側も、技術的な問題解決やサービス改善の目的でのみアクセスし、プライバシーを厳重に保護しています。
                      </Typography>
                    </div>
                  </details>

                  <details className="group">
                    <summary className="flex items-center justify-between p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100">
                      <Typography variant="body" weight="medium" color="primary">
                        データはどのくらい保存されますか？
                      </Typography>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-4 border border-purple-200 border-t-0 rounded-b-lg bg-white">
                      <Typography variant="body" color="secondary" className="leading-relaxed">
                        一般プランでは30日間、プレミアムプランでは180日間保存されます。保存期間を過ぎたデータは自動的に削除されます。アカウント削除時は、すべてのデータが即座に削除されます。
                      </Typography>
                    </div>
                  </details>
                </div>
              </section>

              <section className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <Typography variant="body" color="secondary" className="text-center">
                  その他ご質問がございましたら、<br />
                  お気軽にお問い合わせフォームまたはsupport@homebiyori.comまでご連絡ください。
                </Typography>
              </section>
            </div>
          )
        };

      default:
        return {
          title: 'ページが見つかりません',
          icon: <FileText className="w-6 h-6" />,
          content: (
            <Typography variant="body" color="secondary">
              お探しのページが見つかりませんでした。
            </Typography>
          )
        };
    }
  };

  const pageContent = getPageContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      {/* ナビゲーションヘッダー */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => onNavigate('landing')}
          >
            戻る
          </Button>

          <div className="flex items-center space-x-2">
            {pageContent.icon}
            <Typography variant="h4" color="primary">
              {pageContent.title}
            </Typography>
          </div>

          <div className="w-16" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto p-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden"
        >
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
              <div className="text-emerald-600">
                {pageContent.icon}
              </div>
            </div>
            <Typography variant="h2" color="neutral" className="text-white">
              {pageContent.title}
            </Typography>
          </div>

          {/* コンテンツ */}
          <div className="p-8">
            {pageContent.content}
          </div>

          {/* フッター */}
          <div className="bg-gray-50 p-6 text-center border-t">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate('landing')}
            >
              トップページに戻る
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StaticPages;