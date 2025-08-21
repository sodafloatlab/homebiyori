# AI プロンプト設計書（Issue #15統一戦略版）

## 概要

この文書は、HomebiYori（ほめびより）のIssue #15統一戦略に基づくLangChain統合AIキャラクター応答システムのプロンプト設計と実装詳細を定義します。LangChain + Amazon Bedrock Claude Haikuを使用した統一品質AI応答システムの技術仕様です。

### Issue #15統一戦略設計原則
- **統一機能提供**: 全ユーザーが同等の高品質AI体験を享受
- **7日間無料トライアル**: 新規ユーザーに統一機能を7日間提供
- **ConversationChain活用**: LangChain標準の会話チェーンでプロンプト管理
- **Memory統合最適化**: ConversationSummaryBufferMemoryで長期コンテキスト管理
- **DynamoDB統合**: Custom ChatMessageHistoryで会話永続化
- **自動要約機能**: Claude 3 Haikuによる過去会話の自動要約

## AIキャラクター プロンプト仕様

### キャラクター定義
> 詳細なキャラクター設定は `design_ai.md` を参照してください。

#### 更新されたキャラクター名
- **みっちゃん**: 下町のベテランおばちゃん（旧：たまさん）
- **まどかさん**: 現役バリキャリママ（旧：まどか姉さん）
- **ヒデじい**: 人生経験豊富なおじいちゃん（変更なし）

### プロンプト応答パターン（統一戦略版）
- **2つの対話モード**: 褒めて欲しい（praise）/ 話を聞いて欲しい（listen）
- **2つの応答バージョン**: 簡潔応答版（normal）/ 深い思慮版（deep）
- **合計**: 3キャラ × 2モード × 2バージョン = **12プロンプトパターン**

### InteractionMode統合仕様
| モード | 応答特徴 | プロンプト制御 | 利用シーン |
|--------|----------|----------------|-----------|
| **praise** | 積極的な肯定・承認・励まし中心 | 褒め特化プロンプト | 自己肯定感向上したい時 |
| **listen** | 共感・理解・寄り添い中心 | 傾聴特化プロンプト | 話を聞いて欲しい時 |

### PraiseLevel統合仕様（統一戦略版）
| バージョン | 応答特徴 | 文字数範囲 | 主要価値 |
|-----------|----------|------------|----------|
| **normal（簡潔応答版）** | 素早く的確な応答 | 50-150文字 | スピード重視、忙しい時に最適 |
| **deep（深い思慮版）** | 深く考えた柔軟な応答 | 50-400文字（状況に応じて調整） | 思慮深さ重視、じっくり相談時に最適 |

## 統一戦略プロンプトアーキテクチャ

### 基本構造設計（統一品質 + プロンプトキャッシュ最適化）

```
[固定部分 - プロンプトキャッシュ対象]
├── システム指示・実行条件
├── キャラクター設定・人格
├── 口調テンプレート
├── 応答構成パターン
├── 統一品質制約事項
└── 安全ガイドライン

[変動部分 - 毎回更新]
├── {history} - LangChain Memory履歴（自動要約済み）
├── {input} - 現在のユーザー入力
├── ユーザー状況・コンテキスト
└── 動的応答指示
```

### 統一戦略プロンプトキャッシュ最適化

#### Amazon Bedrock プロンプトキャッシュ戦略

**LangChain PromptTemplateでのキャッシュ最適化設計:**

```python
def build_unified_cache_optimized_template(character: str, mood: str, version: str) -> PromptTemplate:
    """
    統一戦略対応プロンプトキャッシュ最適化LangChainテンプレート構築
    
    固定部分（キャッシュ対象）を前半に配置し、
    変動部分（{history}, {input}）を後半に配置
    """
    
    # 固定部分（約2,500トークン）- プロンプトキャッシュ対象
    fixed_prompt_section = f"""
=== システム指示 ===
あなたは「{character}」として、育児中の親を優しく支援する会話AIです。
ユーザーの気分は「{mood}」モードです。
応答バージョン: {version}版（{get_version_description(version)}）

=== 統一戦略実行条件 ===
- 全ユーザーに統一品質の高品質AI体験を提供
- Issue #15統一戦略に基づく一貫した応答品質
- プレミアム誘導文言は一切使用禁止

=== キャラクター設定 ===
{get_character_personality(character)}

=== 口調テンプレート ===
{get_character_speech_patterns(character)}

=== 応答構成パターン（{version}版） ===
{get_unified_response_structure_guide(character, mood, version)}

=== 統一品質制約 ===
{get_unified_quality_constraints(version, character)}

=== 安全ガイドライン ===
- 育児支援に特化した内容のみ
- 医学的アドバイス禁止
- プライバシー保護遵守
- 炎上リスク回避
- プレミアム誘導禁止（統一戦略）
"""

    # 変動部分（約500-1,000トークン）- 毎回更新
    dynamic_section = """
=== 会話履歴 ===
{history}

=== 現在の入力 ===
ユーザー: {input}

=== 統一品質応答指示 ===
上記の会話履歴を踏まえ、{version}版の特徴を活かした継続性のある温かい応答をしてください。
"""
    
    # キャッシュ最適化：固定部分 + 変動部分の順序
    full_template = fixed_prompt_section + dynamic_section
    
    return PromptTemplate(
        input_variables=["history", "input"],
        template=full_template
    )

def get_version_description(version: str) -> str:
    """バージョン説明取得"""
    descriptions = {
        "normal": "簡潔応答版 - 素早く的確な応答",
        "deep": "深い思慮版 - 柔軟な長さで深く考えた応答"
    }
    return descriptions.get(version, "標準応答版")
```

#### キャッシュ効率化指標（統一戦略版）

**キャッシュ対象（固定部分）:**
- **サイズ**: 約2,500トークン
- **更新頻度**: 月1回程度（キャラクター設定変更時のみ）
- **キャッシュ条件**: 1024トークン以上の前半部分が完全一致
- **キャッシュ有効期間**: Amazon Bedrock標準（5-10分）

**変動部分:**
- **サイズ**: 約500-1,000トークン
- **内容**: LangChain Memory履歴（自動要約済み）、現在入力、動的指示
- **Memory最適化**: ConversationSummaryBufferMemoryによる自動圧縮

#### パフォーマンス目標（統一戦略版）

**レスポンス性能:**
- **キャッシュヒット率**: 95%以上（固定プロンプト部分）
- **応答時間**: キャッシュ利用時0.8秒、ミス時2-3秒
- **Memory処理時間**: ConversationSummaryBufferMemory 100-200ms

**コスト最適化:**
- **固定部分コスト削減**: 70%削減効果（キャッシュ利用時）
- **Memory処理コスト**: 要約処理による長期履歴圧縮効果
- **トークン使用量**: 統一設定による最適化

### 口調一貫性の確保（更新版）

#### 各キャラクターの語彙テンプレート
```python
# みっちゃんの口調パターン（更新）
MITTYAN_PATTERNS = {
    "endings": ["〜なのよ", "〜やわ", "〜やんか", "〜なんやで"],
    "expressions": ["あらあら〜", "んまぁ〜", "そうそう"],
    "phrases": ["大丈夫よ〜", "みんな通る道やで", "よくやってるわ"]
}

# まどかさんの口調パターン（更新）
MADOKASAN_PATTERNS = {
    "endings": ["〜ですね！", "〜ですよ♪", "〜ましょう！"],
    "expressions": ["すごい！", "わあ！", "さすが！"],
    "phrases": ["頑張ってますね！", "応援してます！", "一緒に頑張りましょう"]
}

# ヒデじいの口調パターン（変更なし）
HIDEJI_PATTERNS = {
    "endings": ["〜じゃよ", "〜のう", "〜じゃな"],
    "expressions": ["ほほう", "なるほどなるほど", "まあまあ"],
    "phrases": ["大丈夫じゃよ〜", "立派じゃのう", "心配ないて"]
}
```

## 統一戦略応答制御

### 応答バージョン特徴（統一戦略版）

| 項目 | normal版（簡潔応答版） | deep版（深い思慮版） |
|------|----------------------|-------------------|
| **基本文字数** | 50-150文字 | 200-400文字（基本） |
| **柔軟性** | 固定範囲内 | 状況に応じて50-150文字も可能 |
| **応答速度** | 最優先 | 思慮深さ優先 |
| **利用シーン** | 忙しい時、軽い相談 | じっくり相談、深刻な悩み |
| **価値提案** | スピード重視 | 品質重視 |

### プロンプト設計の違い（統一戦略版）

#### normal版プロンプト（簡潔応答版）
```python
PROMPT_NORMAL_UNIFIED = """
## 【重要】簡潔応答版の特徴
- 素早い判断で的確な応答を提供
- 50-150文字程度の簡潔な応答
- 忙しい時、軽い相談、日常の話題に最適
- 効率的でわかりやすい応答

## 【重要】統一戦略実行条件
- 全ユーザーに統一品質を提供
- プレミアム誘導文言は一切使用禁止
- Issue #15統一戦略に基づく一貫した品質
"""
```

#### deep版プロンプト（深い思慮版）
```python
PROMPT_DEEP_UNIFIED = """
## 【重要】深い思慮版の柔軟な応答制御
### 長い応答（200-400文字）を使う場面
- 初回の挨拶・自己紹介時
- ユーザーが深刻な悩みや重要な相談をした時
- 感情的に辛そうな状況を話した時
- しばらく会話が途切れていた後の再開時

### 短い応答（50-150文字）を使う場面  
- 軽い愚痴や日常的な話の時
- ユーザーの返答が短文・単語の時
- 連続した会話の2回目以降
- 簡単な相槌や共感の時

### 判断基準
- ユーザーメッセージの長さと感情の深刻度
- 話の継続性とユーザーの状況
- 感情の緊急度と会話の文脈

## 【重要】統一戦略実行条件
- 全ユーザーに統一品質を提供
- 柔軟な応答長調整で適切な品質を提供
- プレミアム誘導文言は一切使用禁止
"""
```

### 統一戦略サービス実装

#### 統一品質応答生成サービス
```python
class UnifiedStrategyLangChainService:
    """Issue #15統一戦略対応LangChainサービス"""
    
    def __init__(self):
        self.template_cache = {}  # テンプレートキャッシュ
        self.last_cache_update = {}  # キャッシュ更新時刻追跡
    
    def get_unified_template(self, character: str, mood: str, version: str) -> PromptTemplate:
        """統一戦略テンプレート取得"""
        
        cache_key = f"unified_{character}_{mood}_{version}"
        
        # 月次キャッシュ更新チェック
        if self._should_update_cache(cache_key):
            self.template_cache[cache_key] = build_unified_cache_optimized_template(
                character, mood, version
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

# 統一戦略応答生成
async def generate_unified_response(
    user_message: str,
    user_id: str,
    character: str = "mittyan",
    mood: str = "praise",
    version: str = "normal"
) -> str:
    """統一戦略AI応答生成"""
    
    unified_service = UnifiedStrategyLangChainService()
    
    # 統一品質テンプレート取得
    template = unified_service.get_unified_template(character, mood, version)
    
    # ChatBedrock + ConversationChain実行
    llm = ChatBedrock(
        model_id="anthropic.claude-3-haiku-20240307-v1:0",
        region_name="us-east-1",
        model_kwargs=get_unified_model_kwargs(version)
    )
    
    memory = create_unified_conversation_memory(user_id, character)
    
    conversation_chain = ConversationChain(
        llm=llm,
        memory=memory.memory,
        prompt=template,  # 統一戦略キャッシュ最適化済み
        verbose=False
    )
    
    result = await conversation_chain.ainvoke({"input": user_message})
    return result["response"]

def get_unified_model_kwargs(version: str) -> dict:
    """統一戦略model_kwargs設定"""
    if version == "normal":
        return {
            "max_tokens": 200,
            "temperature": 0.7,
            "anthropic_version": "bedrock-2023-05-31"
        }
    else:  # deep版
        return {
            "max_tokens": 500,
            "temperature": 0.7,
            "anthropic_version": "bedrock-2023-05-31"
        }
```

## 統一戦略品質保証

### 品質指標
- **応答品質一貫性**: 全ユーザーが同等の高品質体験
- **キャラクター一貫性**: 統一されたキャラクター設定と口調
- **応答適切性**: バージョン別特徴の適切な活用
- **ユーザー満足度**: 統一機能による満足度向上

### 統一戦略効果測定
- **ユーザーエンゲージメント**: 統一品質による利用継続率
- **コンバージョン率**: 7日間トライアル後の課金率
- **応答品質評価**: AI応答の品質均一性
- **システムパフォーマンス**: キャッシュ効率と応答速度

### 運用監視項目
- **プレミアム誘導排除**: 統一戦略遵守の確認
- **応答長制御**: バージョン別応答特徴の適切な実行
- **キャラクター一貫性**: 更新されたキャラクター名の正確な使用
- **品質均一性**: 全ユーザー間での応答品質均等性

## まとめ

Issue #15統一戦略により、HomebiYoriは以下を実現：

1. **統一品質体験**: 全ユーザーが同等の高品質AI応答を享受
2. **7日間無料トライアル**: 新規ユーザーに統一機能を完全提供
3. **バージョン別価値**: normal版（スピード）とdeep版（思慮深さ）の明確な価値提案
4. **運用効率化**: プロンプトキャッシュ最適化とメンテナンス性向上
5. **キャラクター統一**: 更新されたキャラクター設定の一貫した適用

この統一戦略により、ユーザー体験の向上と運用効率の最適化を両立したAIプロンプトシステムを構築しています。