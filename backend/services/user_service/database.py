"""
user-service データベース操作層

■設計概要■
Homebiyori（ほめびより）のユーザー管理サービスにおける
DynamoDB操作を統一管理。Lambda Layersとの連携により、
高度な機能と保守性を提供。

■アーキテクチャ■
- homebiyori-common-layer: 共通データベース機能活用
- DynamoDB Single Table Design: 効率的なデータモデル
- UTC統一: 全日時情報をUTCで管理
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
import uuid

# Lambda Layers からの共通機能インポート
from homebiyori_common.database import DynamoDBClient
from homebiyori_common.logger import get_logger
from homebiyori_common.exceptions import DatabaseError, NotFoundError

# ローカルモジュール
from .models import (
    UserProfile,
    ChildInfo,
    ChildInfoCreate,
    ChildInfoUpdate,
    get_current_utc,
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
        データベースクライアント初期化

        homebiyori-common-layer の DynamoDBClient を使用し、
        高レベルなデータベース操作機能を活用。
        """
        self.db_client = DynamoDBClient()
        self.logger = logger

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
            item_data = await self.db_client.get_item(pk, sk)

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
            await self.db_client.put_item(item_data)

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

    # =====================================
    # 子供情報管理
    # =====================================

    async def get_user_children(self, user_id: str) -> List[ChildInfo]:
        """
        ユーザーの子供一覧取得

        ■機能概要■
        指定ユーザーに紐づく全ての子供情報を取得。
        年齢順（昇順）でソート済み。

        Args:
            user_id: 親ユーザーのID

        Returns:
            List[ChildInfo]: 子供情報リスト（空リストも含む）

        Raises:
            DatabaseError: DynamoDB操作エラー

        ■データベースアクセス■
        - PK: USER#{user_id}
        - SK: begins_with("CHILD#")
        - Operation: Query
        """
        try:
            self.logger.debug(
                "Fetching user children", extra={"user_id": user_id[:8] + "****"}
            )

            # DynamoDB Query実行
            pk = f"USER#{user_id}"
            sk_prefix = "CHILD#"

            items = await self.db_client.query_by_prefix(pk, sk_prefix)

            # Pydanticモデルに変換
            children = []
            for item_data in items:
                try:
                    child = ChildInfo(**item_data)
                    children.append(child)
                except Exception as e:
                    self.logger.warning(
                        "Failed to parse child data",
                        extra={
                            "error": str(e),
                            "child_id": item_data.get("child_id", "unknown"),
                        },
                    )

            # 生年月日順ソート（古い順）
            children.sort(key=lambda x: x.birth_date)

            self.logger.debug(
                "User children retrieved successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "children_count": len(children),
                },
            )

            return children

        except Exception as e:
            self.logger.error(
                "Failed to get user children",
                extra={"error": str(e), "user_id": user_id[:8] + "****"},
            )
            raise DatabaseError(f"Failed to retrieve children: {str(e)}")

    async def create_child(
        self, user_id: str, child_data: ChildInfoCreate
    ) -> ChildInfo:
        """
        子供情報新規作成

        ■機能概要■
        新しい子供情報を作成し、指定ユーザーに紐づけて保存。
        child_idは自動生成（UUID v4）。

        Args:
            user_id: 親ユーザーのID
            child_data: 作成する子供情報

        Returns:
            ChildInfo: 作成された子供情報

        Raises:
            DatabaseError: DynamoDB保存エラー
            ValidationError: 子供データ不正

        ■セキュリティ■
        - child_id: UUID v4で推測困難
        - 親子関係: user_idで厳密管理
        - プライバシー: 最小限情報のみ保存
        """
        try:
            # child_id自動生成
            child_id = str(uuid.uuid4())

            self.logger.debug(
                "Creating new child",
                extra={
                    "user_id": user_id[:8] + "****",
                    "child_id": child_id,
                    "child_name": child_data.name,
                },
            )

            # ChildInfoオブジェクト作成
            child_info = ChildInfo(
                child_id=child_id,
                name=child_data.name,
                birth_date=child_data.birth_date,
                created_at=get_current_utc(),
                updated_at=get_current_utc(),
            )

            # DynamoDB保存用データ準備
            item_data = child_info.model_dump()

            # DynamoDB Keys設定
            item_data["PK"] = f"USER#{user_id}"
            item_data["SK"] = f"CHILD#{child_id}"

            # 日時をISO8601文字列に変換
            item_data["created_at"] = child_info.created_at.isoformat()
            item_data["updated_at"] = child_info.updated_at.isoformat()
            item_data["birth_date"] = child_info.birth_date.isoformat()

            # DynamoDB保存
            await self.db_client.put_item(item_data)

            self.logger.info(
                "Child created successfully",
                extra={
                    "user_id": user_id[:8] + "****",
                    "child_id": child_id,
                    "child_name": child_data.name,
                },
            )

            return child_info

        except Exception as e:
            self.logger.error(
                "Failed to create child",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "child_name": child_data.name,
                },
            )
            raise DatabaseError(f"Failed to create child: {str(e)}")

    async def get_child(self, user_id: str, child_id: str) -> Optional[ChildInfo]:
        """
        特定の子供情報取得

        ■機能概要■
        指定されたchild_idの子供情報を取得。
        親子関係の認可チェックも含む。

        Args:
            user_id: 親ユーザーのID
            child_id: 取得する子供のID

        Returns:
            ChildInfo: 子供情報、存在しない場合はNone

        Raises:
            DatabaseError: DynamoDB操作エラー

        ■認可制御■
        user_idとchild_idの組み合わせでアクセス制御。
        他のユーザーの子供情報はアクセス不可。
        """
        try:
            self.logger.debug(
                "Fetching child info",
                extra={"user_id": user_id[:8] + "****", "child_id": child_id},
            )

            # DynamoDB Key構築
            pk = f"USER#{user_id}"
            sk = f"CHILD#{child_id}"

            # データ取得
            item_data = await self.db_client.get_item(pk, sk)

            if not item_data:
                self.logger.debug(
                    "Child not found",
                    extra={"user_id": user_id[:8] + "****", "child_id": child_id},
                )
                return None

            # Pydanticモデルに変換
            child_info = ChildInfo(**item_data)

            self.logger.debug(
                "Child info retrieved successfully",
                extra={"user_id": user_id[:8] + "****", "child_id": child_id},
            )

            return child_info

        except Exception as e:
            self.logger.error(
                "Failed to get child",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "child_id": child_id,
                },
            )
            raise DatabaseError(f"Failed to retrieve child: {str(e)}")

    async def update_child(
        self, user_id: str, child_id: str, child_update: ChildInfoUpdate
    ) -> ChildInfo:
        """
        子供情報更新

        ■機能概要■
        既存の子供情報を部分更新。
        更新されるフィールドのみを変更し、他は保持。

        Args:
            user_id: 親ユーザーのID
            child_id: 更新する子供のID
            child_update: 更新データ

        Returns:
            ChildInfo: 更新後の子供情報

        Raises:
            NotFoundError: 子供が存在しない
            DatabaseError: DynamoDB操作エラー
            ValidationError: 更新データ不正

        ■部分更新対応■
        Pydantic .copy(update=...) を使用し、
        指定されたフィールドのみ更新。
        """
        try:
            self.logger.debug(
                "Updating child info",
                extra={
                    "user_id": user_id[:8] + "****",
                    "child_id": child_id,
                    "fields_updated": list(
                        child_update.model_dump(exclude_unset=True).keys()
                    ),
                },
            )

            # 既存データ取得
            existing_child = await self.get_child(user_id, child_id)
            if not existing_child:
                raise NotFoundError("Child not found")

            # 部分更新実行
            update_data = child_update.model_dump(exclude_unset=True)
            update_data["updated_at"] = get_current_utc()

            updated_child = existing_child.copy(update=update_data)

            # DynamoDB保存用データ準備
            item_data = updated_child.model_dump()

            # DynamoDB Keys設定
            item_data["PK"] = f"USER#{user_id}"
            item_data["SK"] = f"CHILD#{child_id}"

            # 日時をISO8601文字列に変換
            item_data["created_at"] = updated_child.created_at.isoformat()
            item_data["updated_at"] = updated_child.updated_at.isoformat()
            item_data["birth_date"] = updated_child.birth_date.isoformat()

            # DynamoDB保存
            await self.db_client.put_item(item_data)

            self.logger.info(
                "Child updated successfully",
                extra={"user_id": user_id[:8] + "****", "child_id": child_id},
            )

            return updated_child

        except NotFoundError:
            raise
        except Exception as e:
            self.logger.error(
                "Failed to update child",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "child_id": child_id,
                },
            )
            raise DatabaseError(f"Failed to update child: {str(e)}")

    async def delete_child(self, user_id: str, child_id: str) -> bool:
        """
        子供情報削除

        ■機能概要■
        指定された子供情報を物理削除。
        親子関係の認可チェック含む。

        Args:
            user_id: 親ユーザーのID
            child_id: 削除する子供のID

        Returns:
            bool: 削除成功時True、対象が存在しない場合False

        Raises:
            DatabaseError: DynamoDB操作エラー

        ■注意事項■
        物理削除のため、関連データ（チャット履歴等）
        からの参照整合性に注意が必要。
        """
        try:
            self.logger.debug(
                "Deleting child",
                extra={"user_id": user_id[:8] + "****", "child_id": child_id},
            )

            # 存在確認
            existing_child = await self.get_child(user_id, child_id)
            if not existing_child:
                self.logger.debug(
                    "Child not found for deletion",
                    extra={"user_id": user_id[:8] + "****", "child_id": child_id},
                )
                return False

            # DynamoDB削除
            pk = f"USER#{user_id}"
            sk = f"CHILD#{child_id}"

            await self.db_client.delete_item(pk, sk)

            self.logger.info(
                "Child deleted successfully",
                extra={"user_id": user_id[:8] + "****", "child_id": child_id},
            )

            return True

        except Exception as e:
            self.logger.error(
                "Failed to delete child",
                extra={
                    "error": str(e),
                    "user_id": user_id[:8] + "****",
                    "child_id": child_id,
                },
            )
            raise DatabaseError(f"Failed to delete child: {str(e)}")


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
