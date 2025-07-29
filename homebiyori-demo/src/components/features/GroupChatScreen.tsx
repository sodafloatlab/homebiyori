'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Settings, Crown, Zap } from 'lucide-react';
import WatercolorTree from '@/components/ui/WatercolorTree';
import { AiRole, MoodType, AppScreen, UserPlan, ChatMode, ChatHistory } from './MainApp';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  aiRole?: AiRole;
  mood?: MoodType;
}

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
  onChatModeChange
}: GroupChatScreenProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeAIs, setActiveAIs] = useState<AiRole[]>(['tama', 'madoka', 'hide']);
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

  // パーソナライズされたAI応答生成（履歴を考慮）
  const generatePersonalizedResponse = (inputMessage: string, aiRole: AiRole, mood: MoodType): string => {
    // 過去の会話から文脈を取得（将来的にパーソナライゼーションで使用）
    const recentHistory = chatHistory.slice(-5); // 最新5件
    const hasHistory = recentHistory.length > 0;
    
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

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);

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

    // 各AIキャラクターから順番に応答
    activeAIs.forEach((aiRole, index) => {
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

        setMessages(prev => [...prev, aiResponse]);
        
        // チャット履歴に追加
        onAddChatHistory(inputText, aiResponseText, aiRole);

        // 最初のAIの応答でのみ実を生成
        if (index === 0 && detectedEmotion) {
          onAddFruit(inputText, aiResponseText, detectedEmotion);
        }

        // 最後のAIの応答の後にタイピング状態を解除
        if (index === activeAIs.length - 1) {
          setIsTyping(false);
        }
      }, 1500 * (index + 1)); // 各AIが1.5秒間隔で応答
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
      {/* ヘッダー */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate('character-selection')}
              className="p-2 rounded-full hover:bg-emerald-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-emerald-600" />
            </button>
            <div className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h1 className="text-xl font-bold text-emerald-800">グループチャット</h1>
              <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold rounded-full">
                PREMIUM
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* ディープモード切り替え */}
            <button
              onClick={() => onChatModeChange(chatMode === 'normal' ? 'deep' : 'normal')}
              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                chatMode === 'deep'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{chatMode === 'deep' ? 'ディープ' : 'ノーマル'}</span>
            </button>
            
            <button
              onClick={() => onNavigate('tree')}
              className="p-2 rounded-full hover:bg-emerald-100 transition-colors"
            >
              <Settings className="w-5 h-5 text-emerald-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* AIキャラクター選択 */}
        <div className="mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-emerald-100">
          <h3 className="text-sm font-medium text-emerald-700 mb-3">参加するAIキャラクター</h3>
          <div className="flex space-x-3">
            {(Object.keys(characters) as AiRole[]).map((aiRole) => {
              const character = characters[aiRole];
              const isActive = activeAIs.includes(aiRole);
              return (
                <button
                  key={aiRole}
                  onClick={() => toggleAI(aiRole)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${
                    aiRole === 'tama' ? 'bg-pink-400' :
                    aiRole === 'madoka' ? 'bg-blue-400' :
                    'bg-yellow-400'
                  }`}></div>
                  <span className="text-sm font-medium">{character.name}</span>
                </button>
              );
            })}
          </div>
        </div>

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
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-emerald-500 text-white'
                    : `bg-white/80 backdrop-blur-sm text-emerald-800 border border-emerald-100`
                }`}>
                  {message.sender === 'ai' && message.aiRole && (
                    <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-emerald-100">
                      <div className={`w-3 h-3 rounded-full ${
                        message.aiRole === 'tama' ? 'bg-pink-400' :
                        message.aiRole === 'madoka' ? 'bg-blue-400' :
                        'bg-yellow-400'
                      }`}></div>
                      <span className="text-sm font-medium text-emerald-700">
                        {characters[message.aiRole].name}
                      </span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/80 backdrop-blur-sm border border-emerald-100 px-4 py-3 rounded-2xl">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 入力エリア */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-emerald-100 p-4">
        <div className="max-w-4xl mx-auto flex space-x-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力..."
            className="flex-1 px-4 py-3 bg-white border border-emerald-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            rows={1}
            style={{ minHeight: '50px', maxHeight: '120px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChatScreen;