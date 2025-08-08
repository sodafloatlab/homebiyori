import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TreeStatus, Fruit, AiRole } from '@/types';
import { STORAGE_KEYS } from '@/lib/constants';
import { calculateTreeStage, calculateProgressToNextStage } from '@/lib/utils';

interface TreeState {
  // 木の状態
  status: TreeStatus | null;
  fruits: Fruit[];
  totalCharacters: number;
  isLoading: boolean;
  error: string | null;

  // UI状態
  selectedFruit: Fruit | null;
  showFruitDetail: boolean;
  isAnimating: boolean;

  // Actions
  setStatus: (status: TreeStatus | null) => void;
  setFruits: (fruits: Fruit[]) => void;
  addFruit: (fruit: Fruit) => void;
  setTotalCharacters: (count: number) => void;
  addCharacters: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedFruit: (fruit: Fruit | null) => void;
  setShowFruitDetail: (show: boolean) => void;
  setAnimating: (isAnimating: boolean) => void;

  // Tree Actions
  growTree: (userMessage: string, aiResponse: string, aiRole: AiRole, emotion: string) => Promise<void>;
  refreshTreeStatus: () => Promise<void>;
  clearFruits: () => void;
  clearError: () => void;

  // Computed values
  getCurrentStage: () => number;
  getProgressToNext: () => number;
  getFruitsByCharacter: (aiRole?: AiRole) => Fruit[];
  getRecentFruits: (limit?: number) => Fruit[];
  getExperiencePoints: () => number;
}

const useTreeStore = create<TreeState>()(
  persist(
    (set, get) => ({
      // Initial State
      status: null,
      fruits: [],
      totalCharacters: 0,
      isLoading: false,
      error: null,
      selectedFruit: null,
      showFruitDetail: false,
      isAnimating: false,

      // Basic Setters
      setStatus: (status) => set({ status }),
      setFruits: (fruits) => set({ fruits }),
      addFruit: (fruit) => {
        const currentFruits = get().fruits;
        set({ fruits: [...currentFruits, fruit] });
      },
      setTotalCharacters: (totalCharacters) => set({ totalCharacters }),
      addCharacters: (count) => {
        const currentTotal = get().totalCharacters;
        set({ totalCharacters: currentTotal + count });
      },
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setSelectedFruit: (selectedFruit) => set({ selectedFruit }),
      setShowFruitDetail: (showFruitDetail) => set({ showFruitDetail }),
      setAnimating: (isAnimating) => set({ isAnimating }),

      // Tree Actions
      growTree: async (userMessage: string, aiResponse: string, aiRole: AiRole, emotion: string) => {
        const { setLoading, setError, addFruit, addCharacters, setAnimating } = get();

        try {
          setLoading(true);
          setError(null);

          // 文字数計算
          const characterCount = userMessage.length + aiResponse.length;

          // TODO: API統合時に実際のfruit追加API呼び出し
          // const response = await apiClient.post('/tree/fruits', {
          //   user_message: userMessage,
          //   ai_response: aiResponse,
          //   ai_character: aiRole,
          //   emotion: emotion
          // });

          // 現在はローカル処理
          const newFruit: Fruit = {
            id: Date.now().toString(),
            userMessage,
            aiResponse,
            aiRole,
            createdAt: new Date().toLocaleDateString('ja-JP'),
            emotion
          };

          // アニメーション開始
          setAnimating(true);
          
          // 実を追加
          addFruit(newFruit);
          
          // 文字数更新
          addCharacters(characterCount);

          // アニメーション完了まで待機
          setTimeout(() => {
            setAnimating(false);
          }, 2000);

        } catch (error) {
          setError('木の成長の記録に失敗しました。');
          console.error('Tree growth error:', error);
        } finally {
          setLoading(false);
        }
      },

      refreshTreeStatus: async () => {
        const { setLoading, setError, setStatus, setFruits, setTotalCharacters } = get();

        try {
          setLoading(true);
          setError(null);

          // TODO: API統合時に実際の木の状態取得API呼び出し
          // const response = await apiClient.get('/tree/status');
          // setStatus(response.data.tree);
          // setFruits(response.data.recent_activity);

          console.log('Tree status refresh requested');

        } catch (error) {
          setError('木の状態の取得に失敗しました。');
          console.error('Tree status refresh error:', error);
        } finally {
          setLoading(false);
        }
      },

      clearFruits: () => set({ fruits: [] }),
      clearError: () => set({ error: null }),

      // Computed values
      getCurrentStage: () => {
        const { totalCharacters } = get();
        return calculateTreeStage(totalCharacters);
      },

      getProgressToNext: () => {
        const { totalCharacters } = get();
        return calculateProgressToNextStage(totalCharacters);
      },

      getFruitsByCharacter: (aiRole?: AiRole) => {
        const { fruits } = get();
        if (!aiRole) return fruits;
        return fruits.filter(fruit => fruit.aiRole === aiRole);
      },

      getRecentFruits: (limit = 10) => {
        const { fruits } = get();
        return fruits
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, limit);
      },

      getExperiencePoints: () => {
        const { fruits } = get();
        // 実の数 × 10ポイントの経験値として計算
        return fruits.length * 10;
      }
    }),
    {
      name: STORAGE_KEYS.THEME_PREFERENCE,
      storage: createJSONStorage(() => localStorage),
      // 機密情報は永続化しない
      partialize: (state) => ({
        totalCharacters: state.totalCharacters,
        fruits: state.fruits.map(fruit => ({
          ...fruit,
          // 機密性の高いメッセージ内容は永続化しない
          userMessage: '',
          aiResponse: ''
        }))
      })
    }
  )
);

export default useTreeStore;