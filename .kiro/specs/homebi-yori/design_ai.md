# AI機能設計書（LangChain統合版）

## AIキャラクターシステム

### キャラクター設計

| キャラクター | テーマカラー | 特徴 | 対象ユーザー |
|------------|------------|------|------------|
| **たまさん** | Rose (ピンク) | 下町のベテランおばちゃん、圧倒的受容力 | 初産・不安定なユーザー |
| **まどか姉さん** | Sky (青) | バリキャリ共働きママ、論理的共感 | 忙しいがんばり屋 |
| **ヒデじい** | Amber (オレンジ) | 元教師の詩人、静かな言葉の薬 | 内省的、孤独感のあるユーザー |

## InteractionMode（対話モード）システム

### 対話モード設計

| モード | 応答特徴 | 利用シーン |
|--------|----------|-----------|
| **praise** | 積極的な肯定・承認・励まし中心 | 褒めて欲しい気分の時、自己肯定感を高めたい時 |
| **listen** | 共感・理解・寄り添い中心 | 話を聞いて欲しい気分の時、共感を求める時 |

### 実装統合

InteractionModeは以下のシステムと連携して動作：

- **プロンプト生成**: `praise_level` + `interaction_mode` の組み合わせで応答調整
- **DynamoDB統合**: ユーザープロフィール（prod-homebiyori-users）に保存
- **フロントエンド設定**: チャットUIで気分に応じて選択可能
- **chat_service**: AI応答生成時にInteractionModeを考慮してトーン調整

### PraiseLevel（褒めレベル）システム

| レベル | 文章量 | 応答特徴 | 利用対象 |
|--------|--------|----------|----------|
| **normal** | 2-3文程度 | 適度なサポートと承認 | 無料版ユーザー |
| **deep** | 4-5文程度 | 思慮深く詳細な肯定と共感 | プレミアム版ユーザー |

## LangChain統合AI応答システム

> **詳細な実装仕様**: LangChainベースのプロンプト設計については、`design_prompt.md` を参照してください。

### LangChain統合の設計原則
- **ConversationChain活用**: LangChainの標準的な会話チェーンを使用
- **Memory統合**: ConversationSummaryBufferMemoryで長期コンテキスト管理
- **プラン別差別化**: メモリ容量とトークン制限によるティア制御
- **DynamoDB統合**: Custom ChatMessageHistoryでデータ永続化

## LangChain統合感情検出システム

### 1. 簡易感情検出（LangChain統合対応）
```python
from typing import Tuple, Optional

def detect_emotion_simple(message: str) -> Tuple[Optional[str], float]:
    """
    LangChain統合対応の軽量感情検出
    
    ConversationSummaryBufferMemoryでコンテキストを自動管理するため、
    感情検出は簡素化し、実生成判定に特化。
    """
    
    emotion_patterns = {
        "joy": ["嬉しい", "楽しい", "良かった", "ありがとう", "幸せ"],
        "gratitude": ["ありがとう", "感謝", "助かった", "嬉しかった"],
        "accomplishment": ["頑張った", "できた", "やった", "成功", "完了"],
        "relief": ["ほっとした", "安心", "良かった", "解決"],
        "excitement": ["ワクワク", "楽しみ", "待ち遠しい", "期待"]
    }
    
    message_lower = message.lower()
    max_score = 0.0
    detected_emotion = None
    
    for emotion, keywords in emotion_patterns.items():
        score = sum(1 for keyword in keywords if keyword in message_lower)
        if score > 0:
            # メッセージ長による重み調整
            normalized_score = min(score / len(keywords) + len(message) / 100, 1.0)
            if normalized_score > max_score:
                max_score = normalized_score
                detected_emotion = emotion
    
    return detected_emotion, max_score

# LangChain Memory統合での感情分析
class LangChainEmotionAnalyzer:
    """ConversationSummaryBufferMemoryと連携した感情分析"""
    
    def __init__(self, memory: ConversationSummaryBufferMemory):
        self.memory = memory
    
    def analyze_emotional_context(self, current_message: str) -> Dict[str, Any]:
        """
        会話履歴を考慮した感情コンテキスト分析
        
        LangChain Memoryが自動管理する会話履歴を活用し、
        感情の変遷や継続性を分析
        """
        
        # 現在のメッセージの感情検出
        current_emotion, current_score = detect_emotion_simple(current_message)
        
        # Memory履歴から感情パターン抽出
        historical_context = self._extract_emotional_patterns()
        
        return {
            "current_emotion": current_emotion,
            "current_score": current_score,
            "emotional_trend": historical_context.get("trend"),
            "fruit_worthy": self._determine_fruit_generation(
                current_emotion, current_score, historical_context
            )
        }
    
    def _extract_emotional_patterns(self) -> Dict[str, Any]:
        """Memory履歴から感情パターン抽出"""
        
        messages = self.memory.chat_memory.messages
        if not messages:
            return {"trend": "neutral", "recent_emotions": []}
        
        # 直近3-5メッセージの感情分析
        recent_emotions = []
        for msg in messages[-6:]:  # ユーザー+AI ペアで3回分
            if hasattr(msg, 'content'):
                emotion, score = detect_emotion_simple(msg.content)
                if emotion:
                    recent_emotions.append(emotion)
        
        return {
            "trend": self._calculate_emotional_trend(recent_emotions),
            "recent_emotions": recent_emotions
        }
    
    def _determine_fruit_generation(
        self, 
        current_emotion: Optional[str], 
        current_score: float,
        historical_context: Dict[str, Any]
    ) -> bool:
        """実生成条件判定（LangChain統合版）"""
        
        if not current_emotion or current_score < 0.7:
            return False
        
        # ポジティブ感情のみ実生成対象
        positive_emotions = ["joy", "gratitude", "accomplishment", "relief", "excitement"]
        
        return current_emotion in positive_emotions and current_score >= 0.7
```

### 2. LangChain Memory連携実生成システム
```python
class LangChainFruitGenerator:
    """ConversationSummaryBufferMemoryと連携した実生成システム"""
    
    def __init__(self, memory: ConversationSummaryBufferMemory):
        self.memory = memory
        self.emotion_analyzer = LangChainEmotionAnalyzer(memory)
    
    async def evaluate_fruit_generation(
        self, 
        user_message: str,
        user_id: str,
        character: str
    ) -> Optional[Dict[str, Any]]:
        """
        LangChain Memory統合実生成評価
        
        特徴:
        - 会話履歴全体を考慮した感情評価
        - Memory自動要約による長期感情パターン分析
        - 1日1回制限との統合
        """
        
        # 感情コンテキスト分析
        emotional_analysis = self.emotion_analyzer.analyze_emotional_context(user_message)
        
        if not emotional_analysis["fruit_worthy"]:
            return None
        
        # 1日1回制限チェック（既存DB機能）
        last_fruit_date = await get_last_fruit_date_from_db(user_id)
        if not can_generate_fruit_today(last_fruit_date):
            return None
        
        # Memory履歴からコンテキスト取得
        conversation_context = self._extract_conversation_context()
        
        return {
            "fruit_id": str(uuid.uuid4()),
            "user_id": user_id,
            "message": self._create_fruit_message(user_message, conversation_context),
            "emotion_trigger": emotional_analysis["current_emotion"],
            "emotion_score": emotional_analysis["current_score"],
            "ai_character": character,
            "character_color": get_character_theme_color(character),
            "conversation_context": conversation_context
        }
    
    def _extract_conversation_context(self) -> str:
        """Memory履歴から実生成用コンテキスト抽出"""
        
        # ConversationSummaryBufferMemoryから要約と直近履歴を取得
        summary = getattr(self.memory, 'moving_summary_buffer', '')
        recent_messages = self.memory.chat_memory.messages[-4:]  # 直近2ターン分
        
        context_parts = []
        if summary:
            context_parts.append(f"これまでの会話: {summary}")
        
        if recent_messages:
            recent_context = []
            for i in range(0, len(recent_messages), 2):
                if i + 1 < len(recent_messages):
                    user_msg = recent_messages[i].content
                    ai_msg = recent_messages[i + 1].content
                    recent_context.append(f"あなた: {user_msg[:50]}...")
            context_parts.extend(recent_context)
        
        return " ".join(context_parts)
    
    def _create_fruit_message(self, current_message: str, context: str) -> str:
        """実メッセージ生成（会話コンテキスト統合）"""
        
        return f"「{current_message[:30]}{'...' if len(current_message) > 30 else ''}」"\
               f"から、あなたの成長と頑張りが伝わってきました。"\
               f"これまでの会話を通じて、あなたの優しさと努力がとても感じられています。"
```

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

## 完全LangChain統合Amazon Bedrock応答システム

### 統合アーキテクチャ概要

**LangChain + Bedrock + DynamoDB統合設計:**
- **ConversationChain**: 標準的なLangChain会話チェーン
- **ConversationSummaryBufferMemory**: 自動要約による長期記憶管理
- **ChatBedrock**: Amazon Bedrock Claude 3 Haiku統合
- **Custom ChatMessageHistory**: DynamoDB永続化

### プラン別LangChain設定

```python
from langchain_aws import ChatBedrock
from langchain.chains import ConversationChain
from langchain.memory import ConversationSummaryBufferMemory
from langchain.prompts import PromptTemplate

class HomebiyoriLangChainService:
    """Homebiyori専用LangChain統合サービス"""
    
    def __init__(self):
        self.llm_cache = {}  # LLMインスタンスキャッシュ
        self.memory_cache = {}  # Memory インスタンスキャッシュ
    
    def get_bedrock_llm(self, user_tier: str) -> ChatBedrock:
        """プラン別ChatBedrockLLM取得（キャッシュ対応）"""
        
        if user_tier in self.llm_cache:
            return self.llm_cache[user_tier]
        
        # プラン別設定
        config = self._get_tier_config(user_tier)
        
        llm = ChatBedrock(
            model_id="anthropic.claude-3-haiku-20240307-v1:0",
            region_name="us-east-1",
            model_kwargs={
                "max_tokens": config["max_tokens"],
                "temperature": 0.7,
                "anthropic_version": "bedrock-2023-05-31"
            },
            # Bedrock固有設定
            streaming=False,  # 非ストリーミング
            cache=True  # レスポンスキャッシュ有効
        )
        
        self.llm_cache[user_tier] = llm
        return llm
    
    def _get_tier_config(self, user_tier: str) -> Dict[str, Any]:
        """プラン別設定取得"""
        
        configs = {
            "free": {
                "max_tokens": 200,  # 無料版: 短い応答
                "memory_tokens": 2000,  # Memory容量制限
                "temperature": 0.7
            },
            "premium": {
                "max_tokens": 400,  # プレミアム: 詳細応答
                "memory_tokens": 8000,  # 4倍のMemory容量
                "temperature": 0.7
            }
        }
        
        return configs.get(user_tier, configs["free"])

# メインAI応答生成関数（完全LangChain統合）
async def generate_ai_response_langchain(
    user_message: str,
    user_id: str,
    character: str = "tama",
    mood: str = "praise"
) -> str:
    """
    完全LangChain統合AI応答生成
    
    特徴:
    - ConversationSummaryBufferMemory自動管理
    - プラン別Memory容量・応答長制御
    - DynamoDB Custom History永続化
    - プロンプトテンプレート動的生成
    """
    
    # LangChain サービス初期化
    langchain_service = HomebiyoriLangChainService()
    
    # ユーザープラン取得
    user_tier = await get_user_tier_from_db(user_id)
    
    # ChatBedrock LLM取得（キャッシュ対応）
    llm = langchain_service.get_bedrock_llm(user_tier)
    
    # ConversationSummaryBufferMemory初期化
    memory = create_conversation_memory(
        user_id=user_id,
        user_tier=user_tier,
        character=character
    )
    
    # プロンプトテンプレート構築
    prompt_template = await build_langchain_prompt_template(
        character=character,
        mood=mood,
        user_tier=user_tier
    )
    
    # ConversationChain構築・実行
    conversation_chain = ConversationChain(
        llm=llm,
        memory=memory.memory,  # ConversationSummaryBufferMemory
        prompt=prompt_template,
        verbose=False,
        return_only_outputs=True
    )
    
    # AI応答生成（Memory自動適用・永続化）
    try:
        result = await conversation_chain.ainvoke({"input": user_message})
        return result["response"]
    
    except Exception as e:
        logger.error(f"LangChain AI generation failed: {e}")
        # フォールバック応答
        return await get_fallback_response(character, user_tier)

# プロンプトテンプレート動的構築
async def build_langchain_prompt_template(
    character: str, 
    mood: str, 
    user_tier: str
) -> PromptTemplate:
    """LangChain用プロンプトテンプレート構築"""
    
    # キャラクター・気分別基本プロンプト読み込み
    prompt_file = f".kiro/specs/homebi-yori/prompt/{character}_{mood}.txt"
    
    try:
        with open(prompt_file, 'r', encoding='utf-8') as f:
            base_prompt = f.read()
    except FileNotFoundError:
        logger.warning(f"Prompt file not found: {prompt_file}")
        base_prompt = get_default_prompt(character, mood)
    
    # プラン別制約追加
    tier_constraints = get_tier_constraints(user_tier, character)
    
    # LangChain Memory変数統合テンプレート
    full_template = f"""
{base_prompt}

{tier_constraints}

=== 会話履歴 ===
{{history}}

=== 現在の入力 ===
ユーザー: {{input}}

=== 応答指示 ===
上記の会話履歴を踏まえ、{character}として継続性のある温かい応答をしてください。
過去の会話内容も考慮して、ユーザーとの関係性を大切にした応答を心がけてください。
"""
    
    return PromptTemplate(
        input_variables=["history", "input"],
        template=full_template.strip()
    )

def get_tier_constraints(user_tier: str, character: str) -> str:
    """プラン別制約文言生成"""
    
    if user_tier == "free":
        return """
=== 【重要】無料版応答制約 ===
- 必ず50-150文字以内で応答すること
- 200文字を超える返答は絶対に禁止
- 深刻な相談でも簡潔に温かく応答
- 詳しい相談は「もっとゆっくりお話しできればいいのに」と誘導
"""
    else:
        return """
=== 【重要】プレミアム版の特徴 ===
- 基本は200-400文字の丁寧で詳しい返答
- 状況に応じて50-150文字の簡潔な返答も可能
- 深い共感と具体的な体験談を提供
- 4段階構成（共感→承認→体験談→励まし）で心に寄り添う応答
- 継続的な関係性を重視したサポート
"""

async def get_fallback_response(character: str, user_tier: str) -> str:
    """フォールバック応答（LangChain失敗時）"""
    
    fallback_responses = {
        "tama": {
            "free": "あらあら〜、お疲れさまやわ〜。大丈夫よ〜、みんな通る道やで。",
            "premium": "あらあら〜、本当にお疲れさまやわ〜。あなたのことを見てると、いつも一生懸命で立派やなって思うのよ。大丈夫、みんな通る道やから、焦らんでいいのよ〜。"
        },
        "madoka": {
            "free": "お疲れさまです！頑張ってる姿、とても素敵ですよ♪",
            "premium": "お疲れさまです！いつも頑張ってる姿を見ていて、本当に素敵だなって思っています。完璧じゃなくても大丈夫、一歩ずつ進んでいけばきっと大丈夫ですよ♪ 応援しています！"
        },
        "hide": {
            "free": "ほほう、お疲れじゃったのう。立派に頑張っとるわい。",
            "premium": "ほほう、お疲れじゃったのう。わしから見ると、あんたは本当によく頑張っとる。完璧でなくともな、その心意気が大切なんじゃよ。ゆっくりでも歩き続けていけば、きっと道は開けるもんじゃ。心配ないて。"
        }
    }
    
    return fallback_responses.get(character, {}).get(user_tier, "温かいメッセージをお送りします。")
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