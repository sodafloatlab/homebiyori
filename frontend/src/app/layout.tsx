/**
 * Root Layout - Issue #15 新戦略対応版
 */

import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import AmplifyProvider, { AmplifyDebugInfo } from "@/components/providers/AmplifyProvider";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ほめびより - 育児を頑張るあなたを褒めるAI",
  description: "育児を頑張るあなたをAIが優しく褒めてくれる、7日間無料トライアル実施中のWebアプリケーションです。",
  keywords: "育児, AI, 褒める, サポート, 無料トライアル",
  authors: [{ name: "Homebiyori Team" }],
  openGraph: {
    title: "ほめびより - 育児を頑張るあなたを褒めるAI",
    description: "育児を頑張るあなたをAIが優しく褒めてくれるサービス",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ほめびより - 育児を頑張るあなたを褒めるAI",
    description: "育児を頑張るあなたをAIが優しく褒めてくれるサービス",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans antialiased`}>
        <AmplifyProvider>
          {children}
        </AmplifyProvider>
        <AmplifyDebugInfo />
      </body>
    </html>
  );
}
