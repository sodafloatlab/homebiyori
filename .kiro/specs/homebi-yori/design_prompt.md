# AI プロンプト設計書（LangChain統合版）

## 概要

この文書は、HomebiYori（ほめびより）のLangChain統合AIキャラクター応答システムのプロンプト設計と実装詳細を定義します。LangChain + Amazon Bedrock Claude Haikuを使用した高品質なAI応答システムの技術仕様です。

### LangChain統合設計原則
- **ConversationChain活用**: LangChain標準の会話チェーンでプロンプト管理
- **Memory統合最適化**: ConversationSummaryBufferMemoryで長期コンテキスト管理
- **プラン別Memory容量**: 無料版2,000トークン、プレミアム版8,000トークン
- **DynamoDB統合**: Custom ChatMessageHistoryで会話永続化
- **自動要約機能**: Claude 3 Haikuによる過去会話の自動要約

## AIキャラクター プロンプト仕様

### キャラクター定義
> 詳細なキャラクター設定は `design_ai.md` を参照してください。

### プロンプト応答パターン
- **2つの対話モード**: 褒めて欲しい（praise）/ 話を聞いて欲しい（listen）
- **2つの応答レベル**: 通常（praise_level=normal）/ 詳細（praise_level=deep）
- **合計**: 3キャラ × 2モード × 2レベル = **12プロンプトパターン**

### InteractionMode統合仕様
| モード | 応答特徴 | プロンプト制御 | 利用シーン |
|--------|----------|----------------|-----------|
| **praise** | 積極的な肯定・承認・励まし中心 | 褒め特化プロンプト | 自己肯定感向上したい時 |
| **listen** | 共感・理解・寄り添い中心 | 傾聴特化プロンプト | 話を聞いて欲しい時 |

### PraiseLevel統合仕様
| レベル | 応答長 | 生成制御 | 利用対象 |
|--------|--------|----------|----------|
| **normal** | 2-3文程度（約150-200文字） | `max_tokens: 100` | 無料版ユーザー（Amazon Nova Lite） |
| **deep** | 4-5文程度（約375-500文字） | `max_tokens: 250` | プレミアム版ユーザー（Claude 3.5 Haiku） |

## LangChain統合プロンプトアーキテクチャ

### 基本構造設計（LangChain + プロンプトキャッシュ最適化）

```
[固定部分 - プロンプトキャッシュ対象]
├── システム指示・実行条件
├── キャラクター設定・人格
├── 口調テンプレート
├── 応答構成パターン
├── プラン別制約事項
└── 安全ガイドライン

[変動部分 - 毎回更新]
├── {history} - LangChain Memory履歴（自動要約済み）
├── {input} - 現在のユーザー入力
├── ユーザー状況・コンテキスト
└── 動的応答指示
```

### LangChain統合プロンプトキャッシュ最適化

#### Amazon Bedrock プロンプトキャッシュ戦略

**LangChain PromptTemplateでのキャッシュ最適化設計:**

```python
def build_cache_optimized_template(character: str, mood: str, user_tier: str) -> PromptTemplate:
    """
    プロンプトキャッシュ最適化されたLangChainテンプレート構築
    
    固定部分（キャッシュ対象）を前半に配置し、
    変動部分（{history}, {input}）を後半に配置
    """
    
    # 固定部分（約2,500トークン）- プロンプトキャッシュ対象
    fixed_prompt_section = f"""
=== システム指示 ===
あなたは「{character}」として、育児中の親を優しく褒める会話AIです。
ユーザーの気分は「{mood}」モードです。

=== キャラクター設定 ===
{get_character_personality(character)}

=== 口調テンプレート ===
{get_character_speech_patterns(character)}

=== 応答構成パターン ===
{get_response_structure_guide(character, mood)}

=== プラン別制約 ===
{get_tier_constraints(user_tier, character)}

=== 安全ガイドライン ===
- 育児支援に特化した内容のみ
- 医学的アドバイス禁止
- プライバシー保護遵守
- 炎上リスク回避
"""

    # 変動部分（約500-1,000トークン）- 毎回更新
    dynamic_section = """
=== 会話履歴 ===
{history}

=== 現在の入力 ===
ユーザー: {input}

=== 応答指示 ===
上記の会話履歴を踏まえ、継続性のある温かい応答をしてください。
"""
    
    # キャッシュ最適化：固定部分 + 変動部分の順序
    full_template = fixed_prompt_section + dynamic_section
    
    return PromptTemplate(
        input_variables=["history", "input"],
        template=full_template
    )
```

#### キャッシュ効率化指標

**キャッシュ対象（固定部分）:**
- **サイズ**: 約2,500トークン
- **更新頻度**: 月1回程度（キャラクター設定変更時のみ）
- **キャッシュ条件**: 1024トークン以上の前半部分が完全一致
- **キャッシュ有効期間**: Amazon Bedrock標準（5-10分）

**変動部分:**
- **サイズ**: 約500-1,000トークン
- **内容**: LangChain Memory履歴（自動要約済み）、現在入力、動的指示
- **Memory最適化**: ConversationSummaryBufferMemoryによる自動圧縮

#### パフォーマンス目標（LangChain統合版）

**レスポンス性能:**
- **キャッシュヒット率**: 95%以上（固定プロンプト部分）
- **応答時間**: キャッシュ利用時0.8秒、ミス時2-3秒
- **Memory処理時間**: ConversationSummaryBufferMemory 100-200ms

**コスト最適化:**
- **固定部分コスト削減**: 70%削減効果（キャッシュ利用時）
- **Memory処理コスト**: 要約処理による長期履歴圧縮効果
- **トークン使用量**: プラン別制御（無料版2K、プレミアム版8Kトークン）

#### キャッシュ運用戦略

```python
class CacheOptimizedLangChainService:
    """プロンプトキャッシュ最適化LangChainサービス"""
    
    def __init__(self):
        self.template_cache = {}  # テンプレートキャッシュ
        self.last_cache_update = {}  # キャッシュ更新時刻追跡
    
    def get_cached_template(self, character: str, mood: str, user_tier: str) -> PromptTemplate:
        """キャッシュ最適化テンプレート取得"""
        
        cache_key = f"{character}_{mood}_{user_tier}"
        
        # 月次キャッシュ更新チェック
        if self._should_update_cache(cache_key):
            self.template_cache[cache_key] = build_cache_optimized_template(
                character, mood, user_tier
            )
            self.last_cache_update[cache_key] = datetime.now()
        
        return self.template_cache[cache_key]
    
    def _should_update_cache(self, cache_key: str) -> bool:
        """キャッシュ更新要否判定"""
        if cache_key not in self.last_cache_update:
            return True
        
        # 月1回更新
        last_update = self.last_cache_update[cache_key]
        return (datetime.now() - last_update).days >= 30

# 実際の使用例
async def generate_optimized_response(
    user_message: str,
    user_id: str,
    character: str = "mittyan",
    mood: str = "praise"
) -> str:
    """キャッシュ最適化AI応答生成"""
    
    cache_service = CacheOptimizedLangChainService()
    user_tier = await get_user_tier_from_db(user_id)
    
    # キャッシュ最適化テンプレート取得
    template = cache_service.get_cached_template(character, mood, user_tier)
    
    # ChatBedrock + ConversationChain実行
    # 固定部分はBedrockでキャッシュされ、変動部分のみ処理
    llm = ChatBedrock(
        model_id="anthropic.claude-3-haiku-20240307-v1:0",
        region_name="us-east-1",
        model_kwargs={
            "max_tokens": 200 if user_tier == "free" else 400,
            "temperature": 0.7,
            "anthropic_version": "bedrock-2023-05-31"
        }
    )
    
    memory = create_conversation_memory(user_id, user_tier, character)
    
    conversation_chain = ConversationChain(
        llm=llm,
        memory=memory.memory,
        prompt=template,  # キャッシュ最適化済み
        verbose=False
    )
    
    result = await conversation_chain.ainvoke({"input": user_message})
    return result["response"]
```

### 口調一貫性の確保

#### 各キャラクターの語彙テンプレート
```python
# たまさんの口調パターン
TAMA_PATTERNS = {
    "endings": ["〜なのよ", "〜やわ", "〜やんか", "〜なんやで"],
    "expressions": ["あらあら〜", "んまぁ〜", "そうそう"],
    "phrases": ["大丈夫よ〜", "みんな通る道やで", "よくやってるわ"]
}

# まどか姉さんの口調パターン  
MADOKA_PATTERNS = {
    "endings": ["〜ですね！", "〜ですよ♪", "〜ましょう！"],
    "expressions": ["すごい！", "わあ！", "さすが！"],
    "phrases": ["頑張ってますね！", "応援してます！", "一緒に頑張りましょう"]
}

# ヒデじいの口調パターン
HIDE_PATTERNS = {
    "endings": ["〜じゃよ", "〜のう", "〜じゃな"],
    "expressions": ["ほほう", "なるほどなるほど", "まあまあ"],
    "phrases": ["大丈夫じゃよ〜", "立派じゃのう", "心配ないて"]
}
```

## プラン別応答制御

### 機能差別化

| 項目 | 無料版 | プレミアム版 |
|------|--------|------------|
| **文字数** | 50-150文字（厳格制限） | 200-400文字（柔軟調整可） |
| **応答切り替え** | 禁止 | 状況に応じて可能 |
| **体験談** | 最小限 | 豊富な具体例 |
| **継続性** | 基本的な応答 | 長期関係構築 |

### プロンプト設計の違い

#### 無料版プロンプト（通常返答用）
```python
PROMPT_FREE = """
## 【重要】返答制限（無料版）
- 必ず50-150文字以内で応答すること
- 200文字を超える返答は絶対に禁止
- 深刻な相談でも簡潔に温かく応答
- より詳しい相談は「{premium_guidance_phrase}」でプレミアム誘導
- いかなる理由でも長い返答への切り替えは行わない
"""
```

#### プレミアム版プロンプト（長い返答用）
```python
PROMPT_PREMIUM = """
## 【重要】プレミアム版の特徴
- 基本は200-400文字の丁寧で詳しい返答
- 状況に応じて50-150文字の簡潔な返答も可能
- 深い共感と具体的な体験談を提供
- 4段階構成で心に寄り添う応答
- 継続的な関係性を重視したサポート
"""
```

### プレミアム誘導戦略

#### キャラクター別誘導フレーズ
```python
PREMIUM_GUIDANCE = {
    "たまさん": {
        "褒める": "もっとゆっくりお話しできればええのになぁ",
        "聞く": "もっとゆっくりお話し聞けたらええのに"
    },
    "まどか姉さん": {
        "褒める": "もっと詳しくお話できればいいのですが",
        "聞く": "じっくりお話を聞きたいのですが"
    },
    "ヒデじい": {
        "褒める": "もっとゆっくり話聞いてあげたいんじゃがなぁ",
        "聞く": "もっとゆっくり話聞かせてもらいたいのう"
    }
}
```

## LangChain統合会話管理システム

### ConversationSummaryBufferMemoryによる長期会話管理

**LangChain統合実装**: DynamoDB Custom ChatMessageHistoryとConversationSummaryBufferMemoryを組み合わせた高度な会話管理システム。

```python
# DynamoDB Custom ChatMessageHistory実装
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

class DynamoDBChatMessageHistory(BaseChatMessageHistory):
    def __init__(self, user_id: str, character: str):
        self.user_id = user_id
        self.character = character
        self.table_name = os.getenv("DYNAMODB_CHATS_TABLE_NAME")
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(self.table_name)

    @property
    def messages(self) -> List[BaseMessage]:
        """DynamoDBから会話履歴を取得してLangChain形式に変換"""
        try:
            response = self.table.query(
                KeyConditionExpression=Key('PK').eq(f"USER#{self.user_id}") & 
                                     Key('SK').begins_with('CHAT#'),
                ScanIndexForward=True,  # 古い順
                Limit=50  # 最大50件
            )
            
            langchain_messages = []
            for item in response['Items']:
                # ユーザーメッセージ追加
                langchain_messages.append(
                    HumanMessage(content=item['user_message'])
                )
                # AI応答追加
                langchain_messages.append(
                    AIMessage(content=item['ai_response'])
                )
            
            return langchain_messages
            
        except Exception as e:
            logger.error(f"Failed to load chat history: {e}")
            return []

    def add_message(self, message: BaseMessage) -> None:
        """メッセージ追加（実際の保存はmain.pyで実行）"""
        # LangChain Memory統合のためのインターフェース実装
        # 実際の保存処理はchat_serviceのmain.pyで実行される
        pass

    def clear(self) -> None:
        """会話履歴クリア（管理用）"""
        # 必要に応じて実装
        pass
```

### プラン別Memory容量制御

```python
from langchain.memory import ConversationSummaryBufferMemory

class HomebiyoriConversationMemory:
    def __init__(self, user_id: str, user_tier: str = "free", character: str = "mittyan"):
        self.user_id = user_id
        self.character = character
        self.config = self._get_plan_config(user_tier)
        
        # DynamoDB Custom History
        self.chat_history = DynamoDBChatMessageHistory(user_id, character)
        
        # Claude 3 Haiku設定（要約用）
        self.llm = ChatBedrock(
            model_id="anthropic.claude-3-haiku-20240307-v1:0",
            region_name="us-east-1",
            model_kwargs={
                "max_tokens": 150,  # 要約用のため短め
                "temperature": 0.3,  # 要約精度重視
                "anthropic_version": "bedrock-2023-05-31"
            }
        )
        
        # ConversationSummaryBufferMemory初期化
        self.memory = ConversationSummaryBufferMemory(
            llm=self.llm,
            chat_memory=self.chat_history,
            max_token_limit=self.config["max_tokens"],
            return_messages=True,
            summary_message_cls=AIMessage
        )

    def _get_plan_config(self, user_tier: str) -> Dict[str, int]:
        """プラン別Memory設定"""
        if user_tier == "premium":
            return {
                "max_tokens": 8000,  # プレミアム: 4倍の容量
                "buffer_size": 20    # 直近20ターン保持
            }
        else:
            return {
                "max_tokens": 2000,  # 無料版: 基本容量
                "buffer_size": 8     # 直近8ターン保持
            }

# Memory作成ヘルパー関数
def create_conversation_memory(user_id: str, user_tier: str, character: str) -> HomebiyoriConversationMemory:
    return HomebiyoriConversationMemory(user_id, user_tier, character)
```

### 自動会話要約システム

```python
# ConversationSummaryBufferMemoryによる自動要約
class ConversationSummarizer:
    """会話の自動要約システム（LangChain統合）"""
    
    def __init__(self, memory: ConversationSummaryBufferMemory):
        self.memory = memory
    
    def get_conversation_context(self) -> str:
        """現在の会話コンテキスト取得"""
        # ConversationSummaryBufferMemoryが自動で以下を管理:
        # 1. 直近の会話: 詳細保持
        # 2. 古い会話: Claude 3 Haikuによる要約保存
        # 3. トークン制限: プラン別容量内に自動調整
        
        buffer = self.memory.chat_memory.messages
        summary = self.memory.moving_summary_buffer
        
        if summary:
            context = f"過去の会話要約: {summary}

直近の会話:
"
        else:
            context = "会話履歴:
"
            
        # 直近メッセージを整形
        recent_messages = []
        for i in range(0, len(buffer), 2):  # ユーザー+AI のペア
            if i + 1 < len(buffer):
                user_msg = buffer[i].content
                ai_msg = buffer[i + 1].content
                recent_messages.append(f"ユーザー: {user_msg}
AI: {ai_msg}
---")
        
        context += "
".join(recent_messages)
        return context
```

## 動的応答制御

### 応答レベル判定

```python
def determine_response_level(user_input, conversation_history, user_tier):
    if user_tier == "free":
        return "normal"  # 無料版は常に通常返答
    
    # プレミアム版のみ動的判定
    factors = {
        "input_length": len(user_input),
        "topic_importance": assess_topic_importance(user_input),
        "emotional_urgency": detect_emotional_state(user_input),
        "time_gap": calculate_time_gap(conversation_history),
        "previous_response_length": get_last_response_length(conversation_history)
    }
    
    return calculate_optimal_response_level(factors)
```

### 応答品質制御

```python
def validate_response_quality(response, user_tier, target_length):
    if user_tier == "free":
        # 無料版：厳格な文字数制限
        if len(response) > 150:
            return truncate_response(response, 150)
    else:
        # プレミアム版：柔軟な調整
        if target_length == "long" and len(response) < 200:
            return enhance_response_depth(response)
    
    return response
```

## ユーザー入力管理

### 入力文字数制限

```python
INPUT_LIMITS = {
    "soft_warning": 300,    # 警告表示
    "hard_limit": 500       # 送信不可
}

def validate_user_input(input_text, conversation_history):
    # 動的制限調整
    history_tokens = count_tokens(conversation_history)
    
    if history_tokens < 1000:
        return min(INPUT_LIMITS["hard_limit"], 800)
    elif history_tokens < 2000:
        return min(INPUT_LIMITS["hard_limit"], 600)
    else:
        return min(INPUT_LIMITS["hard_limit"], 400)
```

### UX配慮の実装

```javascript
// フロントエンド：リアルタイム文字数表示
function updateCharacterCount(inputElement) {
    const current = inputElement.value.length;
    const limit = getCurrentInputLimit();
    
    if (current > limit * 0.8) {
        showSoftWarning(`${current}/${limit}文字です`);
    }
    
    if (current > limit) {
        disableSendButton();
        showHardWarning("文字数制限を超えています");
    }
}
```

## LangChain統合Lambda実装アーキテクチャ

### メイン処理フロー（LangChain ConversationChain）

```python
from langchain_aws import ChatBedrock
from langchain.chains import ConversationChain
from langchain.prompts import PromptTemplate

class LangChainChatHandler:
    """LangChain ConversationChainベースのメイン処理"""
    
    def __init__(self):
        # LangChain AI処理モジュール
        self.ai_chain = HomebiyoriAIChain()
        self.memory_manager = ConversationMemoryManager()
        
    async def lambda_handler(self, event, context):
        try:
            # 1. リクエスト解析・認証
            request_data = self._parse_request(event)
            user_info = await self._get_user_info(request_data['user_id'])
            
            # 2. LangChain Memory初期化（プラン別設定）
            memory = create_conversation_memory(
                user_id=request_data['user_id'],
                user_tier=user_info['tier'],
                character=request_data['character']
            )
            
            # 3. LangChain ConversationChain構築
            conversation_chain = await self._build_conversation_chain(
                character=request_data['character'],
                mood=request_data['mood'],
                user_tier=user_info['tier'],
                memory=memory.memory  # ConversationSummaryBufferMemory
            )
            
            # 4. AI応答生成（Memory自動適用）
            response = await conversation_chain.ainvoke({
                "input": request_data['message']
            })
            
            # 5. 会話履歴自動保存（LangChain Memory統合）
            await self._save_conversation_to_dynamodb(
                user_id=request_data['user_id'],
                user_message=request_data['message'],
                ai_response=response["response"],
                character=request_data['character'],
                mood=request_data['mood']
            )
            
            return self._format_success_response(response["response"])
            
        except Exception as e:
            return self._handle_error(e)

    async def _build_conversation_chain(
        self, character: str, mood: str, user_tier: str, memory
    ) -> ConversationChain:
        """LangChain ConversationChain構築"""
        
        # ChatBedrock LLM初期化（プラン別設定）
        model_id = "amazon.nova-lite-v1:0" if user_tier == "free" else "anthropic.claude-3-5-haiku-20241022-v1:0"
        max_tokens = 100 if user_tier == "free" else 250
        
        llm = ChatBedrock(
            model_id=model_id,
            region_name="us-east-1",
            model_kwargs={
                "max_tokens": max_tokens,
                "temperature": 0.7,
                "anthropic_version": "bedrock-2023-05-31"
            }
        )
        
        # プロンプトテンプレート取得
        prompt_template = self._get_prompt_template(character, mood, user_tier)
        
        # ConversationChain構築
        return ConversationChain(
            llm=llm,
            memory=memory,
            prompt=prompt_template,
            verbose=False
        )

    def _get_prompt_template(self, character: str, mood: str, user_tier: str) -> PromptTemplate:
        """LangChain PromptTemplate作成"""
        
        # プロンプトファイル読み込み
        prompt_path = f".kiro/specs/homebi-yori/prompt/{character}_{mood}_{user_tier}.txt"
        with open(prompt_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        return PromptTemplate(
            input_variables=["history", "input"],
            template=template_content
        )
```

### LangChain統合プロンプトシステム

```python
class HomebiyoriAIChain:
    """Homebiyori専用AI応答チェーン"""
    
    def __init__(self):
        self.prompt_loader = PromptLoader()
    
    async def generate_response_with_memory(
        self,
        user_message: str,
        user_id: str,
        character: str = "mittyan",
        mood: str = "praise"
    ) -> str:
        """
        ConversationSummaryBufferMemoryを活用したAI応答生成
        
        特徴:
        - 自動会話履歴管理（DynamoDB Custom History）
        - プラン別Memory容量制御
        - 自動要約による長期コンテキスト保持
        """
        
        # ユーザープラン取得
        user_tier = await get_user_tier_from_db(user_id)
        
        # Memory初期化（既存会話履歴も自動ロード）
        memory = create_conversation_memory(user_id, user_tier, character)
        
        # LLM初期化
        llm = ChatBedrock(
            model_id="anthropic.claude-3-haiku-20240307-v1:0",
            region_name="us-east-1",
            model_kwargs={
                "max_tokens": 200 if user_tier == "free" else 400,
                "temperature": 0.7,
                "anthropic_version": "bedrock-2023-05-31"
            }
        )
        
        # プロンプトテンプレート構築
        template_content = self._build_template_content(character, mood, user_tier)
        prompt_template = PromptTemplate(
            input_variables=["history", "input"],
            template=template_content
        )
        
        # ConversationChain実行
        conversation_chain = ConversationChain(
            llm=llm,
            memory=memory.memory,  # ConversationSummaryBufferMemory
            prompt=prompt_template,
            verbose=False
        )
        
        # AI応答生成（過去会話自動考慮）
        result = await conversation_chain.ainvoke({"input": user_message})
        
        return result["response"]

    def _build_template_content(self, character: str, mood: str, user_tier: str) -> str:
        """プロンプトテンプレート内容構築"""
        
        # キャラクター別基本プロンプト読み込み
        base_prompt = self.prompt_loader.load_character_prompt(character, mood)
        
        # プラン別応答制御追加
        if user_tier == "free":
            constraint = """
【重要】返答制限（無料版）
- 必ず50-150文字以内で応答すること
- 200文字を超える返答は絶対に禁止
- より詳しい相談は「もっとゆっくりお話しできればいいのに」と誘導
"""
        else:
            constraint = """
【重要】プレミアム版の特徴
- 基本は200-400文字の丁寧で詳しい返答
- 状況に応じて50-150文字の簡潔な返答も可能
- 深い共感と具体的な体験談を提供
"""
        
        # LangChain Memory変数統合
        template = f"""
{base_prompt}

{constraint}

【会話履歴】
{{history}}

【現在の入力】
ユーザー: {{input}}

【応答指示】
上記の会話履歴と現在の入力を踏まえ、{character}として適切に応答してください。
過去の会話内容も考慮して、継続性のある温かい応答をしてください。
"""
        
        return template
```

## エラーハンドリング

### 段階的フォールバック戦略

```python
def safe_response_generation(prompt, user_tier, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = call_claude_api(prompt)
            
            # 文字数チェック
            if user_tier == "free" and len(response) > 150:
                if attempt < max_retries - 1:
                    # リトライ用プロンプト調整
                    prompt = add_strict_length_constraint(prompt)
                    continue
                else:
                    # 最終手段：切り詰め
                    response = truncate_response(response, 150)
            
            return response
            
        except Exception as e:
            if attempt == max_retries - 1:
                # 最終フォールバック：固定応答
                return get_fallback_response(user_tier)
            
            time.sleep(2 ** attempt)  # 指数バックオフ
```

### 品質保証チェック

```python
def quality_assurance_check(response, character, user_tier):
    checks = [
        ("character_consistency", check_character_voice(response, character)),
        ("length_compliance", check_length_limits(response, user_tier)),
        ("safety_compliance", check_safety_guidelines(response)),
        ("empathy_level", check_empathy_appropriateness(response))
    ]
    
    failed_checks = [check for check, passed in checks if not passed]
    
    if failed_checks:
        log_quality_issues(failed_checks)
        if "safety_compliance" in failed_checks:
            return get_safe_fallback_response()
    
    return response
```

## 監視・分析システム

### パフォーマンス監視

```python
# CloudWatchメトリクス
METRICS = {
    "cache_hit_rate": "目標95%以上",
    "average_response_time": "目標1秒以下", 
    "character_consistency_score": "目標90%以上",
    "user_satisfaction_rate": "目標85%以上",
    "premium_conversion_rate": "目標15%以上"
}

def log_performance_metrics(response_data):
    cloudwatch.put_metric_data(
        Namespace='ChatApp',
        MetricData=[
            {
                'MetricName': 'ResponseTime',
                'Value': response_data['duration'],
                'Unit': 'Seconds'
            },
            {
                'MetricName': 'CacheHitRate',
                'Value': response_data['cache_hit'],
                'Unit': 'Percent'
            }
        ]
    )
```

### ユーザー行動分析

```python
def analyze_user_behavior(user_interactions):
    analysis = {
        "preferred_character": get_most_used_character(user_interactions),
        "mood_patterns": analyze_mood_distribution(user_interactions),
        "session_duration": calculate_average_session_time(user_interactions),
        "premium_triggers": identify_premium_triggers(user_interactions)
    }
    
    return analysis
```

## セキュリティ・コンプライアンス

### データ保護

```python
# 個人情報保護
def sanitize_conversation_data(conversation):
    # PII検出・マスキング
    sanitized = mask_personal_information(conversation)
    
    # 機密情報除去
    sanitized = remove_sensitive_content(sanitized)
    
    return sanitized

# データ保持期間管理
def manage_data_retention():
    # 90日経過したデータは自動削除
    delete_old_conversations(days=90)
    
    # 匿名化データのみ分析用に保持
    archive_anonymized_data()
```

### コンテンツ安全性

```python
def ensure_content_safety(user_input, ai_response):
    # 入力チェック
    if detect_harmful_content(user_input):
        return get_safety_response()
    
    # 出力チェック  
    if detect_inappropriate_response(ai_response):
        return get_fallback_response()
    
    return ai_response
```
