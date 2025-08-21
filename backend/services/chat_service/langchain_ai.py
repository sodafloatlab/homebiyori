"""
LangChain統合AI応答生成システム
design_prompt.mdの仕様に基づくプロンプト管理とBedrock統合
"""
import os
import json
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path
import logging

from langchain.chains import ConversationChain
from langchain_core.prompts import PromptTemplate
from langchain_aws import ChatBedrock
from langchain_core.messages import HumanMessage, SystemMessage

from .langchain_memory import (
    HomebiyoriConversationMemory,
    create_conversation_memory
)

logger = logging.getLogger(__name__)

class HomebiyoriAIChain:
    """
    Homebiyori専用AI会話チェーン
    LangChainベースでプロンプトキャッシュと会話メモリを統合
    """
    
    def __init__(self):
        # プロンプトファイルパスを chat_service/prompts に変更（実環境対応）
        # .kiroディレクトリは実環境では参照できないため、chat_service内にコピー済み
        self.prompt_base_path = Path(__file__).parent / "prompts"
        self.prompt_cache = {}
        self.llm_cache = {}
        
        self._load_prompt_templates()
    
    def _load_prompt_templates(self):
        """プロンプトテンプレートをファイルから読み込み"""
        try:
            characters = ["mittyan", "madokasan", "hideji"]
            moods = ["praise", "listen"]
            praise_levels = ["normal", "deep"]
            
            for character in characters:
                for mood in moods:
                    for praise_level in praise_levels:
                        file_name = f"{character}_{mood}_{praise_level}.md"
                        file_path = self.prompt_base_path / file_name
                        
                        if file_path.exists():
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            
                            cache_key = f"{character}_{mood}_{praise_level}"
                            self.prompt_cache[cache_key] = content
                            
                            logger.info(f"Loaded prompt template: {cache_key}")
                        else:
                            logger.warning(f"Prompt template not found: {file_path}")
            
        except Exception as e:
            logger.error(f"Failed to load prompt templates: {e}", exc_info=True)
            raise
    
    def _get_llm(self) -> ChatBedrock:
        """統一LLM取得（Issue #15統一戦略対応版）
        
        【Issue #15統一戦略】
        全ユーザーに統一機能を提供（user_tier概念削除）
        - 旧方針: free/premiumで異なるモデル使用
        - 新方針: 全員統一でプレミアム相当モデル使用
        
        【LangChain統合】
        ChatBedrockインスタンスのキャッシュ管理とParameter Store統合
        """
        if not hasattr(self, '_unified_llm'):
            # Parameter StoreからLLM設定を取得（homebiyori_common Layer）
            from homebiyori_common.utils import get_llm_config
            
            # Issue #15統一戦略：Parameter Store統一設定使用
            config = get_llm_config()  # 統一設定（user_tier概念削除）
            
        # ===== AI応答生成専用LLM設定 =====
        # 【重要】ここではユーザー向け応答生成用の設定を使用
        # ・目的: ユーザーが直接読む褒め応答の生成
        # ・特徴: 自然で親しみやすい応答・適度な創造性・読みやすい長さ
        model_kwargs = {
            "max_tokens": config["max_tokens"],     # ユーザー応答用制限（例: 500トークン）
            "temperature": config["temperature"]    # 自然な応答のための温度設定（例: 0.7）
        }
        
        # 【LangChain Memory要約との使い分け】
        # ・AI応答生成（ここ）: ユーザー向け最終応答（max_tokens=500, temperature=0.7）
        # ・Memory要約（langchain_memory.py）: 内部履歴要約（max_tokens=150, temperature=0.3）
        # ・目的と用途に応じて同じモデルでも異なるパラメータを使用
        
        # LangChain ChatBedrock: Anthropic Claudeモデルの場合のみanthropic_versionを追加
        if "anthropic_version" in config:
            model_kwargs["anthropic_version"] = config["anthropic_version"]
        
        # LangChain ChatBedrock初期化
        self._unified_llm = ChatBedrock(
            model_id=config["model_id"],
            region_name=config["region_name"],
            model_kwargs=model_kwargs
        )
        
        logger.info(
            "Initialized unified LLM for all users (Issue #15 strategy)",
            extra={
                "model_id": config["model_id"],
                "max_tokens": config["max_tokens"],
                "temperature": config["temperature"],
                "strategy": "unified premium-equivalent functionality"
            }
        )
    
        return self._unified_llm
    
    def _build_prompt_template(
        self,
        character: str,
        mood: str,
        praise_level: str = "normal",
        group_context: Optional[List[str]] = None
    ) -> PromptTemplate:
        """LangChainプロンプトテンプレート構築（Issue #15統一戦略対応版）
        
        【Issue #15統一戦略】
        user_tier概念削除、全ユーザー統一機能提供
        - 旧方針: 無料版でpraise_level制限（normalのみ）
        - 新方針: 全員deepレベルまで利用可能
        
        【LangChain統合】
        PromptTemplateインスタンス生成とキャッシュ機能
        """
        # Issue #15統一戦略：全ユーザー統一でpraise_level制限なし
        effective_praise_level = praise_level  # 統一戦略：制限なし
        cache_key = f"{character}_{mood}_{effective_praise_level}"
        
        base_prompt = self.prompt_cache.get(cache_key)
        if not base_prompt:
            logger.warning(f"Prompt template not found for key: {cache_key}")
            base_prompt = self._get_fallback_prompt(character, mood, effective_praise_level)
        
        # グループチャット用の追加指示
        group_instruction = ""
        if group_context and len(group_context) > 1:
            character_names = {
                "mittyan": "みっちゃん",
                "madokasan": "まどかさん", 
                "hideji": "ヒデじい"
            }
            
            other_characters = [char for char in group_context if char != character]
            other_names = [character_names.get(char, char) for char in other_characters]
            
            group_instruction = f"""
=== グループチャット特別指示 ===
現在、あなた（{character_names.get(character, character)}）は{', '.join(other_names)}と一緒にユーザーとお話ししています。
他のキャラクターも同じメッセージに応答するため、あなたらしい独自の視点で応答してください。
重複を避け、{character}らしい個性を活かした応答を心がけてください。
"""
        
        # LangChainプロンプトテンプレート形式に変換
        template = f"""
{base_prompt}

{group_instruction}

=== 会話履歴 ===
{{history}}

=== 現在の入力 ===
ユーザー: {{input}}

=== 応答指示 ===
上記の情報を踏まえ、{character}として適切に応答してください。
"""
        
        return PromptTemplate(
            input_variables=["history", "input"],
            template=template.strip()
        )
    
    def _get_fallback_prompt(self, character: str, mood: str, praise_level: str) -> str:
        """フォールバック用の基本プロンプト"""
        character_names = {
            "mittyan": "みっちゃん",
            "madokasan": "まどかさん", 
            "hideji": "ヒデじい"
        }
        
        mood_text = "褒めて欲しい" if mood == "praise" else "話を聞いて欲しい"
        praise_text = "心から褒めて安心させる" if praise_level == "deep" else "適度にサポートして承認する"
        length_constraint = "50-150文字程度"
        
        return f"""
# AIキャラクター「{character_names.get(character, character)}」
あなたは{character_names.get(character, character)}として、ユーザーの{mood_text}気分に{praise_text}応答をしてください。
{length_constraint}で温かく共感的な応答をしてください。
"""
    
    async def generate_response(
        self,
        user_message: str,
        user_id: str,
        character: str = "mittyan",
        mood: str = "praise",
        praise_level: str = "normal",
        group_context: Optional[List[str]] = None
    ) -> str:
        """
        AI応答生成（LangChainベース）
        
        Args:
            user_message: ユーザーメッセージ
            user_id: ユーザーID
            character: AIキャラクター（mittyan/madokasan/hideji）
            mood: 対話モード（praise/listen）※内部処理用にmoodパラメータ名を保持
            praise_level: 褒めレベル（normal/deep）
            group_context: グループチャット時のアクティブキャラクターリスト（オプション）
            
        Returns:
            生成されたAI応答テキスト
        """
        try:
            # Issue #15統一戦略：user_tier取得処理削除
            
            # 会話メモリ初期化（統一戦略対応）
            memory = create_conversation_memory(
                user_id=user_id,
                character=character
            )
            
            # 統一LLM取得
            llm = self._get_llm()
            
            # プロンプトテンプレート構築（グループコンテキスト対応）
            prompt_template = self._build_prompt_template(
                character=character,
                mood=mood,
                praise_level=praise_level,
                group_context=group_context
            )
            
            # LangChain ConversationChain構築
            # ここで渡される 'memory.memory' (ConversationSummaryBufferMemoryのインスタンス) は、
            # 会話履歴の読み込みと保存を自動的に管理します。
            # 'ainvoke' メソッドが呼び出されると、ConversationChainは内部的にこのメモリから
            # 履歴を取得し、プロンプトテンプレート内の '{history}' プレースホルダーに自動挿入します。
            # そのため、'ainvoke' にはユーザーの現在の入力 ('input') のみを渡せば十分です。
            conversation_chain = ConversationChain(
                llm=llm,
                memory=memory.memory,  # ConversationSummaryBufferMemoryを使用
                prompt=prompt_template,
                verbose=False
            )
            
            # AI応答生成
            response = await conversation_chain.ainvoke({"input": user_message})
            ai_response = response["response"]
            
            # 応答品質検証（統一戦略対応）
            validated_response = self._validate_response_quality(
                ai_response, character
            )
            
            # メモリ統計ログ出力
            memory_stats = memory.get_memory_stats()
            
            logger.info(
                "AI response generated successfully with LangChain",
                extra={
                    "user_id": user_id[:8] + "****",
                    "character": character,
                    "interaction_mode": mood,
                    "group_context": group_context,
                    "response_length": len(validated_response),
                    "memory_stats": memory_stats,
                    "strategy": "unified functionality for all users"
                }
            )
            
            return validated_response
            
        except Exception as e:
            logger.error(
                "Failed to generate AI response with LangChain",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "character": character,
                    "interaction_mode": mood,
                    "group_context": group_context,
                    "strategy": "Issue #15 unified fallback"
                },
                exc_info=True
            )
            # フォールバック応答（統一戦略対応）
            return self._get_fallback_response(character)
    
    def _validate_response_quality(self, response: str, character: str) -> str:
        """AI応答の品質を検証（Issue #15統一戦略対応版）
        
        【Issue #15統一戦略】
        user_tier概念削除、全ユーザー統一品質管理
        - 旧方針: free版は150文字制限、premium版は柔軟
        - 新方針: 全員統一でプレミアム相当品質（柔軟な調整）
        
        【技術判断】
        自作機能：応答品質検証とフォーマット調整
        """
        try:
            # Issue #15統一戦略：全員プレミアム相当の品質管理
            
            if len(response) < 50:
                logger.warning(
                    f"Response potentially too short: {len(response)} chars",
                    extra={
                        "character": character,
                        "strategy": "Issue #15 unified quality standard"
                    }
                )
            elif len(response) > 500:
                logger.warning(
                    f"Response very long: {len(response)} chars",
                    extra={
                        "character": character,
                        "strategy": "Issue #15 unified quality standard"
                    }
                )
            
            logger.debug(
                f"Response quality validated for unified strategy",
                extra={
                    "response_length": len(response),
                    "character": character,
                    "quality_standard": "premium-equivalent for all users"
                }
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to validate response quality: {e}")
            return response
    
    def _get_fallback_response(self, character: str) -> str:
        """エラー時のフォールバック応答（Issue #15統一戦略対応）"""
        fallback_responses = {
            "mittyan": "あらあら〜、ちょっと調子が悪いみたいやわ。もう一度話しかけてくれる？",
            "madokasan": "すみません！システムの調子が悪いようです。もう一度お試しください！",
            "hideji": "おや、ちょっと具合が悪いようじゃな。もう一度話しかけてくれるかの〜"
        }
        
        # Issue #15統一戦略：全員統一でフル応答を返す（文字数制限なし）
        return fallback_responses.get(character, "申し訳ございません。もう一度お試しください。")


# グローバルインスタンス
_ai_chain = None

def get_ai_chain() -> HomebiyoriAIChain:
    """HomebiyoriAIChainのシングルトンインスタンス取得"""
    global _ai_chain
    if _ai_chain is None:
        _ai_chain = HomebiyoriAIChain()
    return _ai_chain


async def generate_ai_response_langchain(
    user_message: str,
    user_id: str,
    character: str = "mittyan",
    interaction_mode: str = "praise",
    praise_level: str = "normal",
    group_context: Optional[List[str]] = None
) -> str:
    """
    LangChainベースAI応答生成（外部API）
    
    Args:
        user_message: ユーザーメッセージ
        user_id: ユーザーID
        character: AIキャラクター（mittyan/madokasan/hideji）
        interaction_mode: 対話モード（praise/listen）
        praise_level: 褒めレベル（normal/deep）
        group_context: グループチャット時のアクティブキャラクターリスト（オプション）
        
    Returns:
        生成されたAI応答テキスト
    """
    ai_chain = get_ai_chain()
    return await ai_chain.generate_response(
        user_message=user_message,
        user_id=user_id,
        character=character,
        mood=interaction_mode,
        praise_level=praise_level,
        group_context=group_context
    )


def detect_emotion_simple(message: str) -> Tuple[Optional[str], float]:
    """
    簡易感情検出関数
    
    Returns:
        tuple: (detected_emotion, emotion_score)
    """
    emotion_keywords = {
        "joy": ["嬉しい", "楽しい", "良かった", "ありがとう", "幸せ"],
        "accomplishment": ["頑張った", "できた", "やった", "成功", "達成"],
        "gratitude": ["ありがとう", "感謝", "助かった", "嬉しい"],
        "relief": ["ほっとした", "安心", "良かった", "助かった"],
        "excitement": ["わくわく", "楽しみ", "興奮", "やった"]
    }
    
    message_lower = message.lower()
    
    for emotion, keywords in emotion_keywords.items():
        if any(keyword in message_lower for keyword in keywords):
            return emotion, 0.8
    
    return None, 0.0