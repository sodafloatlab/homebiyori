/**
 * Fruit Position Manager
 * フロントエンド完結の果実位置計算システム
 */

// ============================================
// Types
// ============================================

export interface Position {
  x: number;
  y: number;
}

export interface FruitInfo {
  fruit_id: string;
  user_message: string;
  ai_response: string;
  ai_character: string;
  emotion_detected: string;
  created_at: string;
  position?: Position;
}

export interface TreeDimensions {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface PositionConfig {
  minDistance: number;
  maxAttempts: number;
  avoidOverlap: boolean;
  fruitSize: number;
}

// ============================================
// Fruit Position Manager Implementation
// ============================================

export class FruitPositionManager {
  private treeDimensions: TreeDimensions;
  private config: PositionConfig;
  private existingPositions: Map<string, Position>;

  constructor(
    treeDimensions: TreeDimensions = {
      width: 800,
      height: 600,
      centerX: 400,
      centerY: 300
    },
    config: PositionConfig = {
      minDistance: 60,
      maxAttempts: 50,
      avoidOverlap: true,
      fruitSize: 40
    }
  ) {
    this.treeDimensions = treeDimensions;
    this.config = config;
    this.existingPositions = new Map();
  }

  /**
   * ランダム位置生成
   */
  generateRandomPosition(): Position {
    const { width, height, centerX, centerY } = this.treeDimensions;
    const { fruitSize } = this.config;
    
    // 木の形状を考慮した楕円形の範囲内で生成
    const angle = Math.random() * 2 * Math.PI;
    const radiusX = (width / 2) - fruitSize;
    const radiusY = (height / 2) - fruitSize;
    const distance = Math.sqrt(Math.random()); // 均等分布のための平方根変換
    
    return {
      x: centerX + (distance * radiusX * Math.cos(angle)),
      y: centerY + (distance * radiusY * Math.sin(angle))
    };
  }

  /**
   * スパイラル配置アルゴリズム
   */
  spiralPosition(index: number, totalFruits: number = 20): Position {
    const { centerX, centerY } = this.treeDimensions;
    const { fruitSize } = this.config;
    
    // 黄金比に基づくスパイラル配置
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // 約137.5度
    const angle = index * goldenAngle;
    const radius = Math.sqrt(index) * (fruitSize * 0.8);
    
    // 木の形状に制限
    const maxRadius = Math.min(this.treeDimensions.width, this.treeDimensions.height) / 3;
    const constrainedRadius = Math.min(radius, maxRadius);
    
    return {
      x: centerX + constrainedRadius * Math.cos(angle),
      y: centerY + constrainedRadius * Math.sin(angle)
    };
  }

  /**
   * 重複を避けた位置生成
   */
  generateNonOverlappingPosition(excludePositions: Position[] = []): Position {
    const { maxAttempts, minDistance } = this.config;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const position = this.generateRandomPosition();
      
      if (this.isValidPosition(position, excludePositions)) {
        return position;
      }
      
      attempts++;
    }
    
    // 最大試行回数に達した場合、スパイラル配置にフォールバック
    return this.spiralPosition(excludePositions.length);
  }

  /**
   * 位置の妥当性チェック
   */
  private isValidPosition(position: Position, excludePositions: Position[]): boolean {
    const { minDistance } = this.config;
    
    // 境界チェック
    if (!this.isWithinTreeBounds(position)) {
      return false;
    }
    
    // 重複チェック
    for (const existingPos of excludePositions) {
      const distance = this.calculateDistance(position, existingPos);
      if (distance < minDistance) {
        return false;
      }
    }
    
    // 既存位置との重複チェック
    for (const existingPos of this.existingPositions.values()) {
      const distance = this.calculateDistance(position, existingPos);
      if (distance < minDistance) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 木の境界内かどうかチェック
   */
  private isWithinTreeBounds(position: Position): boolean {
    const { width, height, centerX, centerY } = this.treeDimensions;
    const { fruitSize } = this.config;
    
    // 楕円形の境界チェック
    const dx = (position.x - centerX) / (width / 2 - fruitSize);
    const dy = (position.y - centerY) / (height / 2 - fruitSize);
    
    return (dx * dx + dy * dy) <= 1;
  }

  /**
   * 2点間の距離計算
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 複数の果実に対する位置計算
   */
  calculateTreeLayout(fruits: FruitInfo[]): Map<string, Position> {
    const positions = new Map<string, Position>();
    const usedPositions: Position[] = [];
    
    fruits.forEach((fruit, index) => {
      let position: Position;
      
      if (fruit.position) {
        // 既存の位置がある場合はそれを使用
        position = fruit.position;
      } else if (this.config.avoidOverlap) {
        // 重複を避けた位置生成
        position = this.generateNonOverlappingPosition(usedPositions);
      } else {
        // スパイラル配置
        position = this.spiralPosition(index, fruits.length);
      }
      
      positions.set(fruit.fruit_id, position);
      usedPositions.push(position);
    });
    
    this.existingPositions = positions;
    return positions;
  }

  /**
   * 特定の果実の位置を更新（ローカル状態のみ）
   */
  updateFruitPosition(fruitId: string, position: Position): void {
    this.existingPositions.set(fruitId, position);
  }

  /**
   * 果実位置を削除
   */
  removeFruitPosition(fruitId: string): void {
    this.existingPositions.delete(fruitId);
  }

  /**
   * 全ての果実位置をクリア
   */
  clearAllPositions(): void {
    this.existingPositions.clear();
  }

  /**
   * 現在の果実位置を取得
   */
  getFruitPosition(fruitId: string): Position | undefined {
    return this.existingPositions.get(fruitId);
  }

  /**
   * 全ての果実位置を取得
   */
  getAllPositions(): Map<string, Position> {
    return new Map(this.existingPositions);
  }

  /**
   * 木のサイズを更新
   */
  updateTreeDimensions(dimensions: Partial<TreeDimensions>): void {
    this.treeDimensions = { ...this.treeDimensions, ...dimensions };
  }

  /**
   * 配置設定を更新
   */
  updateConfig(config: Partial<PositionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 位置の統計情報を取得
   */
  getPositionStats(): {
    totalFruits: number;
    averageDistance: number;
    minDistance: number;
    maxDistance: number;
  } {
    const positions = Array.from(this.existingPositions.values());
    const { centerX, centerY } = this.treeDimensions;
    
    if (positions.length === 0) {
      return { totalFruits: 0, averageDistance: 0, minDistance: 0, maxDistance: 0 };
    }
    
    const distances = positions.map(pos => 
      this.calculateDistance(pos, { x: centerX, y: centerY })
    );
    
    return {
      totalFruits: positions.length,
      averageDistance: distances.reduce((a, b) => a + b, 0) / distances.length,
      minDistance: Math.min(...distances),
      maxDistance: Math.max(...distances)
    };
  }
}

// シングルトンインスタンス
export const fruitPositionManager = new FruitPositionManager();

export default FruitPositionManager;