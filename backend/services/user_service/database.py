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

from typing import List, Optional
import os
import uuid

# Lambda Layers からの共通機能インポート
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import DatabaseError, NotFoundError
from homebiyori_common.utils.datetime_utils import get_current_jst as get_current_utc

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
        ユーザープロフィールをDynamoDBに保存。
        新規作成・更新両方に対応。

        Args:
            profile: 保存するプロフィール情報

        Returns:
            UserProfile: 保存後のプロフィール情報

        Raises:
            DatabaseError: DynamoDB保存エラー
            ValidationError: プロフィールデータ不正

        ■データベース操作■
        - updated_at自動更新
        - PK/SK自動設定
        - JSON形式でDynamoDB保存
        """
        try:
            self.logger.debug(
                "Saving user profile",
                extra={
                    "user_id": profile.user_id[:8] + "****",
                    "has_nickname": bool(profile.nickname),
                },
            )

            # updated_at更新
            profile.updated_at = get_current_utc()

            # DynamoDB保存用データ準備
            item_data = profile.model_dump()

            # DynamoDB Keys設定
            item_data["PK"] = f"USER#{profile.user_id}"
            item_data["SK"] = "PROFILE"

            # 日時をISO8601文字列に変換
            item_data["created_at"] = profile.created_at.isoformat()
            item_data["updated_at"] = profile.updated_at.isoformat()

            # DynamoDB保存
            await self.core_client.put_item(item_data)

            self.logger.debug(
                "User profile saved successfully",
                extra={"user_id": profile.user_id[:8] + "****"},
            )

            return profile

        except Exception as e:
            self.logger.error(
                "Failed to save user profile",
                extra={"error": str(e), "user_id": profile.user_id[:8] + "****"},
            )
            raise DatabaseError(f"Failed to save user profile: {str(e)}")

    async def delete_user_profile(self, user_id: str) -> bool:
        """
        ユーザープロフィール削除
        
        ■機能概要■
        - 指定されたユーザーIDのプロフィールをDynamoDBから完全削除
        - アカウント削除プロセスで使用
        - カスケード削除: 関連するすべてのユーザーデータを削除
        
        ■削除対象■
        - PK: USER#{user_id}, SK: PROFILE のアイテム
        
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
            
            # DynamoDB削除操作
            response = await self.core_client.delete_user_profile(user_id)
            
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

    async def get_subscription_status(self, user_id: str) -> dict:
        """
        ユーザーのサブスクリプション状態を取得
        
        ■4テーブル統合対応■
        - 統合テーブル: homebiyori-core (旧subscriptionsテーブル統合)
        - PK: USER#{user_id}, SK: SUBSCRIPTION
        
        Args:
            user_id: ユーザーID
            
        Returns:
            サブスクリプション情報辞書（存在しない場合はNone）
            
        Raises:
            DatabaseError: データベースアクセス時のエラー
        """
        try:
            self.logger.debug(
                "Getting subscription status",
                extra={"user_id": user_id[:8] + "****"}
            )

            # 統合テーブルから取得
            pk = f"USER#{user_id}"
            sk = "SUBSCRIPTION"
            item_data = await self.core_client.get_item(pk, sk)
            
            if not item_data:
                self.logger.debug(
                    "Subscription not found",
                    extra={"user_id": user_id[:8] + "****"}
                )
                return None

            subscription_info = {
                "status": item_data.get("status", "inactive"),
                "current_plan": item_data.get("current_plan"),
                "current_period_end": item_data.get("current_period_end"),
                "cancel_at_period_end": item_data.get("cancel_at_period_end", False),
                "monthly_amount": item_data.get("monthly_amount")
            }
            
            # monthly_amountを数値に変換
            if subscription_info["monthly_amount"]:
                subscription_info["monthly_amount"] = float(subscription_info["monthly_amount"])
            
            self.logger.debug(
                "Subscription status retrieved successfully",
                extra={"user_id": user_id[:8] + "****"}
            )
            
            return subscription_info

        except Exception as e:
            error_msg = f"Failed to get subscription status: {str(e)}"
            self.logger.error(
                error_msg,
                extra={"user_id": user_id[:8] + "****"}
            )
            raise DatabaseError(error_msg)




# =====================================
# グローバルインスタンス
# =====================================

# シングルトンパターンでデータベースクライアント提供
# Lambda環境での効率的なリソース使用
_db_instance: Optional[UserServiceDatabase] = None


def get_database() -> UserServiceDatabase:
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
