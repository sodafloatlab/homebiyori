"""
LangChain Memory システム - DynamoDB統合
ConversationSummaryBufferMemoryを使用したプラン別容量制御
"""
import os
import json
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
import logging

import boto3
from langchain.memory import ConversationSummaryBufferMemory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_aws import ChatBedrock

logger = logging.getLogger(__name__)

class DynamoDBChatMessageHistory(BaseChatMessageHistory):
    """
    DynamoDB統合ChatMessageHistory
    LangChainのMemoryシステムとDynamoDBを連携
    """
    
    def __init__(
        self,
        user_id: str,
        table_name: str,
        region_name: str = None
    ):
        self.user_id = user_id
        self.table_name = table_name
        self.region_name = region_name or os.getenv('AWS_DEFAULT_REGION', 'ap-northeast-1')
        
        self.dynamodb = boto3.resource('dynamodb', region_name=self.region_name)
        self.table = self.dynamodb.Table(table_name)
        
        self._messages: List[BaseMessage] = []
        self._load_messages()
    
    def _load_messages(self):
        """DynamoDBから会話履歴を読み込み"""
        try:
            response = self.table.query(
                KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues={
                    ':pk': f'USER#{self.user_id}',
                    ':sk': 'CHAT#'
                },
                ScanIndexForward=True,  # 時系列順（古い順）
                Limit=50  # 直近50件
            )
            
            items = response.get('Items', [])
            
            for item in items:
                # ユーザーメッセージ
                if item.get('user_message'):
                    self._messages.append(HumanMessage(content=item['user_message']))
                
                # AIメッセージ
                if item.get('ai_response'):
                    self._messages.append(AIMessage(content=item['ai_response']))
            
            logger.info(f"Loaded {len(self._messages)} messages for user {self.user_id[:8]}****")
            
        except Exception as e:
            logger.error(f"Failed to load messages from DynamoDB: {e}", exc_info=True)
            self._messages = []
    
    @property
    def messages(self) -> List[BaseMessage]:
        """メッセージ履歴取得"""
        return self._messages
    
    def add_message(self, message: BaseMessage) -> None:
        """メッセージ追加（メモリのみ、DynamoDBには別途保存）"""
        self._messages.append(message)
    
    def clear(self) -> None:
        """メッセージ履歴クリア"""
        self._messages.clear()


class HomebiyoriConversationMemory:
    """
    Homebiyori専用会話メモリ管理
    プラン別容量制御とConversationSummaryBufferMemoryを統合
    """
    
    def __init__(
        self,
        user_id: str,
        user_tier: str = "free",
        character: str = "mittyan",
        table_name: str = None
    ):
        self.user_id = user_id
        self.user_tier = user_tier
        self.character = character
        self.table_name = table_name or os.getenv('CHATS_TABLE_NAME')
        
        # プラン別設定
        self.config = self._get_plan_config()
        
        # 要約用LLM初期化（Parameter Store統合）
        from homebiyori_common.utils import get_llm_config
        
        # 要約用は無料プランのモデルを使用（コスト最適化）
        summary_config = get_llm_config("free")
        
        # Amazon Nova Lite vs Anthropic Claude用の設定分岐
        model_kwargs = {
            "max_tokens": 150,  # 要約用のため短め
            "temperature": 0.3  # 要約精度重視
        }
        
        # Anthropic Claudeモデルの場合のみanthropic_versionを追加
        if "anthropic_version" in summary_config:
            model_kwargs["anthropic_version"] = summary_config["anthropic_version"]
        
        self.llm = ChatBedrock(
            model_id=summary_config["model_id"],
            region_name=summary_config["region_name"],
            model_kwargs=model_kwargs
        )
        
        # DynamoDB ChatMessageHistory初期化
        self.chat_history = DynamoDBChatMessageHistory(
            user_id=user_id,
            table_name=self.table_name
        )
        
        # ConversationSummaryBufferMemory初期化
        self.memory = ConversationSummaryBufferMemory(
            llm=self.llm,
            chat_memory=self.chat_history,
            max_token_limit=self.config["max_tokens"],
            return_messages=True
        )
    
    def _get_plan_config(self) -> Dict[str, Any]:
        """プラン別設定取得"""
        configs = {
            "free": {
                "max_tokens": 2000,      # 無料版：2,000トークン上限
                "buffer_messages": 10,   # 直近10件保持
                "summary_enabled": True
            },
            "premium": {
                "max_tokens": 8000,      # プレミアム版：8,000トークン上限  
                "buffer_messages": 30,   # 直近30件保持
                "summary_enabled": True
            }
        }
        
        return configs.get(self.user_tier, configs["free"])
    
    def get_conversation_context(self) -> str:
        """会話コンテキスト取得（LangChainのMemoryを使用）"""
        try:
            # Memory経由でコンテキスト取得
            memory_variables = self.memory.load_memory_variables({})
            
            # 会話履歴の文字列化
            history = memory_variables.get('history', '')
            
            if isinstance(history, list):
                # メッセージリストの場合は文字列に変換
                formatted_history = []
                for msg in history:
                    if hasattr(msg, 'content'):
                        role = "ユーザー" if isinstance(msg, HumanMessage) else self.character
                        formatted_history.append(f"{role}: {msg.content}")
                history = "\n".join(formatted_history)
            
            logger.info(
                f"Retrieved conversation context for user {self.user_id[:8]}****",
                extra={
                    "context_length": len(history),
                    "user_tier": self.user_tier,
                    "max_tokens": self.config["max_tokens"]
                }
            )
            
            return history
            
        except Exception as e:
            logger.error(f"Failed to get conversation context: {e}", exc_info=True)
            return ""
    
    def add_user_message(self, message: str) -> None:
        """ユーザーメッセージ追加"""
        try:
            self.memory.save_context(
                {"input": message}, 
                {"output": ""}  # AI応答はまだなので空
            )
        except Exception as e:
            logger.error(f"Failed to add user message: {e}", exc_info=True)
    
    def add_ai_response(self, response: str) -> None:
        """AI応答追加"""
        try:
            # 最後のメッセージペアを更新
            if self.chat_history.messages:
                # 新しいAIメッセージを追加
                self.chat_history.add_message(AIMessage(content=response))
        except Exception as e:
            logger.error(f"Failed to add AI response: {e}", exc_info=True)
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """メモリ統計情報取得"""
        try:
            current_messages = len(self.chat_history.messages)
            context = self.get_conversation_context()
            current_tokens = len(context.split())  # 簡易トークン数計算
            
            return {
                "user_tier": self.user_tier,
                "current_messages": current_messages,
                "estimated_tokens": current_tokens,
                "max_tokens": self.config["max_tokens"],
                "token_usage_rate": min(current_tokens / self.config["max_tokens"], 1.0),
                "summary_enabled": self.config["summary_enabled"]
            }
            
        except Exception as e:
            logger.error(f"Failed to get memory stats: {e}", exc_info=True)
            return {}


def create_conversation_memory(
    user_id: str,
    user_tier: str = "free",
    character: str = "mittyan"
) -> HomebiyoriConversationMemory:
    """
    HomebiyoriConversationMemory インスタンス生成
    
    Args:
        user_id: ユーザーID
        user_tier: ユーザープラン（free/premium）
        character: AIキャラクター（mittyan/madokasan/hideji）
    
    Returns:
        HomebiyoriConversationMemory: 設定済みメモリインスタンス
    """
    try:
        memory = HomebiyoriConversationMemory(
            user_id=user_id,
            user_tier=user_tier,
            character=character
        )
        
        logger.info(
            f"Created conversation memory for user {user_id[:8]}****",
            extra={
                "user_tier": user_tier,
                "character": character,
                "max_tokens": memory.config["max_tokens"]
            }
        )
        
        return memory
        
    except Exception as e:
        logger.error(f"Failed to create conversation memory: {e}", exc_info=True)
        raise


async def get_user_tier_from_db(user_id: str) -> str:
    """ユーザーのプランティアをDynamoDBから取得"""
    try:
        dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_DEFAULT_REGION', 'ap-northeast-1'))
        table_name = os.getenv('CORE_TABLE_NAME')
        table = dynamodb.Table(table_name)
        
        response = table.get_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': 'SUBSCRIPTION'
            }
        )
        
        if 'Item' in response:
            current_plan = response['Item'].get('current_plan', 'free')
            status = response['Item'].get('status', 'inactive')
            
            if status == 'active' and current_plan in ['monthly', 'yearly']:
                return 'premium'
        
        return 'free'
        
    except Exception as e:
        logger.error(f"Failed to get user tier: {e}")
        return 'free'  # デフォルトは無料版