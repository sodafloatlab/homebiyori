'use client';

interface Fruit {
  id: string;
  x: number;
  y: number;
  type: 'encouragement' | 'reflection';
  aiRole: 'たまさん' | 'まどか姉さん' | 'ヒデじい';
  message: string;
  createdAt: string;
  isGlowing: boolean;
}

interface Props {
  ageInDays: number;
  fruits: Fruit[];
  childrenNames: string[];
  onFruitClick?: (fruit: Fruit) => void;
}

const SimpleTree = ({ ageInDays, fruits, childrenNames, onFruitClick }: Props) => {
  // 成長段階計算（0-1）
  const growthStage = Math.min(ageInDays / 365, 1);
  
  // 木のサイズ（より大きく）
  const trunkHeight = 100 + growthStage * 60; // 100-160
  const trunkWidth = 10 + growthStage * 10; // 10-20
  const crownSize = 80 + growthStage * 100; // 80-180

  // 実の位置を木の葉の範囲内に制限する関数
  const getValidFruitPosition = (fruit: Fruit) => {
    // SVGでの葉の中心座標: (200, 350 - trunkHeight - 20)
    // これを画面パーセントに変換
    
    // SVG座標系での葉の位置
    const svgLeafCenterY = 350 - trunkHeight - 20;
    const svgLeafRadius = crownSize / 2;
    
    // SVGの座標を画面パーセントに変換
    // SVG: width=400, height=350, コンテナ: h-96 (384px)
    const svgToScreenX = (svgX: number) => (svgX / 400) * 100;
    const svgToScreenY = (svgY: number) => ((350 - svgY + 32) / 384) * 100; // 32pxはbottom-8のオフセット
    
    // 画面上での葉の中心位置
    const screenLeafCenterX = svgToScreenX(200);
    const screenLeafCenterY = svgToScreenY(svgLeafCenterY);
    const screenLeafRadius = (svgLeafRadius / 400) * 100; // 画面幅に対する半径の割合
    
    // IDベースで角度と距離を決定
    const angle = (parseInt(fruit.id) * 73) % 360;
    const radiusRatio = 0.3 + ((parseInt(fruit.id) * 17) % 50) / 100; // 0.3-0.8の範囲
    const radius = screenLeafRadius * radiusRatio;
    
    // 葉の範囲内で位置計算
    const x = screenLeafCenterX + Math.cos(angle * Math.PI / 180) * radius;
    const y = screenLeafCenterY + Math.sin(angle * Math.PI / 180) * radius * 0.6; // 縦方向圧縮
    
    // 葉の境界内に制限（より厳密に）
    const maxRadius = screenLeafRadius * 0.7; // 葉の70%範囲内
    const distance = Math.sqrt(
      Math.pow(x - screenLeafCenterX, 2) + 
      Math.pow((y - screenLeafCenterY) * 1.67, 2) // 縦方向の圧縮を考慮
    );
    
    if (distance > maxRadius) {
      // 範囲外の場合は葉の境界に調整
      const scale = maxRadius / distance;
      return {
        x: screenLeafCenterX + (x - screenLeafCenterX) * scale,
        y: screenLeafCenterY + (y - screenLeafCenterY) * scale
      };
    }
    
    return { x, y };
  };

  return (
    <div className="w-full h-96 bg-gradient-to-b from-sky-100 to-green-50 rounded-lg flex justify-center items-end relative overflow-hidden">
      
      {/* 地面 */}
      <div className="absolute bottom-0 w-full h-12 bg-green-200"></div>
      
      {/* SVG木 */}
      <svg
        width="400"
        height="350"
        viewBox="0 0 400 350"
        className="absolute bottom-8"
      >
        {/* 木の幹 */}
        <rect
          x={200 - trunkWidth/2}
          y={350 - trunkHeight}
          width={trunkWidth}
          height={trunkHeight}
          fill="#8B4513"
          rx="3"
        />
        
        {/* 木の葉（円形でシンプル） */}
        <circle
          cx="200"
          cy={350 - trunkHeight - 20}
          r={crownSize/2}
          fill={growthStage < 0.3 ? '#90EE90' : growthStage < 0.7 ? '#228B22' : '#006400'}
          opacity="0.8"
        />
        
        {/* 枝（シンプルに4本） */}
        {growthStage > 0.2 && (
          <>
            <line
              x1="200"
              y1={350 - trunkHeight + 20}
              x2={200 - crownSize/2.5}
              y2={350 - trunkHeight - 15}
              stroke="#8B4513"
              strokeWidth="3"
            />
            <line
              x1="200"
              y1={350 - trunkHeight + 20}
              x2={200 + crownSize/2.5}
              y2={350 - trunkHeight - 15}
              stroke="#8B4513"
              strokeWidth="3"
            />
            {growthStage > 0.5 && (
              <>
                <line
                  x1="200"
                  y1={350 - trunkHeight + 10}
                  x2={200 - crownSize/3.5}
                  y2={350 - trunkHeight - 30}
                  stroke="#8B4513"
                  strokeWidth="2"
                />
                <line
                  x1="200"
                  y1={350 - trunkHeight + 10}
                  x2={200 + crownSize/3.5}
                  y2={350 - trunkHeight - 30}
                  stroke="#8B4513"
                  strokeWidth="2"
                />
              </>
            )}
          </>
        )}
      </svg>

      {/* 実（葉の範囲内に配置） */}
      {fruits.map((fruit) => {
        const position = getValidFruitPosition(fruit);
        return (
          <div
            key={fruit.id}
            className="absolute w-5 h-5 rounded-full cursor-pointer flex items-center justify-center"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              backgroundColor: fruit.isGlowing ? 
                (fruit.type === 'encouragement' ? '#FFD700' : '#87CEEB') : 
                '#DDD',
              border: fruit.isGlowing ? '2px solid #FFF' : '1px solid #AAA'
            }}
            onClick={() => onFruitClick?.(fruit)}
          >
            {!fruit.isGlowing && (
              <span className="text-xs">📝</span>
            )}
          </div>
        );
      })}

      {/* 情報表示 */}
      <div className="absolute top-4 left-4 bg-white/80 rounded-lg p-2 text-sm">
        <div>育児 {ageInDays} 日目</div>
        <div>成長度: {Math.round(growthStage * 100)}%</div>
      </div>
    </div>
  );
};

export default SimpleTree;