'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Crown, Zap, Trees, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import WatercolorTree from '@/components/ui/WatercolorTree';
import NavigationHeader from '../layout/NavigationHeader';
import TouchTarget from '../ui/TouchTarget';
import Typography from '../ui/Typography';
import Button from '../ui/Button';
import { AiRole, MoodType, AppScreen, UserPlan, ChatMode, ChatHistory, ChatMessage } from './MainApp';

interface GroupChatScreenProps {
  currentMood: MoodType;
  onNavigate: (screen: AppScreen) => void;
  onAddCharacters: (count: number) => void;
  onAddFruit: (userMessage: string, aiResponse: string, emotion: string) => void;
  onAddChatHistory: (userMessage: string, aiResponse: string, aiRole: AiRole) => void;
  totalCharacters: number;
  fruits: Array<{
    id: string;
    userMessage: string;
    aiResponse: string;
    aiRole: AiRole;
    createdAt: string;
    emotion: string;
  }>;
  userPlan: UserPlan;
  chatMode: ChatMode;
  chatHistory: ChatHistory[];
  onChatModeChange: (mode: ChatMode) => void;
  globalMessages: ChatMessage[];
  onAddGlobalMessage: (message: ChatMessage) => void;
  selectedAiRole: AiRole | null;
}

const GroupChatScreen = ({ 
  currentMood, 
  onNavigate, 
  onAddCharacters,
  onAddFruit,
  onAddChatHistory,
  totalCharacters,
  fruits,
  userPlan,
  chatMode,
  chatHistory,
  onChatModeChange,
  globalMessages,
  onAddGlobalMessage,
  selectedAiRole
}: GroupChatScreenProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeAIs, setActiveAIs] = useState<AiRole[]>(['tama', 'madoka', 'hide']);
  const [lastActiveAIs, setLastActiveAIs] = useState<AiRole[]>([]);
  const [hasInitializedActiveAIs, setHasInitializedActiveAIs] = useState(false);
  const [lastChatMode, setLastChatMode] = useState<ChatMode>('normal');
  const [selectedMoodState] = useState<MoodType>(currentMood);
  
  // 文字数から木の成長段階を計算（6段階、テスト用に低い閾値）
  const calculateTreeStage = (characters: number): number => {
    if (characters < 20) return 1;    // 芽
    if (characters < 50) return 2;    // 小さな苗
    if (characters < 100) return 3;   // 若木
    if (characters < 180) return 4;   // 中木
    if (characters < 300) return 5;   // 大木
    return 6;                         // 完全成長
  };

  const [currentTreeStage, setCurrentTreeStage] = useState(() => {
    return calculateTreeStage(totalCharacters);
  });
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // グローバルメッセージとローカルメッセージの同期
  useEffect(() => {
    setMessages(globalMessages);
  }, [globalMessages]);

  // 初期化用effect
  useEffect(() => {
    if (!hasInitializedActiveAIs && globalMessages.length > 0) {
      setLastActiveAIs(activeAIs);
      setHasInitializedActiveAIs(true);
    }
  }, [activeAIs, globalMessages.length, hasInitializedActiveAIs]);

  // AI参加者変更時の通知
  useEffect(() => {
    if (hasInitializedActiveAIs) {
      const joinedAIs = activeAIs.filter(ai => !lastActiveAIs.includes(ai));
      const leftAIs = lastActiveAIs.filter(ai => !activeAIs.includes(ai));

      joinedAIs.forEach(ai => {
        const joinMessage: ChatMessage = {
          id: `system-join-${ai}-${Date.now()}`,
          text: `${characters[ai].name}がグループチャットに参加しました`,
          sender: 'system',
          timestamp: Date.now(),
          systemType: 'join',
          aiRole: ai
        };
        onAddGlobalMessage(joinMessage);
      });

      leftAIs.forEach(ai => {
        const leaveMessage: ChatMessage = {
          id: `system-leave-${ai}-${Date.now()}`,
          text: `${characters[ai].name}がグループチャットから退出しました`,
          sender: 'system',
          timestamp: Date.now(),
          systemType: 'leave',
          aiRole: ai
        };
        onAddGlobalMessage(leaveMessage);
      });

      setLastActiveAIs(activeAIs);
    }
  }, [activeAIs, hasInitializedActiveAIs, lastActiveAIs, onAddGlobalMessage]);

  // チャットモード変更時の通知
  useEffect(() => {
    if (lastChatMode !== chatMode && globalMessages.length > 0) {
      const modeMessage: ChatMessage = {
        id: `system-mode-${Date.now()}`,
        text: `${chatMode === 'normal' ? 'ノーマルモード' : 'ディープモード'}に切り替わりました`,
        sender: 'system',
        timestamp: Date.now(),
        systemType: 'mode-change'
      };
      onAddGlobalMessage(modeMessage);
    }
    setLastChatMode(chatMode);
  }, [chatMode, lastChatMode, onAddGlobalMessage]);


  const characters = {
    tama: {
      name: 'たまさん',
      image: '/images/icons/tamasan.png',
      color: 'rose'
    },
    madoka: {
      name: 'まどか姉さん',
      image: '/images/icons/madokanesan.png',
      color: 'sky'
    },
    hide: {
      name: 'ヒデじい',
      image: '/images/icons/hideji.png',
      color: 'amber'
    }
  };

  // 感情検出関数（キーワードベース）
  const detectEmotion = (text: string): string | null => {
    const emotions = {
      '疲れ': ['疲れ', 'つかれ', '疲労', 'しんどい', 'きつい', '大変'],
      '嬉しい': ['嬉しい', 'うれしい', '楽しい', 'たのしい', '幸せ', 'よかった'],
      '大変': ['大変', '困った', '悩み', '問題', 'トラブル', '心配'],
      '愛情': ['愛', '大好き', '愛情', '愛しい', 'かわいい', '素敵'],
      '不安': ['不安', '心配', '気になる', 'どうしよう', '迷う', '悩む']
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return emotion;
      }
    }
    return null;
  };

  // 成長通知メッセージ生成
  const generateGrowthNotification = (aiRole: AiRole, newStage: number): string => {
    const stageNames = {
      1: '芽',
      2: '小さな苗',
      3: '若木',
      4: '中木',
      5: '大木',
      6: '完全成長'
    };

    const stageName = stageNames[newStage as keyof typeof stageNames] || '成長';

    const notifications = {
      tama: [
        `✨ わあ！あなたの成長の木が「${stageName}」に成長しました！毎日の頑張りが実を結んでいますね。本当に素晴らしいです！`,
        `🌱 おめでとうございます！「${stageName}」への成長を達成されました。あなたの愛情深い育児が、こうして目に見える形になっているんですね。`,
        `💚 成長の木が「${stageName}」になりました！あなたの日々の努力と愛情が、着実に積み重なっている証拠です。心から応援しています！`
      ],
      madoka: [
        `🎉 きゃー！すごいです！あなたの木が「${stageName}」に成長しちゃいました！毎日の頑張りが本当に実っていますね！`,
        `✨ おめでとうございます！「${stageName}」への成長達成です！あなたの愛情がこうして形になるなんて、見ていて本当に嬉しいです！`,
        `🌟 わあ！「${stageName}」に成長しました！あなたの育児への真摯な取り組みが、こんなに素敵な結果を生んでいるんですね！`
      ],
      hide: [
        `🌳 ほほう、見事じゃな！あなたの木が「${stageName}」に成長したぞ。日々の愛情と努力が、こうして実を結んでおる。`,
        `✨ おめでとうじゃ！「${stageName}」への成長を達成されたな。あなたの育児への真摯な姿勢が、このような素晴らしい結果を生んでおる。`,
        `🍃 立派なものじゃ！「${stageName}」に成長するとは。あなたの日々の頑張りが、着実に積み重なっておる証拠じゃな。`
      ]
    };

    const messages = notifications[aiRole];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // パーソナライズされたAI応答生成（履歴を考慮）
  const generatePersonalizedResponse = (inputMessage: string, aiRole: AiRole, mood: MoodType): string => {
    // 過去の会話から文脈を取得（将来的にパーソナライゼーションで使用）
    const _recentHistory = chatHistory.slice(-5); // 最新5件
    const _hasHistory = _recentHistory.length > 0; // eslint-disable-line @typescript-eslint/no-unused-vars
    
    // ディープモードかどうかで応答の長さを調整
    const isDeepMode = chatMode === 'deep';
    
    const baseResponses = {
      tama: {
        praise: isDeepMode 
          ? [
              `${inputMessage}について聞かせてくださって、ありがとうございます。あなたがこれまでお話しくださった内容を思い返すと、本当に毎日一生懸命に育児に向き合っていらっしゃることが伝わってきます。今日のお話も、そんなあなたの愛情深さの表れですね。育児は本当に大変なことも多いですが、あなたのように真摯に向き合う姿勢そのものが、お子さんにとって何よりの贈り物だと思います。時には疲れを感じることもあるでしょうが、それも含めて、あなたらしい育児のスタイルを大切にしてくださいね。`,
              `いつもお疲れさまです。あなたとお話しするたびに、育児への真剣な思いが伝わってきて、私も心が温かくなります。${inputMessage}というお気持ち、とてもよく分かります。これまでの会話を振り返ると、あなたは本当に多くのことを考え、悩み、そして愛情を注いでいらっしゃいますね。そんなあなただからこそ、今日のようなお気持ちを持たれることも自然なことだと思います。完璧である必要はありません。あなたがお子さんを想う気持ちそのものが、既に十分に素晴らしいのですから。`
            ]
          : [
              `${inputMessage}のお気持ち、とても素敵ですね。あなたらしい愛情が伝わってきます。`,
              `いつもお疲れさまです。そんな風に考えられるあなたは、本当に素晴らしいお母さんだと思います。`
            ],
        listen: isDeepMode
          ? [
              `${inputMessage}というお話、じっくりとお聞かせいただいて、ありがとうございます。あなたがこれまで私にお話しくださった内容と合わせて考えると、今回のことも、あなたなりの深い愛情から生まれた想いなのだろうと感じています。育児をしていると、様々な感情が心の中を巡りますよね。嬉しいこと、不安なこと、疲れること、そして愛おしいこと。そのすべてが、あなたの大切な経験として積み重なっていると思います。今お感じになっていることも、きっと意味のあることです。一人で抱え込まず、こうしてお話しくださることで、私も一緒に考えることができて嬉しいです。`,
              `そのようなことがあったのですね。あなたの過去のお話も含めて考えると、いつも真剣に向き合っていらっしゃる姿が浮かびます。${inputMessage}というのは、きっと多くの親御さんが経験することだと思いますが、あなたの場合は特に、お子さんのことを深く考えていらっしゃるからこその想いなのでしょうね。時には答えが見つからないことや、迷うこともあるかもしれませんが、こうして一つ一つのことに丁寧に向き合っているあなたの姿勢は、本当に尊敬します。どんな小さなことでも、また聞かせてくださいね。`
            ]
          : [
              `${inputMessage}について、お聞かせいただいてありがとうございます。あなたのお気持ち、よく分かります。`,
              `そうでしたか。いつも一生懸命なあなたらしいですね。`
            ]
      },
      madoka: {
        praise: isDeepMode
          ? [
              `わあ！${inputMessage}って聞いて、もう本当に素晴らしいなって思います！あなたとお話しするようになってから、いつも感じているんですが、本当に愛情深くて、お子さんのことを一番に考えていらっしゃるんですよね。今回のお話も、そんなあなたの優しさがにじみ出ていて、私も一緒に嬉しくなっちゃいました！育児って、楽しいこともあれば大変なこともたくさんあると思うんですが、あなたみたいに前向きに、そして愛情たっぷりに向き合っている姿を見ていると、お子さんも本当に幸せだろうなって思います。これからも、あなたらしく、無理をしすぎずに、でも愛情はたっぷりと注いでいってくださいね！私も応援しています！`,
              `きゃー！本当に素敵です！${inputMessage}なんて、もう聞いているだけで心がぽかぽかしてきます！あなたってば、いつも本当に素晴らしいアイデアや想いを持っていらっしゃいますよね。これまでの会話でも感じていましたが、お子さんのことを本当に大切に想っていて、そして自分なりの育児スタイルを一生懸命見つけようとしている姿が、もう本当に尊敬しちゃいます！時には迷ったり、疲れたりすることもあるかもしれませんが、そんな時でもあなたの根底にある愛情は絶対に変わらないし、それがお子さんにもちゃんと伝わっていると思うんです。一緒に楽しく育児していきましょうね！`
            ]
          : [
              `${inputMessage}だなんて、もう本当に素敵です！あなたの愛情がひしひしと伝わってきます！`,
              `わあ！素晴らしいですね！そんな風に考えられるなんて、本当に優しいお母さんですね！`
            ],
        listen: isDeepMode
          ? [
              `${inputMessage}というお話、真剣に聞かせていただきました。あなたがこれまでお話しくださった内容も含めて考えると、いつも本当に深くお子さんのことを考えていらっしゃることが伝わってきます。今回のことも、きっと愛情があるからこその悩みや想いなんだと思います。育児をしていると、正解が分からなくて迷うことってたくさんありますよね。でも、こうして一つ一つのことを大切に考えて、悩んで、そして愛情を注いでいるあなたの姿勢そのものが、もう既に最高の育児だと私は思うんです。完璧である必要なんてありません。あなたがお子さんを想う気持ちがあれば、それで十分です。もし辛いときや迷ったときは、また遠慮なくお話しくださいね。私も一緒に考えさせていただきます！`,
              `そういうことがあったんですね。お話を聞かせていただいて、ありがとうございます。あなたのこれまでの会話を思い返すと、いつも真剣にお子さんと向き合っていらっしゃる姿が浮かんできます。${inputMessage}というのも、そんなあなただからこその深い想いなのだと感じました。育児って、本当に答えのないことばかりで、時には自分が正しいことをしているのか分からなくなることもありますよね。でも、こうして悩むことができるということ自体が、あなたの愛情の深さの証拠だと思うんです。お子さんにとって、完璧なお母さんである必要はありません。あなたらしく、愛情を持って接していれば、それが一番の贈り物です。辛いときは一人で抱え込まずに、また聞かせてくださいね！`
            ]
          : [
              `${inputMessage}について、お話しくださってありがとうございます。あなたの想い、ちゃんと伝わっています。`,
              `そうだったんですね。いつも真剣に考えていらっしゃるあなたらしいです。`
            ]
      },
      hide: {
        praise: isDeepMode
          ? [
              `ほほう、${inputMessage}とは、なかなか良いことを言うではないか。わしがこれまであなたとお話しした中でも、そのような愛情深い想いをたびたび聞かせてもらっているが、今回もまた、あなたの人柄の良さがよく表れておるな。育児というものは、昔からずっと変わらぬもので、親が子を想う気持ちというのは、どの時代も同じじゃ。あなたのように、日々の小さなことにも心を配り、愛情を注いでいる姿を見ておると、わしも嬉しくなってくる。時には疲れることもあろうし、迷うこともあるじゃろうが、それもまた育児の大切な一部じゃ。完璧を目指す必要はない。あなたがお子さんを想う、その純粋な気持ちこそが、何よりも大切なのじゃからな。これからも、あなたらしく、無理をせずに歩んでいってくれ。`,
              `うむうむ、${inputMessage}とは、実に素晴らしい心がけじゃな。あなたとの会話を重ねるたびに感じるのは、本当に真摯に育児と向き合っておられるということじゃ。わしも長い間生きてきたが、あなたのような愛情深い親御さんに出会うと、心が温かくなるものじゃよ。育児というのは、マニュアル通りにはいかぬもの。一人一人の子どもも違えば、親も違う。だからこそ、あなたのように一つ一つのことに愛情を込めて向き合う姿勢が大切なのじゃ。今日のお話も、そんなあなたの優しさがよく表れておる。これからも、自信を持って、あなたらしい育児を続けていってくれ。わしも陰ながら応援しておるからな。`
            ]
          : [
              `${inputMessage}とは、なかなか良いことを言うな。あなたの愛情の深さがよく分かるぞ。`,
              `ほほう、そのような想いを持てるとは、立派なものじゃ。`
            ],
        listen: isDeepMode
          ? [
              `${inputMessage}という話、じっくりと聞かせてもらったぞ。あなたがこれまでわしに話してくれた内容を思い返してみると、いつも真剣に、そして愛情深くお子さんと向き合っておられることがよく分かる。今回のことも、そんなあなたらしい深い想いから生まれたものじゃろうな。わしも長い人生を歩んできたが、育児というのは本当に奥が深いものじゃ。正解というものはなく、一人一人の親が、その時その時の状況に応じて、愛情を持って判断していくしかない。あなたのように、一つ一つのことを大切に考え、悩み、そして愛情を注いでいる姿勢こそが、最も大切なことじゃ。時には迷うこともあろうし、疲れることもあるじゃろう。それでも構わん。そうした経験すべてが、あなたを成長させ、より良い親にしてくれるのじゃからな。`,
              `そのようなことがあったのか。話を聞かせてくれて、ありがとうな。あなたの過去の話と合わせて考えてみると、${inputMessage}というのも、あなたなりの深い愛情から生まれた想いなのじゃろう。育児をしておると、様々な感情が心を巡るものじゃ。喜び、悲しみ、不安、愛おしさ...そのすべてが、親としての大切な経験となっていく。あなたが今感じておられることも、きっと意味のあることじゃ。一人で悩むことはない。こうしてわしに話してくれることで、少しでも心が軽くなるなら、それで良い。育児に完璧は求められぬ。あなたがお子さんを想う、その純粋な気持ちがあれば、それで十分なのじゃからな。また何か話したいことがあったら、遠慮なく聞かせてくれ。`
            ]
          : [
              `${inputMessage}について、話してくれてありがとうな。あなたの気持ち、よく分かるぞ。`,
              `そうじゃったか。いつも真剣に考えておられるあなたらしいな。`
            ]
      }
    };

    const responses = baseResponses[aiRole][mood];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // メッセージ送信処理
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    // AIキャラクターが選択されていない場合の警告
    if (activeAIs.length === 0) {
      alert('参加するAIキャラクターを選択してください');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now()
    };

    onAddGlobalMessage(userMessage);

    // 文字数を追加
    const messageLength = inputText.length;
    const newTotalCharacters = totalCharacters + messageLength;
    onAddCharacters(messageLength);

    // 感情検出
    const detectedEmotion = detectEmotion(inputText);

    // 成長チェック
    const newStage = calculateTreeStage(newTotalCharacters);
    const hasGrown = newStage > currentTreeStage;

    if (hasGrown) {
      setCurrentTreeStage(newStage);
    }

    setInputText('');
    setIsTyping(true);

    // AIの回答順序をランダム化
    const shuffledAIs = [...activeAIs].sort(() => Math.random() - 0.5);

    // 各AIキャラクターからランダム順序で応答
    shuffledAIs.forEach((aiRole, index) => {
      setTimeout(() => {
        const aiResponseText = generatePersonalizedResponse(inputText, aiRole, selectedMoodState);
        const aiResponse: ChatMessage = {
          id: (Date.now() + index + 1).toString(),
          text: aiResponseText,
          sender: 'ai',
          timestamp: Date.now(),
          aiRole: aiRole,
          mood: selectedMoodState
        };

        onAddGlobalMessage(aiResponse);
        
        // チャット履歴に追加
        onAddChatHistory(inputText, aiResponseText, aiRole);

        // 最初のAIの応答でのみほめの実を生成
        if (index === 0 && detectedEmotion) {
          onAddFruit(inputText, aiResponseText, detectedEmotion);
        }

        // 最後のAIの応答の後に成長通知とタイピング状態を解除
        if (index === shuffledAIs.length - 1) {
          // 成長があった場合、最後に回答したAIが成長通知を行う
          if (hasGrown) {
            setTimeout(() => {
              const growthNotificationText = generateGrowthNotification(aiRole, newStage);
              const growthNotification: ChatMessage = {
                id: (Date.now() + 1000).toString(),
                text: growthNotificationText,
                sender: 'ai',
                timestamp: Date.now(),
                aiRole: aiRole,
                mood: selectedMoodState
              };
              onAddGlobalMessage(growthNotification);
            }, 1000); // 1秒後に成長通知
          }
          setIsTyping(false);
        }
      }, 1500 * (index + 1)); // 各AIが1.5秒間隔で応答
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enterで改行
        return;
      } else {
        // Enterで送信
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  // 感情アイコン送信
  const handleEmotionSend = (emotion: string) => {
    // AIキャラクターが選択されていない場合の警告
    if (activeAIs.length === 0) {
      alert('参加するAIキャラクターを選択してください');
      return;
    }

    const emotionMessage: ChatMessage = {
      id: Date.now().toString(),
      text: '',
      sender: 'user',
      timestamp: Date.now(),
      emotion
    };

    onAddGlobalMessage(emotionMessage);
    setIsTyping(true);

    const emotionResponses = {
      '😔': 'その顔…今日はたいへんだったね。',
      '😠': 'むっとした気持ち、よくわかります。',
      '🥲': 'いまは、なにも言わなくても大丈夫だよ。',
      '😴': 'お疲れのようですね。ゆっくり休んでください。',
      '😊': 'いい表情ですね。何か嬉しいことがあったのかな？'
    };

    // 代表一名（最初のアクティブAI）が応答
    const respondingAI = activeAIs[0];
    setTimeout(() => {
      const response = emotionResponses[emotion as keyof typeof emotionResponses] || 'その気持ち、受け取りました。';
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        timestamp: Date.now(),
        aiRole: respondingAI,
        mood: selectedMoodState
      };

      onAddGlobalMessage(aiResponse);
      setIsTyping(false);
    }, 800);
  };

  const toggleAI = (aiRole: AiRole) => {
    setActiveAIs(prev => 
      prev.includes(aiRole) 
        ? prev.filter(role => role !== aiRole)
        : [...prev, aiRole]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100">
      {/* NavigationHeader */}
      <NavigationHeader
        currentScreen="group-chat"
        title="グループチャット"
        subtitle="3人のAIと一緒にチャット"
        onNavigate={onNavigate}
        previousScreen="character-selection"
        userPlan={userPlan}
      />
      
      {/* アクションバー */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-emerald-100 p-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            <Typography variant="body" color="secondary" className="text-sm">
              プレミアム限定機能
            </Typography>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* ディープモード切り替え */}
            <TouchTarget
              onClick={() => onChatModeChange(chatMode === 'normal' ? 'deep' : 'normal')}
              className={`flex items-center space-x-1 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                chatMode === 'deep'
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{chatMode === 'deep' ? 'ディープ' : 'ノーマル'}</span>
              {chatMode === 'deep' && <Crown className="w-3 h-3" />}
            </TouchTarget>
            
            <TouchTarget
              onClick={() => onNavigate(selectedAiRole ? 'chat' : 'character-selection')}
              className="flex items-center space-x-1 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>1:1チャット</span>
            </TouchTarget>
            
            <TouchTarget
              onClick={() => onNavigate('tree')}
              className="flex items-center px-3 py-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-sm font-medium"
            >
              <Trees className="w-4 h-4 mr-1" />
              木を見る
            </TouchTarget>
          </div>
        </div>
      </div>

      {/* AIキャラクター選択（固定表示） */}
      <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-sm border-b border-emerald-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Typography variant="small" weight="medium" color="primary" className="mb-3">
            参加するAIキャラクター
          </Typography>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(characters) as AiRole[]).map((aiRole) => {
              const character = characters[aiRole];
              const isActive = activeAIs.includes(aiRole);
              return (
                <TouchTarget
                  key={aiRole}
                  onClick={() => toggleAI(aiRole)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${
                    aiRole === 'tama' ? 'bg-pink-400' :
                    aiRole === 'madoka' ? 'bg-blue-400' :
                    'bg-yellow-400'
                  }`}></div>
                  <Typography variant="small" weight="medium" className={isActive ? 'text-white' : 'text-emerald-700'}>
                    {character.name}
                  </Typography>
                </TouchTarget>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-80">

        {/* 背景の木 */}
        {isMounted && (
          <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-40 pointer-events-none z-0">
            <motion.div
              key={`tree-${currentTreeStage}`}
              initial={{ scale: 0.9, opacity: 0.3 }}
              animate={{ scale: 1.1, opacity: 0.4 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="w-[400px] h-[400px]"
              style={{ filter: 'contrast(1.1) brightness(1.1) saturate(0.8)' }}
            >
              <WatercolorTree ageInDays={currentTreeStage * 100} isBackground={true} fruits={fruits} />
            </motion.div>
          </div>
        )}

        {/* チャットメッセージ */}
        <div className="space-y-4 relative z-10">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${
                  message.sender === 'system' 
                    ? 'justify-center' 
                    : message.sender === 'user' 
                      ? 'justify-end' 
                      : 'justify-start'
                }`}
              >
                {message.sender === 'system' ? (
                  /* システムメッセージ */
                  <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full border border-gray-200 max-w-sm text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {message.systemType === 'join' && (
                        <div className={`w-2 h-2 rounded-full ${
                          message.aiRole === 'tama' ? 'bg-pink-400' :
                          message.aiRole === 'madoka' ? 'bg-blue-400' :
                          message.aiRole === 'hide' ? 'bg-yellow-400' :
                          'bg-green-400'
                        }`}></div>
                      )}
                      {message.systemType === 'leave' && (
                        <div className={`w-2 h-2 rounded-full ${
                          message.aiRole === 'tama' ? 'bg-pink-400' :
                          message.aiRole === 'madoka' ? 'bg-blue-400' :
                          message.aiRole === 'hide' ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`}></div>
                      )}
                      {message.systemType === 'mode-change' && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      )}
                      <span>{message.text}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ) : (
                  <div className={`max-w-xs lg:max-w-md ${
                    message.sender === 'user' ? 'order-1' : 'order-2'
                  }`}>
                    {message.sender === 'ai' && message.aiRole && (
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-200 mr-2">
                          <Image
                            src={characters[message.aiRole].image}
                            alt={characters[message.aiRole].name}
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        </div>
                        <span className="text-sm text-emerald-700 font-medium">{characters[message.aiRole].name}</span>
                      </div>
                    )}
                    
                    <div className={`px-4 py-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/80 backdrop-blur-sm text-emerald-800 border border-emerald-100'
                    }`}>
                      {message.emotion ? (
                        <span className="text-2xl">{message.emotion}</span>
                      ) : (
                        <Typography variant="small" className={`leading-relaxed whitespace-pre-line ${
                          message.sender === 'user' ? 'text-white' : ''
                        }`}>
                          {message.text}
                        </Typography>
                      )}
                    </div>
                    
                    <div className={`mt-1 text-xs text-gray-500 ${
                      message.sender === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-200">
                  <Image
                    src="/images/icons/madokanesan.png"
                    alt="AI"
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-emerald-100 px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 入力エリア */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-emerald-100 p-4 z-50">
        <div className="max-w-4xl mx-auto">
          {/* AI注意喚起と無料版案内 */}
          <div className="mb-3 space-y-2 text-center">
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️ AIは誤った情報を提供する可能性があります。重要な判断の際は専門家にご相談ください。
            </p>
            {userPlan === 'free' && (
              <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                💬 無料版ではチャット履歴は3日間保存されます。ほめの実は永続的に残ります。
              </p>
            )}
          </div>

          {/* 感情アイコン */}
          <div className="flex justify-center space-x-4 mb-4">
            {['😊', '😔', '😠', '🥲', '😴'].map((emotion) => (
              <button
                key={emotion}
                onClick={() => handleEmotionSend(emotion)}
                className="text-2xl hover:scale-110 transition-transform"
              >
                {emotion}
              </button>
            ))}
          </div>

          {/* テキスト入力 */}
          <div className="flex space-x-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="メッセージを入力... (Shift+Enterで改行)"
              className="flex-1 px-4 py-3 bg-white border border-emerald-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-800 placeholder-gray-500"
              rows={1}
              style={{ minHeight: '50px', maxHeight: '120px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              variant="primary"
              className="px-6 py-3"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChatScreen;