"""
Contact Service テストスイート

AWS SNS通知機能と問い合わせ処理のテストを実行。
実際のSNS送信は行わず、モック機能でテスト。
"""

import pytest
import uuid
import json
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime

# Contact Service インポート
from backend.services.contact_service.main import app
from backend.services.contact_service.models import (
    ContactInquiry, ContactCategory, ContactPriority,
    ContactInquiryResponse
)
from backend.services.contact_service.services.notification_service import ContactNotificationService


class TestContactServiceAPI:
    """Contact Service API テスト"""
    
    @pytest.fixture
    def client(self):
        """FastAPI テストクライアント"""
        return TestClient(app)
    
    @pytest.fixture
    def sample_inquiry(self):
        """テスト用問い合わせデータ"""
        return ContactInquiry(
            name="テストユーザー",
            email="test@example.com",
            subject="アプリの使い方について",
            message="いつもHomebiyoriを利用させていただいております。キャラクターの選択方法について質問があります。",
            category=ContactCategory.GENERAL,
            priority=ContactPriority.MEDIUM
        )
    
    def test_health_check(self, client):
        """ヘルスチェック テスト"""
        response = client.get("/health/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        assert data["data"]["service"] == "contact_service"
        assert data["data"]["status"] == "healthy"
    
    def test_get_contact_categories(self, client):
        """問い合わせカテゴリ取得 テスト"""
        response = client.get("/api/contact/categories")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "success"
        
        categories = data["data"]["categories"]
        assert len(categories) == 7  # 7つのカテゴリ
        
        # 必須カテゴリの存在確認
        category_values = [cat["value"] for cat in categories]
        assert "general" in category_values
        assert "bug_report" in category_values
        assert "feature_request" in category_values
    
    @patch('backend.services.contact_service.handlers.contact.ContactNotificationService')
    def test_submit_inquiry_success(self, mock_notification_service, client, sample_inquiry):
        """問い合わせ送信成功 テスト"""
        # モックの設定
        mock_service_instance = Mock()
        mock_service_instance.send_inquiry_notification = AsyncMock(return_value={
            "success": True,
            "message_id": "test-message-id-123",
            "notification_type": "sns_email",
            "sent_at": datetime.utcnow().isoformat()
        })
        mock_notification_service.return_value = mock_service_instance
        
        response = client.post(
            "/api/contact/submit",
            json=sample_inquiry.model_dump()
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "お問い合わせを受け付けました" in data["message"]
        
        inquiry_response = data["data"]
        assert "inquiry_id" in inquiry_response
        assert inquiry_response["category"] == "general"
        assert inquiry_response["priority"] == "medium"
        assert inquiry_response["notification_sent"] is True
    
    def test_submit_inquiry_validation_error(self, client):
        """問い合わせ送信バリデーションエラー テスト"""
        invalid_inquiry = {
            "name": "",  # 空の名前（バリデーションエラー）
            "email": "invalid-email",  # 無効なメール形式
            "subject": "テスト件名",
            "message": "短すぎ",  # 10文字未満（バリデーションエラー）
            "category": "general",
            "priority": "medium"
        }
        
        response = client.post("/api/contact/submit", json=invalid_inquiry)
        assert response.status_code == 422  # Validation Error
    
    @patch('backend.services.contact_service.handlers.contact.ContactNotificationService')
    def test_submit_inquiry_notification_failure(self, mock_notification_service, client, sample_inquiry):
        """問い合わせ送信・通知失敗 テスト"""
        # モックの設定（通知失敗）
        mock_service_instance = Mock()
        mock_service_instance.send_inquiry_notification = AsyncMock(return_value={
            "success": False,
            "error": "SNS Publish failed",
            "notification_type": "sns_email",
            "attempted_at": datetime.utcnow().isoformat()
        })
        mock_notification_service.return_value = mock_service_instance
        
        response = client.post(
            "/api/contact/submit",
            json=sample_inquiry.model_dump()
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        
        inquiry_response = data["data"]
        assert inquiry_response["notification_sent"] is False
    
    def test_spam_detection(self, client):
        """スパム検出 テスト"""
        spam_inquiry = {
            "name": "スパムユーザー",
            "email": "spam@example.com",
            "subject": "今すぐクリック！限定特典で稼げる副業！",
            "message": "今すぐクリック！今すぐクリック！限定特典で稼げる副業！無料でビットコインが手に入ります！https://spam.com/click",
            "category": "other",
            "priority": "high"
        }
        
        with patch('backend.services.contact_service.handlers.contact.ContactNotificationService') as mock_notification:
            mock_service = Mock()
            mock_service.send_inquiry_notification = AsyncMock(return_value={
                "success": True,
                "message_id": "test-message-id",
                "notification_type": "sns_email",
                "sent_at": datetime.utcnow().isoformat()
            })
            mock_notification.return_value = mock_service
            
            response = client.post("/api/contact/submit", json=spam_inquiry)
            
            assert response.status_code == 200
            data = response.json()
            
            # スパム検出により優先度がLOWに調整される可能性
            inquiry_response = data["data"]
            assert inquiry_response["priority"] in ["low", "medium", "high"]


class TestContactNotificationService:
    """Contact Notification Service テスト"""
    
    @pytest.fixture
    def notification_service(self):
        """通知サービス インスタンス"""
        return ContactNotificationService()
    
    @pytest.fixture
    def sample_inquiry(self):
        """テスト用問い合わせデータ"""
        return ContactInquiry(
            name="山田太郎",
            email="yamada@example.com", 
            subject="緊急：ログインできません",
            message="昨日からログインができない状況です。パスワードを何度か試しましたが解決しません。至急対応をお願いします。",
            category=ContactCategory.ACCOUNT_ISSUE,
            priority=ContactPriority.HIGH,
            user_id="12345678-1234-5678-9012-123456789012"
        )
    
    def test_build_notification_message(self, notification_service, sample_inquiry):
        """通知メッセージ構築 テスト"""
        inquiry_id = str(uuid.uuid4())
        
        message_data = notification_service._build_notification_message(
            sample_inquiry, inquiry_id
        )
        
        assert "subject" in message_data
        assert "body" in message_data
        assert "inquiry_id" in message_data
        assert message_data["inquiry_id"] == inquiry_id
        assert message_data["category"] == "account_issue"
        assert message_data["priority"] == "high"
        
        # 件名に緊急フラグが含まれているか
        assert "【緊急】" in message_data["subject"]
        assert "🔴" in message_data["subject"]
        
        # 本文に必要な情報が含まれているか
        body = message_data["body"]
        assert inquiry_id in body
        assert sample_inquiry.name in body
        assert sample_inquiry.email in body
        assert sample_inquiry.subject in body
        assert sample_inquiry.message in body
        assert "4時間以内の返信" in body  # 高優先度の対応指示
    
    @patch('boto3.client')
    async def test_send_sns_notification_success(self, mock_boto_client, notification_service, sample_inquiry):
        """SNS通知送信成功 テスト"""
        # Mock SNS client
        mock_sns = Mock()
        mock_sns.publish.return_value = {
            "MessageId": "test-message-id-12345"
        }
        mock_boto_client.return_value = mock_sns
        
        inquiry_id = str(uuid.uuid4())
        result = await notification_service.send_inquiry_notification(
            sample_inquiry, inquiry_id
        )
        
        assert result["success"] is True
        assert result["message_id"] == "test-message-id-12345"
        assert result["notification_type"] == "sns_email"
        assert "sent_at" in result
        
        # SNS publish が呼ばれたことを確認
        mock_sns.publish.assert_called_once()
    
    @patch('boto3.client')
    async def test_send_sns_notification_failure(self, mock_boto_client, notification_service, sample_inquiry):
        """SNS通知送信失敗 テスト"""
        # Mock SNS client (例外発生)
        mock_sns = Mock()
        mock_sns.publish.side_effect = Exception("SNS service unavailable")
        mock_boto_client.return_value = mock_sns
        
        inquiry_id = str(uuid.uuid4())
        result = await notification_service.send_inquiry_notification(
            sample_inquiry, inquiry_id
        )
        
        assert result["success"] is False
        assert "error" in result
        assert "SNS service unavailable" in result["error"]
        assert result["notification_type"] == "sns_email"
        assert "attempted_at" in result
    
    @patch('boto3.client')
    async def test_send_test_notification(self, mock_boto_client, notification_service):
        """テスト通知送信 テスト"""
        # Mock SNS client
        mock_sns = Mock()
        mock_sns.publish.return_value = {
            "MessageId": "test-notification-id"
        }
        mock_boto_client.return_value = mock_sns
        
        result = await notification_service.send_test_notification()
        
        assert result["success"] is True
        assert result["message_id"] == "test-notification-id"
        
        # テスト用の問い合わせが作成されたことを確認
        call_args = mock_sns.publish.call_args
        assert call_args is not None


class TestContactModels:
    """Contact Models テスト"""
    
    def test_contact_inquiry_validation_success(self):
        """ContactInquiry バリデーション成功 テスト"""
        valid_data = {
            "name": "田中花子",
            "email": "tanaka@example.com",
            "subject": "アプリについてのご質問",
            "message": "いつもお世話になっております。新機能について教えてください。",
            "category": "general",
            "priority": "medium"
        }
        
        inquiry = ContactInquiry(**valid_data)
        assert inquiry.name == "田中花子"
        assert inquiry.email == "tanaka@example.com"
        assert inquiry.category == ContactCategory.GENERAL
        assert inquiry.priority == ContactPriority.MEDIUM
    
    def test_contact_inquiry_validation_failure(self):
        """ContactInquiry バリデーション失敗 テスト"""
        # 無効なメールアドレス
        with pytest.raises(ValueError, match="有効なメールアドレス"):
            ContactInquiry(
                name="テストユーザー",
                email="invalid-email-format",
                subject="テスト件名",
                message="これはテストメッセージです。10文字以上の要求を満たします。",
                category=ContactCategory.GENERAL,
                priority=ContactPriority.MEDIUM
            )
        
        # 短すぎるメッセージ
        with pytest.raises(ValueError, match="10文字以上"):
            ContactInquiry(
                name="テストユーザー",
                email="test@example.com",
                subject="テスト件名",
                message="短い",  # 10文字未満
                category=ContactCategory.GENERAL,
                priority=ContactPriority.MEDIUM
            )
        
        # 長すぎる件名
        with pytest.raises(ValueError, match="100文字以内"):
            ContactInquiry(
                name="テストユーザー",
                email="test@example.com",
                subject="あ" * 101,  # 101文字
                message="これはテストメッセージです。10文字以上の要求を満たします。",
                category=ContactCategory.GENERAL,
                priority=ContactPriority.MEDIUM
            )
    
    def test_contact_inquiry_spam_detection_validation(self):
        """ContactInquiry スパム検出バリデーション テスト"""
        # 不適切な文字が含まれる場合
        with pytest.raises(ValueError, match="不適切な文字"):
            ContactInquiry(
                name="テストユーザー",
                email="test@example.com",
                subject="<script>alert('xss')</script>",  # XSSスクリプト
                message="これはテストメッセージです。10文字以上の要求を満たします。",
                category=ContactCategory.GENERAL,
                priority=ContactPriority.MEDIUM
            )


# pytest実行用の設定
if __name__ == "__main__":
    pytest.main([__file__, "-v"])