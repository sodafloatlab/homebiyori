'use client';

import { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface MockFruit {
  id: string;
  x: number;
  y: number;
  color: 'pink' | 'blue' | 'gold';
  aiRole: 'たまさん' | 'まどか姉さん' | 'ヒデじい';
  message: string;
  date: string;
  isGlowing: boolean;
}

interface SimplifiedCanvasTreeProps {
  parentingDays: number;
  fruits: MockFruit[];
  childrenNames: string[];
  onFruitClick: (fruit: MockFruit, event?: MouseEvent) => void;
}

export default function SimplifiedCanvasTree({ parentingDays, fruits, childrenNames, onFruitClick }: SimplifiedCanvasTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // 木の描画関数
  const drawTree = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // キャンバスをクリア
    ctx.clearRect(0, 0, width, height);

    // 背景のグラデーション
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.7);
    skyGradient.addColorStop(0, '#e8f4fd');
    skyGradient.addColorStop(1, '#f0f8ff');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height * 0.7);

    // 地面
    const groundGradient = ctx.createLinearGradient(0, height * 0.7, 0, height);
    groundGradient.addColorStop(0, '#8bc34a');
    groundGradient.addColorStop(1, '#689f38');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, height * 0.7, width, height * 0.3);

    // 木の幹
    const centerX = width / 2;
    const groundY = height * 0.85;
    const trunkWidth = Math.min(20 + parentingDays / 5, 50);
    const trunkHeight = Math.min(120 + parentingDays * 1.5, 200);

    // 幹のグラデーション
    const trunkGradient = ctx.createLinearGradient(centerX - trunkWidth/2, 0, centerX + trunkWidth/2, 0);
    trunkGradient.addColorStop(0, '#4a3f35');
    trunkGradient.addColorStop(0.5, '#6b5b47');
    trunkGradient.addColorStop(1, '#5d4e40');
    
    ctx.fillStyle = trunkGradient;
    ctx.fillRect(centerX - trunkWidth/2, groundY - trunkHeight, trunkWidth, trunkHeight);

    // 年輪の線
    ctx.strokeStyle = 'rgba(78, 52, 46, 0.4)';
    ctx.lineWidth = 1;
    const ringCount = Math.floor(parentingDays / 10);
    for (let i = 1; i <= ringCount; i++) {
      const y = groundY - trunkHeight + (i * (trunkHeight / (ringCount + 1)));
      ctx.beginPath();
      ctx.moveTo(centerX - trunkWidth/2 + 4, y);
      ctx.lineTo(centerX + trunkWidth/2 - 4, y);
      ctx.stroke();
    }

    // 枝を描画
    const drawBranch = (startX: number, startY: number, angle: number, length: number, thickness: number, generation: number) => {
      if (generation > 6 || length < 10) return;

      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;

      ctx.strokeStyle = generation === 0 ? '#6b5b47' : '#8b7355';
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // 次の世代の枝
      if (generation < Math.min(Math.floor(parentingDays / 12) + 2, 5)) {
        const newLength = length * 0.7;
        const newThickness = Math.max(thickness * 0.7, 1);
        
        drawBranch(endX, endY, angle - 0.5, newLength, newThickness, generation + 1);
        drawBranch(endX, endY, angle + 0.5, newLength, newThickness, generation + 1);
        
        if (generation < 3 && Math.random() > 0.5) {
          drawBranch(endX, endY, angle, newLength * 0.8, newThickness, generation + 1);
        }
      }
    };

    // メイン枝を描画
    const mainBranchY = groundY - trunkHeight + 20;
    drawBranch(centerX, mainBranchY, -Math.PI/4, 80, 8, 0); // 左の枝
    drawBranch(centerX, mainBranchY, Math.PI/4, 75, 8, 0);  // 右の枝
    drawBranch(centerX, mainBranchY - 30, -Math.PI/6, 60, 6, 0); // 上左の枝
    drawBranch(centerX, mainBranchY - 30, Math.PI/6, 65, 6, 0);  // 上右の枝

    // 葉っぱを描画
    const leafPositions = [
      { x: centerX - 60, y: mainBranchY - 40 },
      { x: centerX + 70, y: mainBranchY - 35 },
      { x: centerX - 40, y: mainBranchY - 80 },
      { x: centerX + 50, y: mainBranchY - 75 },
      { x: centerX - 80, y: mainBranchY - 20 },
      { x: centerX + 85, y: mainBranchY - 15 },
      { x: centerX - 20, y: mainBranchY - 100 },
      { x: centerX + 25, y: mainBranchY - 95 },
    ];

    const leafColors = ['#2d5016', '#3a6b1f', '#4a7c26', '#5a8d2f'];
    
    leafPositions.forEach((pos, index) => {
      if (index < Math.min(parentingDays / 8 + 3, leafPositions.length)) {
        ctx.fillStyle = leafColors[index % leafColors.length];
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, 12, 8, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
        
        // 葉脈
        ctx.strokeStyle = '#1a4408';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y - 6);
        ctx.lineTo(pos.x, pos.y + 6);
        ctx.stroke();
      }
    });

    // 実を描画
    fruits.forEach(fruit => {
      const fruitX = (fruit.x / 100) * width;
      const fruitY = (fruit.y / 100) * height;

      // 実の影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(fruitX + 2, fruitY + 3, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 実のグラデーション
      const fruitGradient = ctx.createRadialGradient(fruitX - 3, fruitY - 3, 0, fruitX, fruitY, 12);
      
      if (fruit.color === 'pink') {
        fruitGradient.addColorStop(0, fruit.isGlowing ? '#ffb3d9' : '#ffccdd');
        fruitGradient.addColorStop(1, fruit.isGlowing ? '#ff69b4' : '#ff99bb');
      } else if (fruit.color === 'blue') {
        fruitGradient.addColorStop(0, fruit.isGlowing ? '#b3d9ff' : '#cce6ff');
        fruitGradient.addColorStop(1, fruit.isGlowing ? '#4da6ff' : '#99ccff');
      } else {
        fruitGradient.addColorStop(0, fruit.isGlowing ? '#fff9b3' : '#ffffcc');
        fruitGradient.addColorStop(1, fruit.isGlowing ? '#ffd700' : '#ffff99');
      }

      ctx.fillStyle = fruitGradient;
      
      if (fruit.isGlowing) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = fruit.color === 'pink' ? '#ff69b4' : fruit.color === 'blue' ? '#4da6ff' : '#ffd700';
      }
      
      ctx.beginPath();
      ctx.arc(fruitX, fruitY, fruit.isGlowing ? 12 : 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;

      // ハイライト
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(fruitX - 3, fruitY - 3, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [parentingDays, fruits]);

  // Canvas初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvas サイズを設定
    canvas.width = 800;
    canvas.height = 500;

    drawTree();
  }, [drawTree]);

  // クリックハンドラー
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    fruits.forEach(fruit => {
      const fruitX = (fruit.x / 100) * canvas.width;
      const fruitY = (fruit.y / 100) * canvas.height;
      const distance = Math.sqrt(Math.pow(x - fruitX, 2) + Math.pow(y - fruitY, 2));
      
      if (distance <= (fruit.isGlowing ? 15 : 12)) {
        onFruitClick(fruit, event.nativeEvent);
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative w-full bg-gradient-to-b from-slate-50 via-stone-50 to-emerald-50 rounded-3xl shadow-2xl overflow-hidden border border-white/20"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-96 cursor-pointer"
        onClick={handleCanvasClick}
        style={{ imageRendering: 'auto' }}
      />
      
      {/* 下部の情報表示 */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center space-y-2">
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="bg-white/80 backdrop-blur-sm rounded-full px-6 py-2 shadow-lg"
        >
          <p className="text-sm font-semibold text-emerald-700">
            {childrenNames.join(' ♡ ')} の成長記録
          </p>
        </motion.div>
        
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="bg-white/70 backdrop-blur-sm rounded-full px-4 py-1 shadow-md"
        >
          <p className="text-xs text-slate-600">
            育児 {parentingDays} 日目 🌱
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}