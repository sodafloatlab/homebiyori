'use client';

import React from 'react';
import { FileText, Shield, Building2, Heart, Mail, HelpCircle } from 'lucide-react';
import Typography from '@/components/ui/Typography';
import TouchTarget from '@/components/ui/TouchTarget';
import { AppScreen } from '../features/MainApp';

interface FooterProps {
  onNavigate: (screen: AppScreen) => void;
}

const Footer = ({ onNavigate }: FooterProps) => {
  const legalLinks = [
    {
      label: '利用規約',
      screen: 'terms-of-service' as AppScreen,
      icon: <FileText className="w-4 h-4" />
    },
    {
      label: 'プライバシーポリシー',
      screen: 'privacy-policy' as AppScreen,
      icon: <Shield className="w-4 h-4" />
    },
    {
      label: '特定商取引法表記',
      screen: 'commercial-transaction' as AppScreen,
      icon: <Building2 className="w-4 h-4" />
    },
    {
      label: 'よくある質問',
      screen: 'faq' as AppScreen,
      icon: <HelpCircle className="w-4 h-4" />
    },
    {
      label: 'お問い合わせ',
      screen: 'contact' as AppScreen,
      icon: <Mail className="w-4 h-4" />
    }
  ];

  return (
    <footer className="bg-gradient-to-r from-emerald-800 to-green-800 text-white py-12 mt-auto">
      <div className="max-w-4xl mx-auto px-4">
        {/* メインフッターコンテンツ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* ブランド情報 */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start mb-4">
              <Heart className="w-6 h-6 text-pink-300 mr-2" />
              <Typography variant="h4" className="text-white font-bold">
                ほめびより
              </Typography>
            </div>
            <Typography variant="small" className="text-white">
              育児中の親をAIが優しく褒めてくれる<br />
              Webアプリケーション
            </Typography>
          </div>

          {/* 法的情報リンク */}
          <div className="text-center md:text-left">
            <Typography variant="h4" className="text-white mb-6 font-semibold">
              法的情報
            </Typography>
            <div className="space-y-4">
              {legalLinks.map((link) => (
                <div key={link.screen} className="block">
                  <TouchTarget
                    variant="button"
                    onClick={() => onNavigate(link.screen)}
                    className="inline-flex items-center space-x-2 text-white hover:text-emerald-200 transition-colors p-2 rounded-md hover:bg-emerald-900/20"
                  >
                    <span className="text-white">{link.icon}</span>
                    <Typography variant="small" className="text-white hover:underline">
                      {link.label}
                    </Typography>
                  </TouchTarget>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 区切り線 */}
        <div className="border-t border-emerald-600 my-8"></div>

        {/* コピーライト */}
        <div className="text-center">
          <Typography variant="small" className="text-white">
            © 2025 ほめびより. All rights reserved.
          </Typography>
          <Typography variant="small" className="text-white mt-2">
            Made with ❤️ for all parents
          </Typography>
        </div>

        {/* 免責事項 */}
        <div className="mt-6 p-4 bg-emerald-900/30 rounded-lg text-center">
          <Typography variant="small" className="text-white leading-relaxed">
            本サービスは育児支援を目的としており、医学的なアドバイスを提供するものではありません。<br />
            お子様の健康に関する事項については、必ず医療専門家にご相談ください。
          </Typography>
        </div>
      </div>
    </footer>
  );
};

export default Footer;