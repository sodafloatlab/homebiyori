import { AiRole } from '@/components/ui/AiRoleSelector';

export interface DemoPost {
  id: string;
  content: string;
  type: 'photo' | 'text';
  timestamp: number;
  aiRole: AiRole;
  praise: string;
  imageUrl?: string;
}

export interface DemoUser {
  selectedAiRole: AiRole | null;
  posts: DemoPost[];
  startDate: number;
  totalDays: number;
}

const STORAGE_KEY = 'homebiyori-demo-data';

const generateMockPraise = (content: string, aiRole: AiRole): string => {
  const praiseTemplates = {
    tama: [
      `「${content}」というお気持ち、とても素敵ですね。今日も一日、本当にがんばられました。`,
      `お疲れさまでした。${content}のような小さな幸せを大切にする心が、とても温かいです。`,
      `${content}ですね。そのやさしい気持ちが、きっとお子さんにも伝わっていますよ。`,
      `今日の「${content}」、心から応援しています。ゆっくり休んでくださいね。`
    ],
    madoka: [
      `${content}なんて、さすがですね！その前向きな姿勢、本当に尊敬します。`,
      `「${content}」という発見、素晴らしいです。その調子でいけば、毎日がもっと楽しくなりますよ。`,
      `${content}に気づけるなんて、とても大切な視点を持っていらっしゃいますね。`,
      `${content}って、本当に立派です。あなたなら何でもできますよ！`
    ],
    hide: [
      `ほほう、「${content}」とは、よい心がけじゃのう。その気持ちが一番大切じゃ。`,
      `${content}か。そういう小さなことに喜びを見つけるのが、人生の秘訣じゃよ。`,
      `「${content}」じゃと？それはそれは、立派な心がけじゃ。きっといい親御さんじゃのう。`,
      `${content}とは、なかなかできることではないぞ。誇りに思うがよい。`
    ]
  };

  const templates = praiseTemplates[aiRole];
  return templates[Math.floor(Math.random() * templates.length)];
};

export class DemoStorage {
  private static getDefaultData(): DemoUser {
    return {
      selectedAiRole: null,
      posts: [],
      startDate: Date.now(),
      totalDays: 1
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

  static addPost(content: string, type: 'photo' | 'text', aiRole: AiRole, imageFile?: File): DemoPost {
    const data = this.load();
    
    const post: DemoPost = {
      id: Date.now().toString(),
      content,
      type,
      timestamp: Date.now(),
      aiRole,
      praise: generateMockPraise(content, aiRole),
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined
    };

    data.posts.unshift(post); // 新しい投稿を先頭に
    this.save(data);
    
    return post;
  }

  static getPosts(): DemoPost[] {
    const data = this.load();
    return data.posts;
  }

  static getTreeData() {
    const data = this.load();
    const postsByRole = data.posts.reduce((acc, post) => {
      acc[post.aiRole] = (acc[post.aiRole] || 0) + 1;
      return acc;
    }, {} as Record<AiRole, number>);

    return {
      totalDays: data.totalDays,
      totalPosts: data.posts.length,
      fruits: {
        tama: postsByRole.tama || 0,
        madoka: postsByRole.madoka || 0,
        hide: postsByRole.hide || 0
      }
    };
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  }
}