'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AiRole } from './AiRoleSelector';
import AiIcon, { getAiRoleName } from './AiIcon';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  aiRole?: AiRole;
}

interface TreeShadeChatProps {
  isVisible: boolean;
  onClose: () => void;
  aiRole: AiRole;
}


const generateAiResponse = (userMessage: string, aiRole: AiRole): string => {
  const responses = {
    tama: [
      'そうですね、育児は本当に大変ですが、あなたは素晴らしい親御さんです。',
      'お疲れさまでした。今日も一日がんばられましたね。',
      'お子さんのことを大切に思うあなたの気持ち、とても温かいです。',
      '無理をせず、ゆっくり休んでくださいね。あなたの頑張りを見ています。',
      '小さなことでも、それは大きな愛情の表れです。自信を持ってください。',
      '今日のあなたの努力、きっとお子さんにも伝わっていますよ。'
    ],
    madoka: [
      'その気持ち、よくわかります！育児って本当に予想外の連続ですよね。',
      'すごいじゃないですか！その調子で頑張っていきましょう。',
      '大丈夫、あなたなら必ずできます。私が応援していますから！',
      'そういう風に考えられるなんて、本当に素晴らしい視点ですね。',
      '一歩一歩でいいんです。確実に前に進んでいますよ。',
      'その前向きな気持ち、とても素敵です。きっといい方向に向かいますよ。'
    ],
    hide: [
      'ほほう、そういうことがあったのじゃな。人生いろいろあるもんじゃ。',
      'よくやっておる。その気持ちが一番大切じゃよ。',
      'わしの長い人生から言わせてもらうと、それは立派なことじゃ。',
      '昔も今も、親の愛は変わらんからのう。安心するがよい。',
      'そういう小さなことに喜びを見つけるのが、人生の秘訣じゃよ。',
      'なかなかできることではないぞ。誇りに思うがよい。'
    ]
  };

  const roleResponses = responses[aiRole];
  return roleResponses[Math.floor(Math.random() * roleResponses.length)];
};

export default function TreeShadeChat({ isVisible, onClose, aiRole }: TreeShadeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      // 初回表示時の挨拶メッセージ
      const greetings = {
        tama: 'こんにちは。今日はどんな一日でしたか？何でもお話しください。',
        madoka: 'お疲れさまです！今日はどんなことがありましたか？',
        hide: 'ほほう、今日はどんなことがあったのじゃな？'
      };

      setTimeout(() => {
        setMessages([{
          id: '1',
          text: greetings[aiRole],
          sender: 'ai',
          timestamp: Date.now(),
          aiRole
        }]);
      }, 500);
    }
  }, [isVisible, aiRole, messages.length]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // AI応答を生成（少し遅延を付けてリアルな感じに）
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: generateAiResponse(inputText, aiRole),
        sender: 'ai',
        timestamp: Date.now(),
        aiRole
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // 1-2秒のランダムな遅延
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getAiCharacterInfo = () => {
    const info = {
      tama: { name: 'たまさん', emoji: '🌸', color: 'pink' },
      madoka: { name: 'まどか姉さん', emoji: '💙', color: 'blue' },
      hide: { name: 'ヒデじい', emoji: '⭐', color: 'yellow' }
    };
    return info[aiRole];
  };

  const characterInfo = getAiCharacterInfo();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-md h-[600px] shadow-2xl overflow-hidden"
      >
        {/* ヘッダー */}
        <div className={`p-4 ${
          characterInfo.color === 'pink' ? 'bg-pink-100' :
          characterInfo.color === 'blue' ? 'bg-blue-100' : 'bg-yellow-100'
        } border-b border-gray-200`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AiIcon 
                aiRole={aiRole} 
                size={48} 
                className="border-2 border-white shadow-md" 
              />
              <div>
                <h3 className="font-bold text-gray-800">{characterInfo.name}</h3>
                <p className="text-sm text-gray-600">つぶやきの木陰でおしゃべり</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl p-1"
            >
              ×
            </button>
          </div>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 p-4 overflow-y-auto h-[400px] bg-gradient-to-b from-green-50 to-blue-50">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block max-w-[80%] p-3 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-gray-200 text-gray-900'
                      : characterInfo.color === 'pink' ? 'bg-pink-200 text-pink-900 border border-pink-300' :
                        characterInfo.color === 'blue' ? 'bg-blue-200 text-blue-900 border border-blue-300' :
                        'bg-yellow-200 text-yellow-900 border border-yellow-300'
                  }`}
                >
                  {message.sender === 'ai' && (
                    <div className="flex items-center space-x-2 mb-2">
                      <AiIcon 
                        aiRole={aiRole} 
                        size={24} 
                      />
                      <div className="text-xs font-medium opacity-80">{characterInfo.name}</div>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed">{message.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-left mb-4"
            >
              <div className={`inline-block p-3 rounded-2xl border ${
                characterInfo.color === 'pink' ? 'bg-pink-200 border-pink-300' :
                characterInfo.color === 'blue' ? 'bg-blue-200 border-blue-300' : 'bg-yellow-200 border-yellow-300'
              }`}>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex space-x-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="今日のことや気持ちを話してみませんか..."
              className="flex-1 p-3 border border-gray-300 rounded-xl resize-none h-12 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-500"
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className={`px-4 py-2 rounded-xl text-white font-medium transition-colors ${
                !inputText.trim() || isTyping
                  ? 'bg-gray-300 cursor-not-allowed'
                  : characterInfo.color === 'pink' ? 'bg-pink-500 hover:bg-pink-600' :
                    characterInfo.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' :
                    'bg-yellow-500 hover:bg-yellow-600'
              }`}
            >
              送信
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Enterで送信・Shift+Enterで改行
          </p>
        </div>
      </motion.div>
    </div>
  );
}