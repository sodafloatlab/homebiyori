/**
 * Landing Page - SSG対応版
 * 
 * ■機能概要■
 * - Homebiyoriランディングページ（SSG最適化）
 * - 静的生成でSEO最適化
 * - クライアントサイド機能分離
 * - メタデータ最適化
 */

import type { Metadata } from 'next';
import HomePageClient from '@/components/features/HomePageClient';

// メタデータ設定（SSG対応）
export const metadata: Metadata = {
  title: 'ほめびより - 育児を頑張るあなたを褒めるAI',
  description: 'AIが優しく寄り添い、育児の努力を認めて褒めてくれる。忙しい毎日の中で、自己肯定感を高めるひとときを。7日間無料トライアル実施中。',
  keywords: ['育児', 'AI', '褒める', 'サポート', '無料トライアル', '子育て', '自己肯定感'],
  openGraph: {
    title: 'ほめびより - 育児を頑張るあなたを褒めるAI',
    description: 'AIが優しく寄り添い、育児の努力を認めて褒めてくれる。7日間無料トライアル実施中。',
    type: 'website',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ほめびより - 育児を頑張るあなたを褒めるAI',
    description: 'AIが優しく寄り添い、育児の努力を認めて褒めてくれる。7日間無料トライアル実施中。',
  },
};

export default function HomePage() {

  // 主要機能の定義（重要度順）- 静的データ
  const features = [
    {
      iconType: "Heart",
      title: "毎日の頑張りを褒めてくれる",
      description: "育児の小さな努力も見逃さず、AIが優しく褒めて自己肯定感を高めます",
      benefit: "やる気アップ",
      color: "from-pink-400 to-rose-500",
      bgColor: "bg-pink-50"
    },
    {
      iconType: "TrendingUp",
      title: "成長が目に見えて分かる",
      description: "あなたの育児努力が「成長の木」として可視化され、達成感が得られます",
      benefit: "継続しやすい",
      color: "from-emerald-400 to-green-500",
      bgColor: "bg-cyan-100"
    },
    {
      iconType: "Users",
      title: "3人のAIがいつでも支える",
      description: "個性豊かなAIキャラクターが、いつでもあなたをサポート",
      benefit: "孤独感解消",
      color: "from-blue-400 to-indigo-500",
      bgColor: "bg-blue-50"
    }
  ];

  // ユーザージャーニーの説明 - 静的データ
  const journeySteps = [
    {
      step: 1,
      title: "簡単ログイン",
      description: "Googleアカウントでワンクリックログイン",
      iconType: "CheckCircle"
    },
    {
      step: 2,
      title: "AIキャラクター選択",
      description: "今の気分に合わせてAIを選択",
      iconType: "Heart"
    },
    {
      step: 3,
      title: "チャット開始",
      description: "今日の育児について話してみましょう",
      iconType: "CheckCircle"
    }
  ];

  // AIキャラクター情報 - 静的データ
  const characters = [
    {
      name: "みっちゃん", 
      role: "mittyan",
      color: "bg-pink-50 border-pink-200",
      gradientColor: "from-pink-400 to-rose-500",
      bgColor: "bg-pink-50",
      description: "優しく包み込む温かさ",
      image: "/images/icons/mittyan.png",
      personality: "母親のような温かさ",
      strength: "心に寄り添う優しさ",
      approach: "あなたの気持ちを理解し、包み込むように褒めてくれます",
      benefits: ["疲れた心を癒す", "自己肯定感向上", "温かい励まし"],
      examples: [
        "「今日も一日お疲れさま。あなたの頑張り、ちゃんと見ていますよ」",
        "「完璧じゃなくても大丈夫。そのままのあなたが素敵です」",
        "「小さなことでも、それは愛情の表れですね」"
      ]
    },
    {
      name: "まどかさん", 
      role: "madokasan",
      color: "bg-sky-50 border-sky-200",
      gradientColor: "from-blue-400 to-indigo-500",
      bgColor: "bg-blue-50",
      description: "お姉さん的な頼もしいサポート",
      image: "/images/icons/madokasan.png",
      personality: "頼れるお姉さん",
      strength: "前向きなエネルギー",
      approach: "明るく元気に、あなたの頑張りを全力で応援してくれます",
      benefits: ["やる気アップ", "前向き思考", "明るい気持ち"],
      examples: [
        "「すごいじゃないですか！その調子で頑張っていきましょう！」",
        "「大丈夫、あなたなら必ずできます。私が応援していますから！」",
        "「その前向きな気持ち、とても素敵です！」"
      ]
    },
    {
      name: "ヒデじい",
      role: "hideji", 
      color: "bg-amber-50 border-amber-200",
      gradientColor: "from-yellow-400 to-orange-500",
      bgColor: "bg-amber-50",
      description: "人生経験豊富な温かな励まし",
      image: "/images/icons/hideji.png",
      personality: "人生の先輩",
      strength: "深い洞察力と包容力",
      approach: "長い人生経験から、あなたの成長を見守り励ましてくれます",
      benefits: ["人生の知恵", "深い理解", "穏やかな安心感"],
      examples: [
        "「その気持ちが一番大切じゃよ。人間としての成長を感じるよ」",
        "「わしの長い人生から言わせてもらうと、それは立派なことじゃ」",
        "「昔も今も、親の愛は変わらんからのう。安心するがよい」"
      ]
    }
  ];

  // クライアントコンポーネントに静的データを渡す
  return (
    <HomePageClient 
      characters={characters}
      features={features}
      journeySteps={journeySteps}
    />
  );
}
