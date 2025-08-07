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
    create_conversation_memory,
    get_user_tier_from_db
)

logger = logging.getLogger(__name__)

class HomebiyoriAIChain:
    """
    Homebiyori専用AI会話チェーン
    LangChainベースでプロンプトキャッシュと会話メモリを統合
    """
    
    def __init__(self):
        self.prompt_base_path = Path(__file__).parent.parent.parent.parent / ".kiro" / "specs" / "homebi-yori" / "prompt"
        self.prompt_cache = {}
        self.llm_cache = {}
        
        self._load_prompt_templates()
    
    def _load_prompt_templates(self):
        """プロンプトテンプレートをファイルから読み込み"""
        try:
            characters = ["tama", "madoka", "hide"]
            moods = ["praise", "listen"]
            response_types = ["normal", "long"]
            
            for character in characters:
                for mood in moods:
                    for response_type in response_types:
                        file_name = f"{character}_{mood}_{response_type}.md"
                        file_path = self.prompt_base_path / file_name
                        
                        if file_path.exists():
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                            
                            cache_key = f"{character}_{mood}_{response_type}"
                            self.prompt_cache[cache_key] = content
                            
                            logger.info(f"Loaded prompt template: {cache_key}")
                        else:
                            logger.warning(f"Prompt template not found: {file_path}")
            
        except Exception as e:
            logger.error(f"Failed to load prompt templates: {e}", exc_info=True)
            raise
    
    def _get_llm(self, user_tier: str) -> ChatBedrock:
        """プラン別LLM取得（キャッシュあり）"""
        if user_tier not in self.llm_cache:
            max_tokens = 200 if user_tier == "free" else 400
            
            self.llm_cache[user_tier] = ChatBedrock(
                model_id="anthropic.claude-3-haiku-20240307-v1:0",
                region_name=os.getenv('AWS_REGION', 'us-east-1'),
                model_kwargs={
                    "max_tokens": max_tokens,
                    "temperature": 0.7,
                    "anthropic_version": "bedrock-2023-05-31"
                }
            )
        
        return self.llm_cache[user_tier]
    
    def _build_prompt_template(
        self,
        character: str,
        mood: str,
        user_tier: str
    ) -> PromptTemplate:
        """プロンプトテンプレート構築"""
        # プロンプト選択（固定部分）
        response_type = "normal" if user_tier == "free" else "long"
        cache_key = f"{character}_{mood}_{response_type}"
        
        base_prompt = self.prompt_cache.get(cache_key)
        if not base_prompt:
            logger.warning(f"Prompt template not found for key: {cache_key}")
            base_prompt = self._get_fallback_prompt(character, mood, response_type)
        
        # LangChainプロンプトテンプレート形式に変換
        # 固定部分（キャッシュ対象）+ 変動部分
        template = f"""
{base_prompt}

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
    
    def _get_fallback_prompt(self, character: str, mood: str, response_type: str) -> str:
        """フォールバック用の基本プロンプト"""
        character_names = {
            "tama": "たまさん",
            "madoka": "まどか姉さん", 
            "hide": "ヒデじい"
        }
        
        mood_text = "褒めて欲しい" if mood == "praise" else "話を聞いて欲しい"
        length_constraint = "50-150文字以内" if response_type == "normal" else "200-400文字程度"
        
        return f"""
# AIキャラクター「{character_names.get(character, character)}」
あなたは{character_names.get(character, character)}として、ユーザーの{mood_text}気分に寄り添って応答してください。
{length_constraint}で温かく共感的な応答をしてください。
"""
    
    async def generate_response(
        self,
        user_message: str,
        user_id: str,
        character: str = "tama",
        mood: str = "praise"
    ) -> str:
        """
        AI応答生成（LangChainベース）
        
        Args:
            user_message: ユーザーメッセージ
            user_id: ユーザーID
            character: AIキャラクター（tama/madoka/hide）
            mood: ムード（praise/listen）
            
        Returns:
            生成されたAI応答テキスト
        """
        try:
            # ユーザープラン取得
            user_tier = await get_user_tier_from_db(user_id)
            
            # 会話メモリ初期化
            memory = create_conversation_memory(
                user_id=user_id,
                user_tier=user_tier,
                character=character
            )
            
            # LLM取得
            llm = self._get_llm(user_tier)
            
            # プロンプトテンプレート構築
            prompt_template = self._build_prompt_template(
                character=character,
                mood=mood,
                user_tier=user_tier
            )
            
            # LangChain ConversationChain構築
            conversation_chain = ConversationChain(
                llm=llm,
                memory=memory.memory,  # ConversationSummaryBufferMemory使用
                prompt=prompt_template,
                verbose=False
            )
            
            # AI応答生成
            response = await conversation_chain.ainvoke({"input": user_message})
            ai_response = response["response"]
            
            # 応答品質検証
            validated_response = self._validate_response_quality(
                ai_response, user_tier, character
            )
            
            # メモリ統計ログ出力
            memory_stats = memory.get_memory_stats()
            
            logger.info(
                "AI response generated successfully with LangChain",
                extra={
                    "user_id": user_id[:8] + "****",
                    "character": character,
                    "mood": mood,
                    "user_tier": user_tier,
                    "response_length": len(validated_response),
                    "memory_stats": memory_stats
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
                    "mood": mood
                },
                exc_info=True
            )
            # フォールバック応答
            return self._get_fallback_response(user_tier, character)
    
    def _validate_response_quality(self, response: str, user_tier: str, character: str) -> str:
        """AI応答の品質を検証し、必要に応じて調整"""
        try:
            if user_tier == "free":
                # 無料版：厳格な文字数制限
                if len(response) > 150:
                    # 150文字で切り詰め
                    truncated = response[:147] + "..."
                    logger.info(f"Response truncated for free tier: {len(response)} -> {len(truncated)} chars")
                    return truncated
            else:
                # プレミアム版：柔軟な調整
                if len(response) < 50:
                    logger.warning(f"Response too short for premium tier: {len(response)} chars")
                elif len(response) > 500:
                    logger.warning(f"Response very long for premium tier: {len(response)} chars")
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to validate response quality: {e}")
            return response
    
    def _get_fallback_response(self, user_tier: str, character: str) -> str:
        """エラー時のフォールバック応答"""
        fallback_responses = {
            "tama": "あらあら〜、ちょっと調子が悪いみたいやわ。もう一度話しかけてくれる？",
            "madoka": "すみません！システムの調子が悪いようです。もう一度お試しください！",
            "hide": "おや、ちょっと具合が悪いようじゃな。もう一度話しかけてくれるかの〜"
        }
        
        base_response = fallback_responses.get(character, "申し訳ございません。もう一度お試しください。")
        
        if user_tier == "free" and len(base_response) > 150:
            return base_response[:147] + "..."
        
        return base_response


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
    character: str = "tama",
    mood: str = "praise"
) -> str:
    """
    LangChainベースAI応答生成（外部API）
    
    Args:
        user_message: ユーザーメッセージ
        user_id: ユーザーID
        character: AIキャラクター（tama/madoka/hide）
        mood: ムード（praise/listen）
        
    Returns:
        生成されたAI応答テキスト
    """
    ai_chain = get_ai_chain()
    return await ai_chain.generate_response(
        user_message=user_message,
        user_id=user_id,
        character=character,
        mood=mood
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