'use client';

interface PostButtonsProps {
  onPost: (type: 'photo' | 'text') => void;
}

export default function PostButtons({ onPost }: PostButtonsProps) {
  return (
    <div className="w-full max-w-lg">
      {/* 主行動ボタン */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <button
          onClick={() => onPost('photo')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <div className="flex flex-col items-center space-y-2">
            <span className="text-2xl">📷</span>
            <span className="text-sm">写真から投稿する</span>
          </div>
        </button>
        
        <button
          onClick={() => onPost('text')}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <div className="flex flex-col items-center space-y-2">
            <span className="text-2xl">📝</span>
            <span className="text-sm">今日のえらいを書く</span>
          </div>
        </button>
      </div>
      
      {/* 投稿のヒント */}
      <div className="text-center text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
        <p>💡 小さなことでも大丈夫</p>
        <p>「今日も一日がんばった」「子供が笑ってくれた」など</p>
      </div>
    </div>
  );
}