'use client';

import { useState } from 'react';
import { AiRole } from './AiRoleSelector';
import AiIcon, { getAiRoleName } from './AiIcon';

interface PostFormProps {
  aiRole: AiRole | null;
  onSubmit: (content: string, type: 'photo' | 'text', imageFile?: File) => void;
  onClose: () => void;
  type: 'photo' | 'text';
}

const generateMockPraise = (content: string, aiRole: AiRole): string => {
  const praiseTemplates = {
    tama: [
      `「${content}」というお気持ち、とても素敵ですね。今日も一日、本当にがんばられました。`,
      `お疲れさまでした。${content}のような小さな幸せを大切にする心が、とても温かいです。`,
      `${content}ですね。そのやさしい気持ちが、きっとお子さんにも伝わっていますよ。`
    ],
    madoka: [
      `${content}なんて、さすがですね！その前向きな姿勢、本当に尊敬します。`,
      `「${content}」という発見、素晴らしいです。その調子でいけば、毎日がもっと楽しくなりますよ。`,
      `${content}に気づけるなんて、とても大切な視点を持っていらっしゃいますね。`
    ],
    hide: [
      `ほほう、「${content}」とは、よい心がけじゃのう。その気持ちが一番大切じゃ。`,
      `${content}か。そういう小さなことに喜びを見つけるのが、人生の秘訣じゃよ。`,
      `「${content}」じゃと？それはそれは、立派な心がけじゃ。きっといい親御さんじゃのう。`
    ]
  };

  const templates = praiseTemplates[aiRole];
  return templates[Math.floor(Math.random() * templates.length)];
};


export default function PostForm({ aiRole, onSubmit, onClose, type }: PostFormProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || !aiRole) return;
    
    setIsSubmitting(true);
    
    // 少し待ってからサブミット（リアルな感じを演出）
    setTimeout(() => {
      onSubmit(content, type, imageFile || undefined);
      setIsSubmitting(false);
      setContent('');
      setImageFile(null);
      onClose();
    }, 1000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {type === 'photo' ? '📷 写真から投稿' : '📝 今日のえらいを書く'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        {!aiRole && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4">
            <p className="text-yellow-800 text-sm">
              AIキャラクターを先に選択してください
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {type === 'photo' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                写真を選択
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full p-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {imageFile && (
                <p className="text-sm text-green-600 mt-1">
                  選択済み: {imageFile.name}
                </p>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              今日がんばったこと、嬉しかったこと
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="例: 子供が笑ってくれた、今日も一日がんばった、美味しいご飯を作れた..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!aiRole}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!content.trim() || !aiRole || isSubmitting}
              className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '送信中...' : '投稿する'}
            </button>
          </div>
        </form>

        {aiRole && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">
              今回褒めてくれるのは:
            </p>
            <div className="flex items-center space-x-2">
              <AiIcon 
                aiRole={aiRole} 
                size={32} 
                className="border border-gray-300" 
              />
              <p className="text-sm font-medium text-gray-800">
                {getAiRoleName(aiRole)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}