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
        """DynamoDBから会話履歴を読み込み（Parameter Store統合版）
        
        【LangChain統合最適化】
        - database.pyのget_chat_history()を使わない理由:
          1. LangChain専用メモリ形式への直接変換が必要
          2. ConversationSummaryBufferMemory用の軽量データ構造
          3. Pydanticモデル変換のオーバーヘッド回避
          4. ChatHistoryRequest/Responseの中間レイヤー削除
        
        【効率化実装（Parameter Store統合版）】
        - PK begins_with統合クエリ: 'USER#{user_id}#' で全chat_type取得
        - Parameter Store制御: DB取得件数をlangchainmemory_db_fetch_limitで制御
        - 直接LangChainメッセージ変換: 中間変換処理削除
        
        【DB取得件数とバッファ件数の分離管理】
        - db_fetch_limit: DynamoDBから取得する会話履歴の最大件数（Parameter Store管理）
          - 用途: ConversationSummaryBufferMemoryの初期化に必要十分なデータを取得
          - 要約処理やコンテキスト構築に必要な過去のデータを含む（例: 100件）
        
        - buffer_messages: 短期記憶として要約せずに保持する直近件数（別途ConversationSummaryBufferMemory制御）
          - 用途: max_messagesパラメータとしてMemoryに渡される
          - 要約時も要約せずにそのまま保持される最新の会話（例: 30件）
        """
        try:
            # Parameter Store統一設定から DB取得制限を取得
            from homebiyori_common.utils import get_llm_config
            unified_config = get_llm_config()
            
            # DB取得件数をParameter Storeから取得（ハードコード削除）
            db_fetch_limit = unified_config["langchainmemory_db_fetch_limit"]  # 例: 100件
            
            # ■ 効率化：PK begins_withで全chat_type統合取得（Parameter Store制御版）
            # database.pyと同様の効率的クエリパターンを直接実装
            
            response = self.table.query(
                # LangChain Memory最適化: 1クエリで全chat_type統合取得
                KeyConditionExpression='begins_with(PK, :pk_prefix) AND begins_with(SK, :sk_prefix)',
                ExpressionAttributeValues={
                    ':pk_prefix': f'USER#{self.user_id}#',  # single/group両方マッチ
                    ':sk_prefix': 'CHAT#'
                },
                ScanIndexForward=False,  # LangChain Memory: 新しいメッセージから取得
                Limit=db_fetch_limit  # Parameter Store制御: DB取得件数制限（ハードコード削除）
            )
            
            # LangChainメッセージ形式に直接変換（中間レイヤー削除）
            items = response.get('Items', [])
            
            # 新しい順で取得済みのため、LangChainに必要な古い順にリバース
            items.reverse()  # ConversationMemory用に古い順に変換
            
            # LangChainメッセージ形式に直接変換
            for item in items:
                # ユーザーメッセージ（LangChain HumanMessage）
                if item.get('user_message'):
                    self._messages.append(HumanMessage(content=item['user_message']))
                
                # AIメッセージ（LangChain AIMessage）
                if item.get('ai_response'):
                    self._messages.append(AIMessage(content=item['ai_response']))
            
            logger.info(
                f"Loaded {len(self._messages)} messages for LangChain Memory with Parameter Store control (user {self.user_id[:8]}****)",
                extra={
                    "optimization": "PK begins_with unified query",
                    "langchain_direct_conversion": True,
                    "items_retrieved": len(items),
                    "messages_converted": len(self._messages),
                    "db_fetch_limit": db_fetch_limit,
                    "parameter_store_control": "langchainmemory_db_fetch_limit",
                    "bypass_database_layer": "efficiency for LangChain integration",
                    "hardcode_elimination": "50件固定 → Parameter Store動的制御"
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to load messages from DynamoDB for LangChain Memory: {e}", exc_info=True)
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
    Issue #15統一戦略：全ユーザー共通設定でConversationSummaryBufferMemoryを統合
    """
    
    def __init__(
        self,
        user_id: str,
        character: str = "mittyan",
        table_name: str = None
    ):
        """Homebiyori専用会話メモリ管理初期化（Issue #15統一戦略）
        
        【統一戦略】
        - user_tier概念削除: 全ユーザー統一機能提供
        - LangChain統合: ConversationSummaryBufferMemory + DynamoDB
        - 統一LLM設定: Parameter Store統一パスから取得
        
        Args:
            user_id: ユーザーID
            character: AIキャラクター
            table_name: DynamoDBテーブル名
        """
        self.user_id = user_id
        self.character = character
        self.table_name = table_name or os.getenv('CHATS_TABLE_NAME')
        
        # Parameter Store統一設定取得（LangChain Memory設定も含む）
        from homebiyori_common.utils import get_llm_config
        
        # Issue #15統一戦略：Parameter Storeから全設定を集約取得
        unified_config = get_llm_config()  # 統一設定（LangChain Memory設定含む）
        
        # ===== LangChain Memory専用設定抽出 =====
        # ConversationSummaryBufferMemoryの動作制御用設定
        self.config = {
            # 要約を開始するトリガーとなる、メモリ全体の最大トークン数。
            # 会話履歴（要約＋バッファ）がこの値を超えると、古いメッセージが要約される。（例: 8000）
            "max_tokens": unified_config["langchainmemory_max_tokens"],

            # 短期記憶として、要約せずにそのまま保持する直近のメッセージ件数。（例: 30件）
            "buffer_messages": unified_config["langchainmemory_buffer_messages"],

            # 会話履歴の自動要約機能を有効にするかどうかのフラグ。
            "summary_enabled": unified_config["summary_enabled"]
        }
        
        # ===== LangChain要約専用LLM設定（Parameter Store統合版） =====
        # 【重要】Parameter Storeから要約用専用設定を取得
        # ・目的: 会話履歴の要約生成（ユーザーには直接表示されない背景処理）
        # ・特徴: 精度重視・コスト最適化・レスポンス速度より品質優先
        model_kwargs = {
            # 生成される要約自体の最大長（トークン数）（例: 150）
            "max_tokens": unified_config["langchainmemory_summary_max_tokens"],
            # 要約の創造性を制御。低いほど、事実に忠実な要約になる。（例: 0.3）
            "temperature": unified_config["langchainmemory_summary_temperature"]
        }
        
        # 【AI応答生成との使い分け（Parameter Store統合版）】
        # ・AI応答生成: Parameter Store統一設定（max_tokens=500, temperature=0.7）
        # ・Memory要約: Parameter Store要約専用設定（max_tokens=150, temperature=0.3）
        # ・全設定がParameter Storeで一元管理され、用途別に最適化
        
        # LangChain ChatBedrock: Anthropic Claudeモデルの場合のみanthropic_versionを追加
        if "anthropic_version" in unified_config:
            model_kwargs["anthropic_version"] = unified_config["anthropic_version"]
        
        # LangChain ChatBedrock初期化
        self.llm = ChatBedrock(
            model_id=unified_config["model_id"],
            region_name=unified_config["region_name"],
            model_kwargs=model_kwargs
        )
        
        # LangChain DynamoDB ChatMessageHistory初期化
        self.chat_history = DynamoDBChatMessageHistory(
            user_id=user_id,
            table_name=self.table_name
        )
        
        # ===== LangChain ConversationSummaryBufferMemory初期化（完全Parameter Store統合版） =====
        # 【修正】buffer_messagesもConversationSummaryBufferMemoryに正しく連携
        # ConversationSummaryBufferMemoryは以下のパラメータをサポート：
        # - max_token_limit: 総トークン数制限（要約トリガー）
        # - max_messages: メッセージ数制限（バッファサイズ制御）
        # - return_messages: メッセージ形式での返却（LangChain統合用）
        
        memory_init_params = {
            "llm": self.llm,
            "chat_memory": self.chat_history,
            "max_token_limit": self.config["max_tokens"],        # Parameter Store: langchainmemory_max_tokens
            "return_messages": True                              # LangChain統合必須設定
        }
        
        # buffer_messages設定をmax_messagesとして連携（Parameter Store統合）
        if self.config["buffer_messages"] > 0:
            memory_init_params["max_messages"] = self.config["buffer_messages"]  # Parameter Store: langchainmemory_buffer_messages
        
        # summary_enabled設定に基づく要約機能制御
        if not self.config["summary_enabled"]:
            # 要約無効時：max_token_limitを非常に大きな値に設定して要約を実質無効化
            memory_init_params["max_token_limit"] = 1000000  # 実質的に要約なし
        
        self.memory = ConversationSummaryBufferMemory(**memory_init_params)
        
        # 初期化完了ログ（Parameter Store統合確認）
        logger.info(
            "LangChain ConversationSummaryBufferMemory initialized with full Parameter Store integration",
            extra={
                "user_id": user_id[:8] + "****",
                "character": character,
                "max_token_limit": memory_init_params["max_token_limit"],
                "max_messages": memory_init_params.get("max_messages", "unlimited"),
                "summary_enabled": self.config["summary_enabled"],
                "parameter_store_integration": "完全統合（max_tokens + buffer_messages + summary_enabled）",
                "langchain_memory_optimization": "双方向制御（トークン数・メッセージ数）"
            }
        )
    
# Issue #15統一戦略：_get_unified_configメソッド削除
# Parameter Store統一設定を使用するため重複機能を削除
    
    def get_conversation_context(self) -> str:
        """会話コンテキスト取得（LangChain Memory統合・要約対応版）
        
        【ConversationSummaryBufferMemoryからの履歴取得形式】
        - 要約がない場合: 直近の会話のリスト [HumanMessage, AIMessage, ...]
        - 要約がある場合: 要約と直近の会話を結合したリスト [SystemMessage(content="要約内容"), HumanMessage, AIMessage, ...]
        
        【要約メッセージの取り扱い】
        SystemMessage: ConversationSummaryBufferMemoryが生成した会話要約
        - content: 過去の会話内容を要約したテキスト
        - 役割: ユーザーとAIの過去のやり取りの文脈情報
        """
        try:
            # LangChain Memory経由でコンテキスト取得
            memory_variables = self.memory.load_memory_variables({})
            
            # 会話履歴の文字列化（要約対応版）
            history = memory_variables.get('history', '')
            
            if isinstance(history, list):
                # メッセージリストの場合は文字列に変換（要約メッセージ対応）
                formatted_history = []
                
                for msg in history:
                    if hasattr(msg, 'content'):
                        # メッセージタイプに応じた役割判定（要約対応）
                        if isinstance(msg, HumanMessage):
                            role = "ユーザー"
                        elif isinstance(msg, AIMessage):
                            role = self.character
                        elif isinstance(msg, SystemMessage):
                            # ConversationSummaryBufferMemoryが生成した要約メッセージ
                            role = "要約"
                        else:
                            # 未知のメッセージタイプの場合のフォールバック
                            role = "システム"
                        
                        formatted_history.append(f"{role}: {msg.content}")
                
                history = "\n".join(formatted_history)
            
            logger.info(
                f"Retrieved conversation context with summary support for user {self.user_id[:8]}****",
                extra={
                    "context_length": len(history),
                    "max_tokens": self.config["max_tokens"],
                    "summary_enabled": self.config["summary_enabled"],
                    "has_summary": "要約:" in history,  # 要約の存在確認
                    "memory_type": "ConversationSummaryBufferMemory"
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
        """メモリ統計情報取得（Issue #15統一戦略対応）"""
        try:
            current_messages = len(self.chat_history.messages)
            context = self.get_conversation_context()
            current_tokens = len(context.split())  # 簡易トークン数計算
            
            return {
                "current_messages": current_messages,
                "estimated_tokens": current_tokens,
                "max_tokens": self.config["max_tokens"],
                "token_usage_rate": min(current_tokens / self.config["max_tokens"], 1.0),
                "summary_enabled": self.config["summary_enabled"],
                "unified_strategy": "Issue #15 - all users get premium functionality"
            }
            
        except Exception as e:
            logger.error(f"Failed to get memory stats: {e}", exc_info=True)
            return {}


def create_conversation_memory(
    user_id: str,
    character: str = "mittyan"
) -> HomebiyoriConversationMemory:
    """
    HomebiyoriConversationMemory インスタンス生成（Issue #15統一戦略対応）
    
    【Issue #15統一戦略】
    全ユーザーに統一機能を提供（user_tier概念削除）
    - 旧方針: free/premiumの差別化
    - 新方針: 全員統一プレミアム相当機能
    
    【LangChain統合】
    ConversationSummaryBufferMemory + DynamoDB最適化
    
    Args:
        user_id: ユーザーID
        character: AIキャラクター（mittyan/madokasan/hideji）
    
    Returns:
        HomebiyoriConversationMemory: 設定済みメモリインスタンス
    """
    try:
        # Issue #15: 全員統一機能でメモリインスタンス生成
        memory = HomebiyoriConversationMemory(
            user_id=user_id,
            character=character
        )
        
        logger.info(
            f"Created conversation memory for user {user_id[:8]}**** (Issue #15 unified strategy)",
            extra={
                "character": character,
                "max_tokens": memory.config["max_tokens"],
                "strategy": "unified premium-equivalent functionality",
                "langchain_integration": "ConversationSummaryBufferMemory + DynamoDB"
            }
        )
        
        return memory
        
    except Exception as e:
        logger.error(f"Failed to create conversation memory: {e}", exc_info=True)
        raise


# Issue #15統一戦略により、get_user_tier_from_db関数は削除
# 全ユーザーが統一機能を受けるため、user_tier概念自体が不要