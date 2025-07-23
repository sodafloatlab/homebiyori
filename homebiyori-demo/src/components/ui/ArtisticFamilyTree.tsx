'use client';

import { useRef, useEffect, useState } from 'react';
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

interface ArtisticFamilyTreeProps {
  parentingDays: number;
  fruits: MockFruit[];
  childrenNames: string[];
  onFruitClick: (fruit: MockFruit, event?: MouseEvent) => void;
}

interface Branch {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  angle: number;
  generation: number;
}

interface Leaf {
  x: number;
  y: number;
  size: number;
  angle: number;
  color: string;
  sway: number;
}

export default function ArtisticFamilyTree({ parentingDays, fruits, childrenNames, onFruitClick }: ArtisticFamilyTreeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [leaves, setLeaves] = useState<Leaf[]>([]);
  const [clickableAreas, setClickableAreas] = useState<any[]>([]);
  const animationRef = useRef<number>();

  // 木の成長パラメータ
  const trunkHeight = Math.min(180 + parentingDays * 2, 280);
  const trunkWidth = Math.min(25 + Math.log(parentingDays + 1) * 8, 60);
  const maxGenerations = Math.min(Math.floor(parentingDays / 10) + 3, 7);

  // 美しい色パレット
  const colors = {
    trunk: ['#4a3f35', '#5d4e40', '#6b5b47', '#7a6a56'],
    branch: ['#5d4e40', '#6b5b47', '#7a6a56', '#8b7355'],
    leaf: ['#2d5016', '#3a6b1f', '#4a7c26', '#5a8d2f', '#6b9e38'],
    sky: ['#e8f4fd', '#d4ebf7', '#c4e2f1', '#b8dbec'],
    ground: ['#4a7c26', '#5a8d2f', '#6b9e38', '#7ba941']
  };

  // フラクタル樹木生成アルゴリズム
  const generateTree = () => {
    const newBranches: Branch[] = [];
    const newLeaves: Leaf[] = [];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const groundY = canvas.height - 80;

    // 幹を生成
    const trunkBase = { 
      startX: centerX, 
      startY: groundY, 
      endX: centerX + (Math.random() - 0.5) * 10, 
      endY: groundY - trunkHeight,
      thickness: trunkWidth,
      angle: -Math.PI / 2,
      generation: 0
    };
    newBranches.push(trunkBase);

    // 再帰的に枝を生成
    const generateBranches = (parent: Branch, generation: number) => {
      if (generation >= maxGenerations) return;

      const numBranches = generation === 0 ? 3 : Math.random() > 0.3 ? 2 : 1;
      
      for (let i = 0; i < numBranches; i++) {
        const angleVariation = (Math.random() - 0.5) * 0.8;
        const baseAngle = parent.angle + (i === 0 ? -0.4 : i === 1 ? 0.4 : 0) + angleVariation;
        
        const lengthFactor = 0.7 + Math.random() * 0.2;
        const parentLength = Math.sqrt(
          Math.pow(parent.endX - parent.startX, 2) + 
          Math.pow(parent.endY - parent.startY, 2)
        );
        const branchLength = parentLength * lengthFactor;
        
        const thickness = Math.max(parent.thickness * (0.6 + Math.random() * 0.2), 2);
        
        const endX = parent.endX + Math.cos(baseAngle) * branchLength;
        const endY = parent.endY + Math.sin(baseAngle) * branchLength;
        
        const branch: Branch = {
          startX: parent.endX,
          startY: parent.endY,
          endX,
          endY,
          thickness,
          angle: baseAngle,
          generation
        };
        
        newBranches.push(branch);
        
        // 葉っぱを生成（細い枝の先に）
        if (thickness < 8 && Math.random() > 0.3) {
          const numLeaves = Math.floor(Math.random() * 4) + 2;
          for (let j = 0; j < numLeaves; j++) {
            const leafX = endX + (Math.random() - 0.5) * 30;
            const leafY = endY + (Math.random() - 0.5) * 20;
            const leaf: Leaf = {
              x: leafX,
              y: leafY,
              size: Math.random() * 15 + 8,
              angle: Math.random() * Math.PI * 2,
              color: colors.leaf[Math.floor(Math.random() * colors.leaf.length)],
              sway: Math.random() * 0.1
            };
            newLeaves.push(leaf);
          }
        }
        
        generateBranches(branch, generation + 1);
      }
    };

    generateBranches(trunkBase, 1);
    setBranches(newBranches);
    setLeaves(newLeaves);
  };

  // Canvas描画関数
  const draw = (timestamp: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      console.log('Canvas or context not available');
      return;
    }

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 美しいグラデーション背景
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.7);
    skyGradient.addColorStop(0, '#e8f4fd');
    skyGradient.addColorStop(0.6, '#f0f8ff');
    skyGradient.addColorStop(1, '#f8fffe');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.7);

    // 地面のグラデーション
    const groundGradient = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
    groundGradient.addColorStop(0, '#8bc34a');
    groundGradient.addColorStop(0.5, '#7cb342');
    groundGradient.addColorStop(1, '#689f38');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

    // 雲を描画
    const drawCloud = (x: number, y: number, size: number, opacity: number) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#ffffff';
      
      for (let i = 0; i < 6; i++) {
        const cloudX = x + (Math.cos(i) * size * 0.8);
        const cloudY = y + (Math.sin(i) * size * 0.3);
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, size * (0.6 + Math.random() * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    drawCloud(canvas.width * 0.2, 60, 25, 0.7);
    drawCloud(canvas.width * 0.7, 40, 30, 0.5);
    drawCloud(canvas.width * 0.5, 80, 20, 0.6);

    // 枝を描画（美しいグラデーションと質感）
    branches.forEach((branch, index) => {
      ctx.save();
      
      // 枝のグラデーション
      const gradient = ctx.createLinearGradient(
        branch.startX - branch.thickness/2, 
        branch.startY,
        branch.startX + branch.thickness/2, 
        branch.startY
      );
      
      if (branch.generation === 0) {
        // 幹の色
        gradient.addColorStop(0, '#3d342a');
        gradient.addColorStop(0.3, '#4a3f35');
        gradient.addColorStop(0.7, '#5d4e40');
        gradient.addColorStop(1, '#6b5b47');
      } else {
        // 枝の色
        const baseColor = colors.branch[Math.min(branch.generation - 1, colors.branch.length - 1)];
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, baseColor);
      }

      ctx.strokeStyle = gradient;
      ctx.lineWidth = branch.thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 自然な曲線で描画
      ctx.beginPath();
      ctx.moveTo(branch.startX, branch.startY);
      
      const midX = (branch.startX + branch.endX) / 2 + (Math.sin(timestamp * 0.001 + index) * 2);
      const midY = (branch.startY + branch.endY) / 2;
      
      ctx.quadraticCurveTo(midX, midY, branch.endX, branch.endY);
      ctx.stroke();

      // 樹皮の質感
      if (branch.generation === 0 && branch.thickness > 15) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#2d1f1a';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 5; i++) {
          const y = branch.startY + (branch.endY - branch.startY) * (i / 5);
          ctx.beginPath();
          ctx.moveTo(branch.startX - branch.thickness/3, y);
          ctx.lineTo(branch.startX + branch.thickness/3, y);
          ctx.stroke();
        }
        ctx.restore();
      }
      
      ctx.restore();
    });

    // 葉っぱを描画
    leaves.forEach((leaf, index) => {
      ctx.save();
      
      const swayOffset = Math.sin(timestamp * 0.002 + index) * leaf.sway * 5;
      const leafX = leaf.x + swayOffset;
      const leafY = leaf.y + Math.cos(timestamp * 0.003 + index) * 2;
      
      ctx.translate(leafX, leafY);
      ctx.rotate(leaf.angle + swayOffset * 0.1);
      
      // 葉っぱのグラデーション
      const leafGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, leaf.size);
      leafGradient.addColorStop(0, leaf.color);
      leafGradient.addColorStop(0.7, leaf.color);
      leafGradient.addColorStop(1, '#1a4408');
      
      ctx.fillStyle = leafGradient;
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size * 0.6, leaf.size, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // 葉脈
      ctx.strokeStyle = '#1a4408';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(0, -leaf.size);
      ctx.lineTo(0, leaf.size);
      ctx.moveTo(-leaf.size * 0.3, -leaf.size * 0.3);
      ctx.lineTo(0, 0);
      ctx.moveTo(leaf.size * 0.3, -leaf.size * 0.3);
      ctx.lineTo(0, 0);
      ctx.stroke();
      
      ctx.restore();
    });

    // 実を描画
    const clickableAreas: any[] = [];
    fruits.forEach((fruit) => {
      const canvasX = (fruit.x / 100) * canvas.width;
      const canvasY = (fruit.y / 100) * canvas.height;
      
      ctx.save();
      
      // 実の影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(canvasX + 3, canvasY + 4, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // 実のグラデーション
      const fruitGradient = ctx.createRadialGradient(canvasX - 5, canvasY - 5, 0, canvasX, canvasY, 15);
      
      if (fruit.color === 'pink') {
        if (fruit.isGlowing) {
          fruitGradient.addColorStop(0, '#ffb3d9');
          fruitGradient.addColorStop(0.7, '#ff69b4');
          fruitGradient.addColorStop(1, '#d6336c');
        } else {
          fruitGradient.addColorStop(0, '#ffccdd');
          fruitGradient.addColorStop(1, '#ff99bb');
        }
      } else if (fruit.color === 'blue') {
        if (fruit.isGlowing) {
          fruitGradient.addColorStop(0, '#b3d9ff');
          fruitGradient.addColorStop(0.7, '#4da6ff');
          fruitGradient.addColorStop(1, '#0066cc');
        } else {
          fruitGradient.addColorStop(0, '#cce6ff');
          fruitGradient.addColorStop(1, '#99ccff');
        }
      } else {
        if (fruit.isGlowing) {
          fruitGradient.addColorStop(0, '#fff9b3');
          fruitGradient.addColorStop(0.7, '#ffd700');
          fruitGradient.addColorStop(1, '#cc9900');
        } else {
          fruitGradient.addColorStop(0, '#ffffcc');
          fruitGradient.addColorStop(1, '#ffff99');
        }
      }
      
      ctx.fillStyle = fruitGradient;
      
      // 光る効果
      if (fruit.isGlowing) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = fruitGradient;
        
        const pulse = Math.sin(timestamp * 0.005) * 0.3 + 1;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 15 * pulse, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // ハイライト
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(canvasX - 4, canvasY - 4, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
      // クリック可能エリアを記録
      clickableAreas.push({
        fruit,
        x: canvasX,
        y: canvasY,
        radius: fruit.isGlowing ? 20 : 15
      });
    });

    setClickableAreas(clickableAreas);
    animationRef.current = requestAnimationFrame(draw);
  };

  // Canvas初期化とアニメーション開始
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvas サイズ設定
    const container = canvas.parentElement;
    if (container) {
      canvas.width = Math.min(container.clientWidth, 800);
      canvas.height = 600;
    }

    generateTree();
    
    const startAnimation = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(draw);
    };
    
    // 少し遅延させてから開始
    setTimeout(startAnimation, 100);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // フルーツや日数が変わった時の更新
  useEffect(() => {
    generateTree();
  }, [parentingDays, fruits]);

  // クリックハンドラー
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    clickableAreas.forEach(area => {
      const distance = Math.sqrt(Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2));
      if (distance <= area.radius) {
        onFruitClick(area.fruit, event.nativeEvent);
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
        width={800}
        height={600}
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