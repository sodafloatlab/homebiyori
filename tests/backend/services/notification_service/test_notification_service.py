"""
Notification Service テスト

通知管理機能のテスト。
"""

import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timedelta

# テスト対象のインポート
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../../backend/services/notification_service'))

from backend.services.notification_service.main import app
from backend.services.notification_service.models.notification_models import (
    UserNotification, NotificationType, NotificationPriority, 
    NotificationStatus, NotificationCreateRequest,
    AdminNotification, NotificationScope, MaintenanceNotificationTemplate
)
from backend.services.notification_service.services.notification_service import NotificationService
from backend.services.notification_service.services.admin_notification_service import AdminNotificationService
from backend.services.notification_service.core.config import NotificationSettings


class TestNotificationService:
    """Notification Service テストクラス"""
    
    @pytest.fixture
    def settings(self):
        """設定フィクスチャ"""
        return NotificationSettings(
            dynamodb_table="test-homebiyori",
            internal_api_key="test_internal_key",
            admin_api_key="test_admin_key"
        )
    
    @pytest.fixture
    def notification_service(self, settings):
        """NotificationServiceフィクスチャ"""
        return NotificationService(settings)
    
    @pytest.fixture
    def admin_service(self, settings):
        """AdminNotificationServiceフィクスチャ"""
        return AdminNotificationService(settings)
    
    @pytest.fixture
    def sample_user_notification(self):
        """サンプルユーザー通知"""
        return UserNotification(
            user_id="user_test123",
            type=NotificationType.SUBSCRIPTION_WELCOME,
            title="サブスクリプションへようこそ",
            message="プレミアムプランにご登録いただき、ありがとうございます。",
            priority=NotificationPriority.HIGH
        )

    @pytest.mark.asyncio
    async def test_create_notification(self, notification_service, settings):
        """通知作成テスト"""
        with patch.object(notification_service.db_client, 'put_item', new_callable=AsyncMock) as mock_put:
            mock_put.return_value = True
            
            # 通知作成
            notification = await notification_service.create_notification(
                user_id="user_test123",
                notification_type=NotificationType.SUBSCRIPTION_WELCOME,
                title="テスト通知",
                message="テストメッセージです。",
                priority=NotificationPriority.NORMAL
            )
            
            # 検証
            assert notification.user_id == "user_test123"
            assert notification.type == NotificationType.SUBSCRIPTION_WELCOME
            assert notification.title == "テスト通知"
            assert notification.status == NotificationStatus.UNREAD
            mock_put.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_user_notifications(self, notification_service):
        """ユーザー通知一覧取得テスト"""
        # モックデータ
        mock_items = [
            {
                "notification_id": "notif_1",
                "user_id": "user_test123",
                "type": "subscription_welcome",
                "title": "通知1",
                "message": "メッセージ1",
                "priority": "normal",
                "status": "unread",
                "metadata": {},
                "created_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(days=30)).isoformat()
            }
        ]
        
        with patch.object(notification_service.db_client, 'query_gsi', new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_items
            
            # 通知一覧取得
            result = await notification_service.get_user_notifications(
                user_id="user_test123",
                unread_only=True
            )
            
            # 検証
            assert len(result.notifications) == 1
            assert result.notifications[0].notification_id == "notif_1"
            assert result.unread_count == 1
            mock_query.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_as_read(self, notification_service):
        """既読処理テスト"""
        # 通知取得のモック
        mock_notification = UserNotification(
            notification_id="notif_test",
            user_id="user_test123",
            type=NotificationType.GENERAL,
            title="テスト",
            message="テスト",
            status=NotificationStatus.UNREAD
        )
        
        with patch.object(notification_service, 'get_notification', new_callable=AsyncMock) as mock_get:
            with patch.object(notification_service.db_client, 'update_item', new_callable=AsyncMock) as mock_update:
                mock_get.return_value = mock_notification
                mock_update.return_value = True
                
                # 既読処理
                result = await notification_service.mark_as_read(
                    "user_test123", 
                    "notif_test"
                )
                
                # 検証
                assert result is True
                mock_get.assert_called_once()
                mock_update.assert_called_once()

    @pytest.mark.asyncio
    async def test_bulk_notification_creation(self, notification_service):
        """一括通知作成テスト"""
        requests = [
            NotificationCreateRequest(
                user_id="user_1",
                type=NotificationType.GENERAL,
                title="一括通知1",
                message="メッセージ1"
            ),
            NotificationCreateRequest(
                user_id="user_2", 
                type=NotificationType.GENERAL,
                title="一括通知2",
                message="メッセージ2"
            )
        ]
        
        with patch.object(notification_service, 'create_notification', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = UserNotification(
                user_id="test",
                type=NotificationType.GENERAL,
                title="test",
                message="test"
            )
            
            # 一括作成
            results = await notification_service.create_bulk_notifications(requests)
            
            # 検証
            assert len(results) == 2
            assert all(result["success"] for result in results)
            assert mock_create.call_count == 2

    @pytest.mark.asyncio
    async def test_notification_stats(self, notification_service):
        """通知統計テスト"""
        mock_items = [
            {
                "status": "unread",
                "priority": "normal",
                "type": "general",
                "expires_at": (datetime.now() + timedelta(days=1)).isoformat()
            },
            {
                "status": "read", 
                "priority": "high",
                "type": "system_maintenance",
                "expires_at": (datetime.now() + timedelta(days=1)).isoformat()
            }
        ]
        
        with patch.object(notification_service.db_client, 'query_by_prefix', new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_items
            
            # 統計取得
            stats = await notification_service.get_user_notification_stats("user_test123")
            
            # 検証  
            assert stats.total_notifications == 2
            assert stats.unread_count == 1
            assert stats.read_count == 1
            assert stats.archived_count == 0


class TestAdminNotificationService:
    """Admin Notification Service テストクラス"""
    
    @pytest.fixture
    def settings(self):
        """設定フィクスチャ"""
        return NotificationSettings(
            dynamodb_table="test-homebiyori",
            internal_api_key="test_internal_key",
            admin_api_key="test_admin_key"
        )
    
    @pytest.fixture
    def admin_service(self, settings):
        """AdminNotificationServiceフィクスチャ"""
        return AdminNotificationService(settings)

    @pytest.mark.asyncio
    async def test_create_admin_notification(self, admin_service):
        """管理者通知作成テスト"""
        with patch.object(admin_service.db_client, 'put_item', new_callable=AsyncMock) as mock_put:
            mock_put.return_value = True
            
            # 管理者通知作成
            notification = await admin_service.create_admin_notification(
                admin_id="admin_test",
                notification_type=NotificationType.SYSTEM_MAINTENANCE,
                title="メンテナンスのお知らせ",
                message="システムメンテナンスを実施します。",
                scope=NotificationScope.ALL_USERS
            )
            
            # 検証
            assert notification.admin_id == "admin_test"
            assert notification.scope == NotificationScope.ALL_USERS
            assert notification.type == NotificationType.SYSTEM_MAINTENANCE
            mock_put.assert_called_once()

    @pytest.mark.asyncio
    async def test_maintenance_notification_template(self, admin_service):
        """メンテナンス通知テンプレートテスト"""
        from homebiyori_common.utils.datetime_utils import get_current_jst
        start_time = get_current_jst() + timedelta(hours=25)  # 25時間後に設定して余裕を持たせる
        end_time = start_time + timedelta(hours=2)
        
        template = MaintenanceNotificationTemplate(
            maintenance_type="定期メンテナンス",
            start_time=start_time,
            end_time=end_time,
            affected_services=["チャット機能", "AI応答機能"],
            notice_period_hours=24
        )
        
        # 通知リクエスト生成
        request = template.generate_notification("admin_test")
        
        # 検証
        assert request.type == NotificationType.SYSTEM_MAINTENANCE
        assert "定期メンテナンス" in request.title
        assert "チャット機能、AI応答機能" in request.message
        assert request.priority == NotificationPriority.HIGH
        assert request.scheduled_at is not None

    @pytest.mark.asyncio
    async def test_send_admin_notification(self, admin_service):
        """管理者通知配信テスト"""
        # モック管理者通知
        mock_admin_notification = {
            "notification_id": "admin_notif_1",
            "type": "system_announcement",
            "title": "重要なお知らせ",
            "message": "システム更新のお知らせです。",
            "priority": "high",
            "scope": "all",
            "admin_id": "admin_test",
            "metadata": {},
            "sent_at": None
        }
        
        # モック対象ユーザー
        mock_users = ["user_1", "user_2", "user_3"]
        
        with patch.object(admin_service.db_client, 'get_item', new_callable=AsyncMock) as mock_get:
            with patch.object(admin_service, '_get_target_users', new_callable=AsyncMock) as mock_get_users:
                with patch.object(admin_service.notification_service, 'create_notification', new_callable=AsyncMock) as mock_create:
                    with patch.object(admin_service.db_client, 'update_item', new_callable=AsyncMock) as mock_update:
                        mock_get.return_value = mock_admin_notification
                        mock_get_users.return_value = mock_users
                        mock_create.return_value = True
                        mock_update.return_value = True
                        
                        # 配信実行
                        result = await admin_service.send_admin_notification("admin_notif_1")
                        
                        # 検証
                        assert result["recipient_count"] == 3
                        assert mock_create.call_count == 3
                        mock_update.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_target_users_all(self, admin_service):
        """全ユーザー取得テスト"""
        mock_users = [
            {"user_id": "user_1"},
            {"user_id": "user_2"},
            {"user_id": "user_3"}
        ]
        
        with patch.object(admin_service.db_client, 'query_by_prefix', new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_users
            
            # 全ユーザー取得
            users = await admin_service._get_target_users(NotificationScope.ALL_USERS)
            
            # 検証
            assert len(users) == 3
            assert users == ["user_1", "user_2", "user_3"]

    @pytest.mark.asyncio
    async def test_get_target_users_plan(self, admin_service):
        """プラン別ユーザー取得テスト"""
        mock_plan_users = [
            {"user_id": "user_premium_1"},
            {"user_id": "user_premium_2"}
        ]
        
        with patch.object(admin_service.db_client, 'query_gsi', new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_plan_users
            
            # プラン別ユーザー取得
            users = await admin_service._get_target_users(
                NotificationScope.PLAN_USERS, 
                "premium"
            )
            
            # 検証
            assert len(users) == 2
            assert users == ["user_premium_1", "user_premium_2"]


class TestNotificationModels:
    """通知モデルテスト"""
    
    def test_user_notification_model(self):
        """ユーザー通知モデルテスト"""
        notification = UserNotification(
            user_id="user_test",
            type=NotificationType.GENERAL,
            title="テスト通知",
            message="テストメッセージ"
        )
        
        assert notification.user_id == "user_test"
        assert notification.status == NotificationStatus.UNREAD
        assert notification.is_unread is True
        assert notification.read_at is None
        
        # 既読処理
        notification.mark_as_read()
        assert notification.status == NotificationStatus.READ
        assert notification.read_at is not None
        assert notification.is_unread is False

    def test_admin_notification_model(self):
        """管理者通知モデルテスト"""
        notification = AdminNotification(
            type=NotificationType.SYSTEM_MAINTENANCE,
            title="メンテナンス",
            message="メンテナンス実施",
            admin_id="admin_test",
            scope=NotificationScope.ALL_USERS
        )
        
        assert notification.admin_id == "admin_test"
        assert notification.scope == NotificationScope.ALL_USERS
        assert notification.is_sent is False
        assert notification.is_scheduled is False
        
        # 配信済みマーク
        notification.mark_as_sent(100)
        assert notification.is_sent is True
        assert notification.recipient_count == 100

    def test_notification_create_request_validation(self):
        """通知作成リクエストバリデーションテスト"""
        # 正常なリクエスト
        request = NotificationCreateRequest(
            user_id="user_test",
            type=NotificationType.GENERAL,
            title="テスト",
            message="テストメッセージ"
        )
        
        assert request.user_id == "user_test"
        assert request.priority == NotificationPriority.NORMAL
        
        # 無効なリクエスト（タイトル長過ぎ）
        with pytest.raises(ValueError):
            NotificationCreateRequest(
                user_id="user_test",
                type=NotificationType.GENERAL,
                title="a" * 101,  # 100文字制限を超過
                message="テスト"
            )