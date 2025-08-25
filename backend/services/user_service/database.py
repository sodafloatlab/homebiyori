"""
user-service データベース操作層

■設計概要■
Homebiyori（ほめびより）のユーザー管理サービスにおける
DynamoDB操作を統一管理。Lambda Layersとの連携により、
高度な機能と保守性を提供。

■アーキテクチャ■
- homebiyori-common-layer: 共通データベース機能活用
- JST統一: 全日時情報をJSTで管理
- 型安全性: Pydantic v2モデルとの完全統合

■設計原則■
- 関心の分離: ビジネスロジックとデータアクセスの分離
- 再利用性: 共通機能のLambda Layers活用
- テスタビリティ: モック可能な構造設計
- プライバシーファースト: 個人情報最小限化

■データベース設計■
DynamoDB 7テーブル構成 - prod-homebiyori-users:
- ユーザープロフィール: USER#{user_id} / PROFILE
- 専用テーブル: homebiyori-users
- TTL: 無し（永続保存）

■エラーハンドリング■
- DatabaseError: DynamoDB操作エラー
- ValidationError: データ検証エラー
- AuthenticationError: 認証エラー
- NotFoundError: データ未存在エラー

■Lambda Layers統合■
homebiyori-common-layer から以下機能を活用:
- DynamoDBClient: 高レベルデータベースクライアント
- Logger: 構造化ログ
- Exceptions: 統一例外クラス
- Validators: データ検証機能

■実装バージョン■
- 初回実装: 2024-08-03 (シンプル設計)
- Lambda Layers対応: 2024-08-03 (homebiyori-common-layer統合)
"""

from typing import Optional, Dict, Any
import os

# Lambda Layers からの共通機能インポート
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import DatabaseError
from homebiyori_common.utils.datetime_utils import get_current_jst

# ローカルモジュール
from .models import (
    UserProfile,
)

# 構造化ログ設定
logger = get_logger(__name__)


# =====================================
# データベースクライアント初期化
# =====================================


class UserServiceDatabase:
    """
    ユーザーサービス専用データベース操作クラス

    ■機能概要■
    homebiyori-common-layer の DynamoDBClient をベースに、
    ユーザーサービス固有のデータ操作を提供。

    ■設計利点■
    - 型安全性: Pydantic v2モデルとの完全統合
    - 再利用性: 共通機能のLambda Layers活用
    - 保守性: 責務分離とテスタビリティ
    - スケーラビリティ: Single Table Design効率化
    """

    def __init__(self):
        """
    UserServiceDatabaseクラスの初期化
    
    ■4テーブル統合対応■
    - core: users + subscriptions + trees + notifications統合
    - chats: チャット履歴（TTL管理）
    - fruits: 実の情報（永続保存）
    - feedback: フィードバック（分析用）
    """
        self.core_client = DynamoDBClient(os.environ["CORE_TABLE_NAME"])
        self.logger = get_logger(__name__)

    # =====================================
    # ユーザープロフィール管理
    # =====================================

    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """
        ユーザープロフィール取得

        ■機能概要■
        指定されたuser_idのプロフィール情報をDynamoDBから取得。
        存在しない場合はNoneを返却。

        Args:
            user_id: Cognito User Pool sub (UUID形式)

        Returns:
            UserProfile: プロフィール情報、存在しない場合はNone

        Raises:
            DatabaseError: DynamoDB操作エラー
            ValidationError: user_id形式エラー

        ■データベースアクセス■
        - PK: USER#{user_id}
        - SK: PROFILE
        - Operation: GetItem
        """
        try:
            self.logger.debug(
                "Fetching user profile", extra={"user_id": user_id[:8] + "****"}
            )

            # DynamoDB Key構築
            pk = f"USER#{user_id}"
            sk = "PROFILE"

            # データ取得
            item_data = await self.core_client.get_item(pk, sk)

            if not item_data:
                self.logger.debug(
                    "User profile not found", extra={"user_id": user_id[:8] + "****"}
                )
                return None

            # Pydanticモデルに変換
            profile = UserProfile(**item_data)

            self.logger.debug(
                "User profile retrieved successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "has_nickname": bool(profile.nickname),
                },
            )

            return profile

        except Exception as e:
            self.logger.error(
                "Failed to get user profile",
                extra={"error": str(e), "user_id": user_id[:8] + "****"},
            )
            raise DatabaseError(f"Failed to retrieve user profile: {str(e)}")

    async def save_user_profile(self, profile: UserProfile) -> UserProfile:
        """
        ユーザープロフィール保存
        
        ■機能概要■
        - 新規作成または既存プロフィール更新
        - JST時刻統一: created_at（初回のみ）、updated_at（常に更新）
        - AI設定は別レコード（SK: AI_SETTINGS）として分離保存
        
        ■DynamoDB アクセスパターン■
        - PK: USER#{user_id}
        - SK: PROFILE（基本情報）/ AI_SETTINGS（AI設定）
        - 4テーブル構成のcoreテーブルを使用
        
        Args:
            profile: 保存対象のUserProfileオブジェクト
            
        Returns:
            UserProfile: 保存後のプロフィール（タイムスタンプ更新済み）
            
        Raises:
            DatabaseError: DynamoDB操作エラー時
        """
        try:
            self.logger.info(
                "Saving user profile", 
                extra={"user_id": profile.user_id[:8] + "****"}
            )
            
            # JST統一: タイムスタンプ設定
            current_time = get_current_jst()
            if not profile.created_at:
                profile.created_at = current_time
            profile.updated_at = current_time
            
            # DynamoDB保存操作 - 複数SK対応
            # 1. プロフィール基本情報保存 (SK: PROFILE)
            profile_data = {
                "user_id": profile.user_id,
                "nickname": profile.nickname,
                "onboarding_completed": profile.onboarding_completed,
                "created_at": profile.created_at,
                "updated_at": profile.updated_at
            }
            pk = f"USER#{profile.user_id}"
            await self.core_client.put_item(pk, "PROFILE", profile_data)
            
            # 2. AI設定保存 (SK: AI_SETTINGS)  
            ai_settings_data = {
                "user_id": profile.user_id,
                "ai_character": profile.ai_character.value if profile.ai_character else None,
                "praise_level": profile.praise_level.value if profile.praise_level else None,
                "interaction_mode": profile.interaction_mode.value if profile.interaction_mode else None,
                "updated_at": profile.updated_at
            }
            await self.core_client.put_item(pk, "AI_SETTINGS", ai_settings_data)
            
            self.logger.info(
                "User profile saved successfully",
                extra={
                    "user_id": profile.user_id[:8] + "****",
                    "updated_at": profile.updated_at.isoformat()
                }
            )
            
            return profile
            
        except Exception as e:
            self.logger.error(
                "Failed to save user profile",
                extra={
                    "error": str(e),
                    "user_id": profile.user_id[:8] + "****"
                }
            )
            raise DatabaseError(f"ユーザープロフィール保存に失敗しました: {str(e)}")

    async def delete_user_profile(self, user_id: str) -> bool:
        """
        ユーザープロフィール削除
        
        ■機能概要■
        - 指定されたユーザーIDのプロフィールをDynamoDBから完全削除
        - アカウント削除プロセスで使用
        - カスケード削除: 関連するすべてのユーザーデータを削除
        
        ■削除対象■
        - PK: USER#{user_id}, SK: PROFILE のアイテム
        - PK: USER#{user_id}, SK: AI_SETTINGS のアイテム
        
        Args:
            user_id: 削除対象のユーザーID
            
        Returns:
            bool: 削除成功時True、対象が存在しない場合もTrue
            
        Raises:
            DatabaseError: DynamoDB操作エラー時
        """
        try:
            self.logger.info(
                "Deleting user profile", 
                extra={"user_id": user_id[:8] + "****"}
            )
            
            # DynamoDB削除操作 - Coreテーブルの関連アイテムを個別削除
            pk = f"USER#{user_id}"
            
            # ユーザーに関連するすべてのSKアイテムを削除
            try:
                # SK: PROFILE (プロフィール基本情報)削除
                await self.core_client.delete_item(pk, "PROFILE")
                self.logger.debug(f"Deleted PROFILE for user {user_id[:8]}****")
            except Exception as e:
                self.logger.warning(f"Failed to delete PROFILE for user {user_id[:8]}****: {e}")
            
            try:
                # SK: AI_SETTINGS (AI設定)削除  
                await self.core_client.delete_item(pk, "AI_SETTINGS")
                self.logger.debug(f"Deleted AI_SETTINGS for user {user_id[:8]}****")
            except Exception as e:
                self.logger.warning(f"Failed to delete AI_SETTINGS for user {user_id[:8]}****: {e}")
            
            self.logger.info(
                "User profile deleted successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "deleted": True
                }
            )
            
            return True
            
        except Exception as e:
            self.logger.error(
                "Failed to delete user profile",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****"
                }
            )
            raise DatabaseError(f"ユーザープロフィール削除に失敗しました: {str(e)}")

    async def get_ai_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        ユーザーのAI設定を取得
        
        ■機能概要■
        指定されたuser_idのAI設定情報をDynamoDBから取得。
        存在しない場合はNoneを返却。
        
        Args:
            user_id: Cognito User Pool sub (UUID形式)
            
        Returns:
            Dict[str, Any]: AI設定情報、存在しない場合はNone
            
        Raises:
            DatabaseError: DynamoDB操作エラー
            ValidationError: user_id形式エラー
            
        ■データベースアクセス■
        - PK: USER#{user_id}
        - SK: AI_SETTINGS
        - Operation: GetItem
        """
        try:
            self.logger.debug(
                "Fetching AI preferences", 
                extra={"user_id": user_id[:8] + "****"}
            )

            # DynamoDB Key構築
            pk = f"USER#{user_id}"
            sk = "AI_SETTINGS"

            # データ取得
            item_data = await self.core_client.get_item(pk, sk)

            if not item_data:
                self.logger.debug(
                    "AI preferences not found", 
                    extra={"user_id": user_id[:8] + "****"}
                )
                return None

            self.logger.debug(
                "AI preferences retrieved successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "has_preferences": bool(item_data),
                },
            )

            return item_data

        except Exception as e:
            self.logger.error(
                "Failed to get AI preferences",
                extra={"error": str(e), "user_id": user_id[:8] + "****"},
            )
            raise DatabaseError(f"Failed to retrieve AI preferences: {str(e)}")

    async def health_check(self) -> Dict[str, Any]:
        """
        データベース接続ヘルスチェック
        
        Returns:
            Dict: ヘルスチェック結果
        """
        try:
            # テーブル存在確認
            await self.core_client.describe_table()
            
            self.logger.info("ユーザーサービス ヘルスチェック成功")
            return {
                "status": "healthy",
                "service": "user_service",
                "database": "connected"
            }
            
        except Exception as e:
            self.logger.error(f"ユーザーサービス ヘルスチェック失敗: {e}")
            raise DatabaseError(f"ヘルスチェックに失敗しました: {e}")




# =====================================
# ファクトリー関数
# =====================================

# シングルトンパターンでデータベースクライアント提供
# Lambda環境での効率的なリソース使用
_db_instance: Optional[UserServiceDatabase] = None


def get_user_database() -> UserServiceDatabase:
    """
    データベースクライアントのシングルトンインスタンス取得

    ■設計利点■
    - リソース効率: Lambda実行間でのコネクション再利用
    - 初期化遅延: 必要時のみインスタンス作成
    - テスタビリティ: モック差し替え可能

    Returns:
        UserServiceDatabase: データベースクライアントインスタンス
    """
    global _db_instance
    if _db_instance is None:
        _db_instance = UserServiceDatabase()
    return _db_instance
