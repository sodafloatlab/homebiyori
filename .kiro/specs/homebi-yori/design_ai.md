# AI機能設計書

## AIキャラクターシステム

### キャラクター設計

| キャラクター | テーマカラー | 特徴 | 対象ユーザー |
|------------|------------|------|------------|
| **たまさん** | Rose (ピンク) | 下町のベテランおばちゃん、圧倒的受容力 | 初産・不安定なユーザー |
| **まどか姉さん** | Sky (青) | バリキャリ共働きママ、論理的共感 | 忙しいがんばり屋 |
| **ヒデじい** | Amber (オレンジ) | 元教師の詩人、静かな言葉の薬 | 内省的、孤独感のあるユーザー |

## AI応答制御システム

### 1. プロンプト設計
```python
SYSTEM_PROMPTS = {
    "tama": """
あなたは「たまさん」として応答してください。
- 下町のベテランおばちゃんのような温かい口調
- 感情の受容を最優先
- 「大丈夫よ」という安心感を提供
- 人情味あふれる表現を使用
""",
    "madoka": """
あなたは「まどか姉さん」として応答してください。
- バリキャリママらしい論理的で効率的な口調
- 具体的で実感のある褒め方
- 自己効力感を高める表現
- 共働きママの気持ちに寄り添う
""",
    "hide": """
あなたは「ヒデじい」として応答してください。
- 元教師らしい詩的で落ち着いた口調
- 行動よりも姿勢や人生観を重視
- 静かで深い言葉選び
- 孤独感を和らげる表現
"""
}
```

### 2. 気分別制御
```python
MOOD_MODIFIERS = {
    "praise": {
        "instruction": "ユーザーを褒めることに集中し、具体的な行動と人間としての姿勢両方を評価してください",
        "forbidden": ["アドバイス", "指導", "改善提案"]
    },
    "listen": {
        "instruction": "共感と受容に徹し、ユーザーの感情に寄り添ってください",
        "forbidden": ["解決策", "アドバイス", "判断"]
    }
}
```

## 感情検出システム

### 1. 検出アルゴリズム
```python
class EmotionDetector:
    def __init__(self):
        self.emotion_keywords = {
            "joy": ["嬉しい", "楽しい", "良かった", "ありがとう"],
            "fatigue": ["疲れ", "つかれ", "しんどい", "きつい"],
            "accomplishment": ["頑張った", "できた", "やった", "成功"],
            "worry": ["不安", "心配", "大丈夫かな", "どうしよう"],
            "sadness": ["悲しい", "辛い", "涙", "泣き"]
        }
    
    def detect_emotion(self, message: str) -> EmotionResult:
        # キーワードベース検出
        emotion_scores = self._calculate_keyword_scores(message)
        
        # 文脈分析
        context_score = self._analyze_context(message)
        
        # 総合判定
        return self._determine_fruit_worthiness(
            emotion_scores, 
            context_score, 
            len(message)
        )
```

### 2. 実生成条件
- 感情の強度スコア: 3以上/5
- 文章の深さスコア: 3以上/5  
- 文字数: 20文字以上
- 1日1回制限

## 木の成長システム

### 1. 成長段階定義
```python
TREE_GROWTH_THRESHOLDS = {
    "STAGE_1": 20,    # 芽 - tree_1.png
    "STAGE_2": 50,    # 小さな苗 - tree_2.png
    "STAGE_3": 100,   # 若木 - tree_3.png
    "STAGE_4": 180,   # 中木 - tree_4.png
    "STAGE_5": 300,   # 大木 - tree_5.png
    # 300+ : 完全成長 - tree_6.png
}

def calculate_tree_stage(characters: int) -> int:
    """文字数から木の成長段階を計算（6段階）"""
    if characters < TREE_GROWTH_THRESHOLDS["STAGE_1"]: return 1
    if characters < TREE_GROWTH_THRESHOLDS["STAGE_2"]: return 2
    if characters < TREE_GROWTH_THRESHOLDS["STAGE_3"]: return 3
    if characters < TREE_GROWTH_THRESHOLDS["STAGE_4"]: return 4
    if characters < TREE_GROWTH_THRESHOLDS["STAGE_5"]: return 5
    return 6
```

### 2. 実の管理
```python
class FruitManager:
    def generate_fruit(self, user_message: str, ai_response: str, 
                      emotion: str, ai_role: str) -> Fruit:
        return Fruit(
            id=generate_unique_id(),
            ai_role=ai_role,
            ai_response=ai_response,
            created_date=datetime.now().date(),
            emotion=emotion,
            theme_color=CHARACTER_THEME_COLORS[ai_role]
        )
    
    def can_generate_fruit_today(self, user_id: str) -> bool:
        """1日1回制限チェック"""
        today = datetime.now().date()
        return not self.fruit_exists_for_date(user_id, today)
```

## Amazon Bedrock統合

### Claude 3 Haiku設定
```python
BEDROCK_CONFIG = {
    "model_id": "anthropic.claude-3-haiku-20240307-v1:0",
    "region": "us-east-1",
    "max_tokens": 200,
    "temperature": 0.7
}

async def generate_ai_response(
    user_message: str, 
    ai_character: str, 
    mood: str,
    chat_history: List[dict]
) -> str:
    """
    Amazon Bedrock経由でAI応答を生成
    """
    # システムプロンプト構築
    system_prompt = build_system_prompt(ai_character, mood)
    
    # チャット履歴をコンテキストに含める
    context = build_context_from_history(chat_history[-5:])  # 最新5件
    
    # Bedrockクライアント呼び出し
    response = await bedrock_client.invoke_model(
        modelId=BEDROCK_CONFIG["model_id"],
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": BEDROCK_CONFIG["max_tokens"],
            "temperature": BEDROCK_CONFIG["temperature"],
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": f"{context}\n\n{user_message}"}
            ]
        })
    )
    
    return extract_response_text(response)
```

## AIキャラクター別テーマカラー

### フルーツとテーマカラーの対応
```python
CHARACTER_THEME_COLORS = {
    "tama": "warm_pink",      # たまさん - 温かいピンク系
    "madoka": "cool_blue",    # まどか姉さん - クールブルー系
    "hide": "warm_orange"     # ヒデじい - 温かいオレンジ系
}

FRUIT_COLORS = {
    "warm_pink": "#FFB6C1",    # ライトピンク
    "cool_blue": "#87CEEB",    # スカイブルー
    "warm_orange": "#FFA07A"   # ライトサーモン
}
```