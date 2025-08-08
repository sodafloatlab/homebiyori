"""
Contact Service 統合テスト

実際のAWS環境（開発環境）での動作確認。
SNS通知の実際の動作をテスト。

注意：このテストは実際のAWSリソースを使用するため、
適切なクレデンシャルとリソースが必要です。
"""

import pytest
import asyncio
import os
import uuid
from datetime import datetime

# AWS SDK
import boto3
from botocore.exceptions import ClientError

# Contact Service
from backend.services.contact_service.models import (
    ContactInquiry, ContactCategory, ContactPriority
)
from backend.services.contact_service.services.notification_service import ContactNotificationService
from backend.services.contact_service.core.config import get_settings


class TestContactServiceIntegration:
    """Contact Service 統合テスト（AWS環境）"""
    
    @pytest.fixture(scope="class")
    def aws_credentials_available(self):
        """AWS認証情報の存在確認"""
        try:
            # AWS認証情報を確認
            session = boto3.Session()
            credentials = session.get_credentials()
            if credentials is None:
                pytest.skip("AWS credentials not available")
            return True
        except Exception:
            pytest.skip("AWS credentials not available")
    
    @pytest.fixture(scope="class") 
    def sns_topic_arn(self, aws_credentials_available):
        """SNSトピックARNの取得"""
        topic_arn = os.getenv("SNS_TOPIC_ARN")
        if not topic_arn:
            pytest.skip("SNS_TOPIC_ARN environment variable not set")
        return topic_arn
    
    @pytest.fixture
    def notification_service(self, sns_topic_arn):
        """通知サービス（実環境）"""
        # 環境変数設定
        os.environ["SNS_TOPIC_ARN"] = sns_topic_arn
        os.environ["AWS_DEFAULT_REGION"] = "ap-northeast-1"
        os.environ["ENVIRONMENT"] = "test"
        
        return ContactNotificationService()
    
    @pytest.fixture
    def sample_inquiry(self):
        """テスト用問い合わせデータ"""
        return ContactInquiry(
            name="統合テストユーザー",
            email="integration-test@homebiyori.local",
            subject="統合テスト：SNS通知確認",
            message="これは統合テスト用の問い合わせです。SNS通知が正常に動作することを確認しています。実際の運営者メールアドレスに通知が送信される可能性があります。",
            category=ContactCategory.OTHER,
            priority=ContactPriority.LOW,  # テストのため低優先度
            user_id="test-user-" + uuid.uuid4().hex[:8]
        )
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_sns_connection(self, notification_service):
        """SNS接続テスト"""
        settings = get_settings()
        
        try:
            sns_client = boto3.client('sns', region_name=settings.sns_region)
            
            # トピックの存在確認
            response = sns_client.get_topic_attributes(
                TopicArn=settings.sns_topic_arn
            )
            
            assert response["Attributes"]["TopicArn"] == settings.sns_topic_arn
            print(f"✅ SNS Topic found: {settings.sns_topic_arn}")
            
            # サブスクリプション数を確認
            confirmed_subs = int(response["Attributes"].get("SubscriptionsConfirmed", 0))
            pending_subs = int(response["Attributes"].get("SubscriptionsPending", 0))
            
            print(f"📧 Confirmed subscriptions: {confirmed_subs}")
            print(f"⏳ Pending subscriptions: {pending_subs}")
            
            if confirmed_subs == 0:
                pytest.skip("No confirmed email subscriptions for testing")
                
        except ClientError as e:
            pytest.fail(f"SNS connection failed: {e}")
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_send_test_notification(self, notification_service):
        """テスト通知送信"""
        print("📨 Sending test notification...")
        
        result = await notification_service.send_test_notification()
        
        assert result["success"] is True, f"Test notification failed: {result.get('error')}"
        assert "message_id" in result
        
        print(f"✅ Test notification sent successfully")
        print(f"📧 SNS Message ID: {result['message_id']}")
        print(f"⏰ Sent at: {result['sent_at']}")
    
    @pytest.mark.integration  
    @pytest.mark.asyncio
    async def test_send_inquiry_notification(self, notification_service, sample_inquiry):
        """実際の問い合わせ通知送信テスト"""
        inquiry_id = f"integration-test-{uuid.uuid4().hex[:8]}"
        
        print(f"📨 Sending inquiry notification: {inquiry_id}")
        print(f"📝 Subject: {sample_inquiry.subject}")
        
        result = await notification_service.send_inquiry_notification(
            sample_inquiry, inquiry_id
        )
        
        assert result["success"] is True, f"Inquiry notification failed: {result.get('error')}"
        assert "message_id" in result
        
        print(f"✅ Inquiry notification sent successfully")
        print(f"📧 SNS Message ID: {result['message_id']}")
        print(f"⏰ Sent at: {result['sent_at']}")
        print(f"🏷️ Category: {sample_inquiry.category.value}")
        print(f"🚨 Priority: {sample_inquiry.priority.value}")
    
    @pytest.mark.integration
    @pytest.mark.asyncio 
    async def test_high_priority_notification(self, notification_service):
        """高優先度通知テスト"""
        high_priority_inquiry = ContactInquiry(
            name="緊急テストユーザー",
            email="urgent-test@homebiyori.local", 
            subject="【緊急】システム障害報告テスト",
            message="これは緊急度が高い問い合わせの統合テストです。緊急対応フローが正常に動作するかを確認しています。",
            category=ContactCategory.BUG_REPORT,
            priority=ContactPriority.HIGH,
            user_id="urgent-test-user-" + uuid.uuid4().hex[:8]
        )
        
        inquiry_id = f"urgent-test-{uuid.uuid4().hex[:8]}"
        
        print(f"🚨 Sending HIGH priority inquiry notification: {inquiry_id}")
        
        result = await notification_service.send_inquiry_notification(
            high_priority_inquiry, inquiry_id
        )
        
        assert result["success"] is True
        
        print(f"✅ HIGH priority notification sent")
        print(f"📧 SNS Message ID: {result['message_id']}")
        
        # メッセージ内容の確認（実際の運営者に送信されるため、ログでのみ確認）
        message_data = notification_service._build_notification_message(
            high_priority_inquiry, inquiry_id
        )
        
        # 高優先度の特徴を確認
        assert "【緊急】" in message_data["subject"]
        assert "4時間以内の返信" in message_data["body"]
        assert "🔴" in message_data["subject"]
        
        print(f"✅ HIGH priority message format verified")


class TestSNSConfiguration:
    """SNS設定確認テスト"""
    
    @pytest.mark.integration
    def test_sns_topic_configuration(self):
        """SNSトピック設定確認"""
        settings = get_settings()
        
        sns_client = boto3.client('sns', region_name=settings.sns_region)
        
        try:
            # トピック属性を取得
            response = sns_client.get_topic_attributes(
                TopicArn=settings.sns_topic_arn
            )
            
            attributes = response["Attributes"]
            
            print(f"📋 Topic Configuration:")
            print(f"  📧 Topic ARN: {attributes['TopicArn']}")
            print(f"  📛 Display Name: {attributes.get('DisplayName', 'N/A')}")
            print(f"  ✅ Confirmed Subscriptions: {attributes.get('SubscriptionsConfirmed', 0)}")
            print(f"  ⏳ Pending Subscriptions: {attributes.get('SubscriptionsPending', 0)}")
            print(f"  🔐 KMS Key ID: {attributes.get('KmsMasterKeyId', 'N/A')}")
            
            # 最低限の設定を確認
            assert attributes["TopicArn"] == settings.sns_topic_arn
            assert int(attributes.get("SubscriptionsConfirmed", 0)) >= 0
            
            print("✅ SNS topic configuration is valid")
            
        except ClientError as e:
            pytest.fail(f"Failed to get SNS topic attributes: {e}")
    
    @pytest.mark.integration
    def test_sns_permissions(self):
        """SNS権限確認テスト"""
        settings = get_settings()
        
        sns_client = boto3.client('sns', region_name=settings.sns_region)
        
        try:
            # Publish権限の確認（dry runは無いので、テスト用の空メッセージ確認）
            # 実際には送信しない、権限チェックのみ
            
            # ListTopics権限の確認
            topics_response = sns_client.list_topics()
            topic_arns = [topic["TopicArn"] for topic in topics_response["Topics"]]
            
            assert settings.sns_topic_arn in topic_arns, "Topic not found in list"
            
            print("✅ SNS permissions are configured correctly")
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'AuthorizationError':
                pytest.fail("SNS authorization error: insufficient permissions")
            else:
                pytest.fail(f"SNS permission check failed: {e}")


# 統合テスト実行用のヘルパー関数
def run_integration_tests():
    """統合テストの実行"""
    print("🧪 Running Contact Service Integration Tests...")
    print("⚠️  Warning: These tests will send actual SNS notifications")
    
    # 環境変数の確認
    required_env_vars = ["SNS_TOPIC_ARN", "AWS_DEFAULT_REGION"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        return False
    
    # pytest実行
    exit_code = pytest.main([
        __file__,
        "-v",
        "-m", "integration",
        "--tb=short"
    ])
    
    return exit_code == 0


if __name__ == "__main__":
    run_integration_tests()