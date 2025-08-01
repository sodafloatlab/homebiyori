import { AiRole } from '@/components/ui/AiIcon';

export interface DemoUser {
  selectedAiRole: AiRole | null;
  startDate: number;
  totalDays: number;
  totalCharacters: number;
}

const STORAGE_KEY = 'homebiyori-demo-data';

export class DemoStorage {
  private static getDefaultData(): DemoUser {
    return {
      selectedAiRole: null,
      startDate: Date.now(),
      totalDays: 1,
      totalCharacters: 0
    };
  }

  static load(): DemoUser {
    if (typeof window === 'undefined') {
      return this.getDefaultData();
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return this.getDefaultData();
      }
      
      const data = JSON.parse(stored) as DemoUser;
      
      // 日数を更新
      const now = Date.now();
      const daysSinceStart = Math.floor((now - data.startDate) / (1000 * 60 * 60 * 24)) + 1;
      data.totalDays = daysSinceStart;
      
      // totalCharactersが存在しない場合は0で初期化
      if (!data.totalCharacters) {
        data.totalCharacters = 0;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to load demo data:', error);
      return this.getDefaultData();
    }
  }

  static save(data: DemoUser): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save demo data:', error);
    }
  }

  static setAiRole(role: AiRole): void {
    const data = this.load();
    data.selectedAiRole = role;
    this.save(data);
  }

  static addCharacters(count: number): void {
    const data = this.load();
    data.totalCharacters += count;
    this.save(data);
  }

  static getTreeData() {
    const data = this.load();
    return {
      totalDays: data.totalDays,
      totalCharacters: data.totalCharacters
    };
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }
}