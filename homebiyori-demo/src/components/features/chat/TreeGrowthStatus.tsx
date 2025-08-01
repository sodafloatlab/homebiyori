'use client';

import React from 'react';
import { Trees, Heart } from 'lucide-react';
import TouchTarget from '@/components/ui/TouchTarget';
import { Fruit } from '@/types';

interface TreeGrowthStatusProps {
  currentTreeStage: number;
  totalCharacters: number;
  fruits: Fruit[];
  onNavigate: (screen: 'tree') => void;
}

const TreeGrowthStatus = ({
  currentTreeStage,
  totalCharacters,
  fruits,
  onNavigate
}: TreeGrowthStatusProps) => {
  return (
    <div className="space-y-6">
      {/* 木の成長情報 */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center">
          <Trees className="w-5 h-5 mr-2" />
          成長状況
        </h3>
        <div className="text-center space-y-3">
          <div className="bg-emerald-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-emerald-700">ステージ {currentTreeStage}/6</p>
          </div>
          <TouchTarget
            onClick={() => onNavigate('tree')}
            className="w-full bg-emerald-500 text-white py-2 rounded-lg text-center font-medium hover:bg-emerald-600 transition-colors"
          >
            木の成長を詳しく見る
          </TouchTarget>
        </div>
      </div>

      {/* ほめの実 */}
      {fruits.length > 0 && (
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            ほめの実 ({fruits.length}個)
          </h3>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {fruits.slice(-3).reverse().map((fruit) => (
              <div key={fruit.id} className="p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <span className="text-lg flex-shrink-0 mt-0.5">🌰</span>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {fruit.aiResponse}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <TouchTarget
            onClick={() => onNavigate('tree')}
            className="mt-4 w-full text-center text-sm text-emerald-600 hover:text-emerald-700"
          >
            すべての実を見る →
          </TouchTarget>
        </div>
      )}
    </div>
  );
};

export default TreeGrowthStatus;