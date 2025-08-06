# AI プロンプト設計書

## 概要

この文書は、HomebiYori（ほめびより）のAIキャラクター応答システムのプロンプト設計と実装詳細を定義します。Amazon Bedrock Claude Haikuを使用した高品質なAI応答システムの技術仕様です。

### 設計原則
- **プロンプトキャッシュ最適化**: コスト効率とレスポンス時間の両立
- **キャラクター一貫性**: 3つのAIペルソナの口調・個性の維持
- **プラン差別化**: 無料版とプレミアム版の適切な機能差別化
- **品質保証**: 応答品質の自動検証とフォールバック機能

## AIキャラクター プロンプト仕様

### キャラクター定義
> 詳細なキャラクター設定は `design_ai.md` を参照してください。

### プロンプト応答パターン
- **2つの気分**: 褒めて欲しい / 話を聞いて欲しい
- **2つの応答レベル**: 通常（無料版）/ 詳細（プレミアム版）
- **合計**: 3キャラ × 2気分 × 2レベル = **12プロンプトパターン**

## プロンプトアーキテクチャ

### 基本構造設計

```
[固定部分 - プロンプトキャッシュ対象]
├── システム指示・実行条件
├── キャラクター設定・人格
├── 口調テンプレート
├── 応答構成パターン
└── 制約事項・安全ガイドライン

[変動部分 - 毎回更新]
├── 会話履歴（構造化XML）
├── ユーザー状況・コンテキスト
├── 現在の入力内容
└── 応答指示
```

### プロンプトキャッシュ最適化

#### キャッシュ対象（固定部分）
- **サイズ**: 約2,500トークン
- **更新頻度**: 月1回程度
- **キャッシュ条件**: 1024トークン以上の前半部分が完全一致

#### 変動部分
- **サイズ**: 約500-1,000トークン
- **内容**: 会話履歴、ユーザー入力、動的指示

#### パフォーマンス目標
- **キャッシュヒット率**: 95%以上
- **応答時間**: キャッシュ利用時0.8秒、ミス時2-3秒
- **コスト削減**: 固定部分の70%削減効果

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

## 会話管理システム

### 会話履歴の構造化

```xml
<conversation_history>
<turn timestamp="2025-08-03T10:30:00">
<user>今日は子どもが熱を出して看病で一日終わった</user>
<assistant character="たまさん" length="long" mood="empathetic">
あらあら〜、お疲れさまやわ〜...
</assistant>
</turn>
<turn timestamp="2025-08-03T11:45:00">
<user>ありがとう、少し元気出た</user>
<assistant character="たまさん" length="short" mood="gentle">
そうそう、それでええのよ〜
</assistant>
</turn>
</conversation_history>
```

### コンテキスト管理

```xml
<user_context>
<current_mood>褒めて欲しい気分</current_mood>
<response_preference>長い返答</response_preference>
<last_interaction_time>2025-08-03T11:45:00</last_interaction_time>
<conversation_flow>継続中</conversation_flow>
<topic_context>育児・看病</topic_context>
<user_tier>premium</user_tier>
</user_context>
```

### 履歴効率管理

```python
class ConversationManager:
    def __init__(self, max_turns=10, max_tokens=800):
        self.max_turns = max_turns
        self.max_tokens = max_tokens
    
    def get_optimized_history(self, conversation_history):
        # 1. 直近の重要な会話を抽出
        recent_important = self._extract_recent_important(conversation_history)
        
        # 2. 古い会話は要約して含める
        summarized_old = self._summarize_older_conversations(conversation_history)
        
        # 3. トークン数制限内に収める
        return self._fit_within_token_limit(recent_important + summarized_old)
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

## Lambda実装アーキテクチャ

### メイン処理フロー

```python
class ChatHandler:
    def __init__(self):
        self.anthropic = Anthropic()
        self.prompt_cache = PromptCacheManager()
        self.conversation_manager = ConversationManager()
    
    def lambda_handler(self, event, context):
        try:
            # 1. リクエスト解析
            request_data = self._parse_request(event)
            
            # 2. ユーザー認証・プラン確認
            user_info = self._validate_user(request_data['user_id'])
            
            # 3. 入力検証
            validated_input = self._validate_input(
                request_data['message'], 
                user_info['tier']
            )
            
            # 4. 会話履歴取得・最適化
            conversation_history = self._get_optimized_history(
                request_data['conversation_id']
            )
            
            # 5. プロンプト構築
            final_prompt = self._build_prompt(
                character=request_data['character'],
                mood=request_data['mood'],
                user_tier=user_info['tier'],
                user_input=validated_input,
                conversation_history=conversation_history
            )
            
            # 6. Claude API呼び出し
            response = self._call_claude_api(final_prompt, user_info['tier'])
            
            # 7. 応答品質検証
            validated_response = self._validate_response(
                response, user_info['tier']
            )
            
            # 8. 会話履歴保存
            self._save_conversation_turn(
                request_data['conversation_id'],
                validated_input,
                validated_response
            )
            
            return self._format_success_response(validated_response)
            
        except Exception as e:
            return self._handle_error(e)
```

### プロンプト構築システム

```python
class PromptBuilder:
    def __init__(self):
        self.cached_prompts = self._load_cached_prompts()
    
    def build_final_prompt(self, character, mood, user_tier, user_input, history):
        # 1. 基本プロンプト選択
        response_type = "normal" if user_tier == "free" else "flexible"
        base_prompt = self.cached_prompts[character][mood][response_type]
        
        # 2. 動的部分構築
        dynamic_section = f"""
        
<conversation_history>
{self._format_conversation_history(history)}
</conversation_history>

<user_context>
<current_mood>{mood}</current_mood>
<user_tier>{user_tier}</user_tier>
<timestamp>{datetime.now().isoformat()}</timestamp>
</user_context>

<current_input>
<message>{user_input}</message>
<length>{len(user_input)}</length>
<estimated_urgency>{self._assess_urgency(user_input)}</estimated_urgency>
</current_input>

<response_instructions>
上記の情報を踏まえ、{character}として適切に応答してください。
</response_instructions>
"""
        
        return base_prompt + dynamic_section
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
