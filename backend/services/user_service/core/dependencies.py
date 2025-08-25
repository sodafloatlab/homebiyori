"""
user-service 依存性注入設定

■設計概要■
FastAPI の依存性注入 (Dependency Injection) を利用して、
データベースクライアントのシングルトンインスタンスを
router と services に提供。

■アーキテクチャ利点■
- 関心の分離: データベース接続とビジネスロジックの分離
- テスタビリティ: モック可能な構造
- リソース効率: Lambda環境でのコネクション再利用
- 型安全性: FastAPI Dependsによる型チェック
"""

from fastapi import Depends
from ..database import UserServiceDatabase, get_user_database


def get_db() -> UserServiceDatabase:
    """
    データベース依存性注入用ファクトリー関数
    
    ■機能概要■
    FastAPI の Depends() で使用するデータベースクライアント取得関数。
    シングルトンパターンにより効率的なリソース管理を実現。
    
    ■使用例■
    ```python
    @router.get("/profile")
    async def get_profile(
        user_id: str,
        db: UserServiceDatabase = Depends(get_db)
    ):
        return await db.get_user_profile(user_id)
    ```
    
    Returns:
        UserServiceDatabase: データベースクライアントインスタンス
    """
    return get_user_database()