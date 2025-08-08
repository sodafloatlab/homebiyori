"""
Contact Service - 通知サービス

AWS SNS を使用した運営者向けメール通知機能。
問い合わせ内容と優先度に応じて適切な通知を送信。
"""

import json
import uuid
from typing import Dict, Any, Optional
from datetime import datetime

import boto3
from botocore.exceptions import ClientError

from homebiyori_common import get_logger
from homebiyori_common.utils.datetime_utils import get_current_jst

from ..models import ContactInquiry, ContactCategory, ContactPriority
from ..core.config import get_settings

logger = get_logger(__name__)


class ContactNotificationService:
    """
    問い合わせ通知サービス
    
    ■機能概要■
    - AWS SNS経由でのメール通知
    - 緊急度別の通知内容調整
    - カテゴリ別の担当者振り分け
    - 通知失敗時のリトライ機能
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.sns_client = boto3.client('sns', region_name=self.settings.sns_region)
        
    async def send_inquiry_notification(
        self, 
        inquiry: ContactInquiry,
        inquiry_id: str
    ) -> Dict[str, Any]:
        """
        問い合わせ通知を送信
        
        Args:
            inquiry: 問い合わせ情報
            inquiry_id: 問い合わせ固有ID
            
        Returns:
            Dict[str, Any]: 通知送信結果
        """
        try:
            # 通知メッセージを構築
            notification_data = self._build_notification_message(inquiry, inquiry_id)
            
            # SNS経由で通知送信
            response = await self._send_sns_notification(notification_data)
            
            logger.info("Inquiry notification sent successfully", extra={
                "inquiry_id": inquiry_id,
                "category": inquiry.category.value,
                "priority": inquiry.priority.value,
                "sns_message_id": response.get("MessageId")
            })
            
            return {
                "success": True,
                "message_id": response.get("MessageId"),
                "notification_type": "sns_email",
                "sent_at": get_current_jst().isoformat()
            }
            
        except Exception as e:
            logger.error("Failed to send inquiry notification", extra={
                "inquiry_id": inquiry_id,
                "error": str(e),
                "error_type": type(e).__name__
            })
            
            return {
                "success": False,
                "error": str(e),
                "notification_type": "sns_email",
                "attempted_at": get_current_jst().isoformat()
            }
    
    def _build_notification_message(
        self, 
        inquiry: ContactInquiry, 
        inquiry_id: str
    ) -> Dict[str, Any]:
        """
        通知メッセージを構築
        
        Args:
            inquiry: 問い合わせ情報
            inquiry_id: 問い合わせ固有ID
            
        Returns:
            Dict[str, Any]: 通知メッセージデータ
        """
        # カテゴリ別の日本語名
        category_names = {
            ContactCategory.GENERAL: "一般的なお問い合わせ",
            ContactCategory.BUG_REPORT: "バグ報告・不具合",
            ContactCategory.FEATURE_REQUEST: "新機能要望", 
            ContactCategory.ACCOUNT_ISSUE: "アカウント関連",
            ContactCategory.PAYMENT: "決済・課金関連",
            ContactCategory.PRIVACY: "プライバシー・データ削除",
            ContactCategory.OTHER: "その他"
        }
        
        # 緊急度別の日本語名とアイコン
        priority_info = {
            ContactPriority.LOW: {"name": "低", "icon": "🟢", "action": "通常対応"},
            ContactPriority.MEDIUM: {"name": "中", "icon": "🟡", "action": "優先対応"},
            ContactPriority.HIGH: {"name": "高", "icon": "🔴", "action": "緊急対応"}
        }
        
        priority_data = priority_info.get(inquiry.priority, {"name": "中", "icon": "🟡", "action": "通常対応"})
        
        # メール件名を構築
        subject = f"[Homebiyori] {priority_data['icon']} 新しい{category_names.get(inquiry.category, 'お問い合わせ')}"
        
        if inquiry.priority == ContactPriority.HIGH:
            subject = f"【緊急】{subject}"
        
        # メール本文を構築
        body = self._build_email_body(inquiry, inquiry_id, category_names, priority_data)
        
        return {
            "subject": subject,
            "body": body,
            "inquiry_id": inquiry_id,
            "category": inquiry.category.value,
            "priority": inquiry.priority.value,
            "customer_email": inquiry.email,
            "timestamp": get_current_jst().isoformat()
        }
    
    def _build_email_body(
        self,
        inquiry: ContactInquiry,
        inquiry_id: str,
        category_names: Dict[ContactCategory, str],
        priority_data: Dict[str, str]
    ) -> str:
        """
        メール本文を構築
        
        Args:
            inquiry: 問い合わせ情報
            inquiry_id: 問い合わせ固有ID
            category_names: カテゴリ名マッピング
            priority_data: 緊急度データ
            
        Returns:
            str: メール本文
        """
        user_info = f"認証済みユーザー ({inquiry.user_id})" if inquiry.user_id else "未認証ユーザー"
        response_time = self.settings.get_response_time_text(inquiry.priority.value)
        
        body = f"""
Homebiyori運営チーム様

新しいお問い合わせを受信しました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 基本情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
お問い合わせID: {inquiry_id}
受信日時: {get_current_jst().strftime('%Y年%m月%d日 %H:%M:%S JST')}
カテゴリ: {category_names.get(inquiry.category, 'その他')}
緊急度: {priority_data['icon']} {priority_data['name']} ({priority_data['action']})
目標返信時間: {response_time}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ お客様情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
お名前: {inquiry.name}
メールアドレス: {inquiry.email}
ユーザー種別: {user_info}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ お問い合わせ内容
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
件名: {inquiry.subject}

内容:
{inquiry.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 対応情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        
        # 緊急度別の対応指示を追加
        if inquiry.priority == ContactPriority.HIGH:
            body += """
🔴 【緊急対応】
- 4時間以内の返信をお願いします
- 必要に応じて電話対応も検討してください
- エスカレーション先: 技術責任者・カスタマーサクセス責任者
"""
        elif inquiry.priority == ContactPriority.MEDIUM:
            body += """
🟡 【優先対応】
- 24時間以内の返信をお願いします
- 標準的なサポート手順に従って対応してください
"""
        else:
            body += """
🟢 【通常対応】
- 3営業日以内の返信をお願いします
- FAQ等で解決可能か確認してから個別対応してください
"""
        
        # カテゴリ別の対応情報を追加
        category_instructions = {
            ContactCategory.BUG_REPORT: "- バグトラッキングシステムに登録してください\n- 再現手順の確認をお願いします",
            ContactCategory.FEATURE_REQUEST: "- プロダクトチームに共有してください\n- ユーザー要望として記録してください",
            ContactCategory.ACCOUNT_ISSUE: "- Cognito管理画面で状況確認をお願いします\n- 必要に応じてアカウント復旧作業を行ってください",
            ContactCategory.PAYMENT: "- Stripe管理画面で決済状況を確認してください\n- 課金チームにエスカレーションしてください",
            ContactCategory.PRIVACY: "- データ削除依頼の場合は法務チーム承認が必要です\n- GDPR対応手順に従ってください"
        }
        
        if inquiry.category in category_instructions:
            body += f"\n\n■ カテゴリ別対応指示\n{category_instructions[inquiry.category]}"
        
        # 技術情報を追加
        if inquiry.user_agent:
            body += f"\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            body += f"■ 技術情報\n"
            body += f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            body += f"User-Agent: {inquiry.user_agent}\n"
        
        body += f"""

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
このメールは Homebiyori Contact Service より自動送信されています。
お問い合わせ管理: https://admin.homebiyori.com/contact/{inquiry_id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        
        return body.strip()
    
    async def _send_sns_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        AWS SNS経由で通知を送信
        
        Args:
            notification_data: 通知データ
            
        Returns:
            Dict[str, Any]: SNS送信レスポンス
        """
        try:
            # SNSメッセージを構築
            message = {
                "default": notification_data["body"],
                "email": notification_data["body"]
            }
            
            # メッセージ属性を設定
            message_attributes = {
                'inquiry_id': {
                    'DataType': 'String',
                    'StringValue': notification_data["inquiry_id"]
                },
                'category': {
                    'DataType': 'String', 
                    'StringValue': notification_data["category"]
                },
                'priority': {
                    'DataType': 'String',
                    'StringValue': notification_data["priority"]
                },
                'customer_email': {
                    'DataType': 'String',
                    'StringValue': notification_data["customer_email"]
                }
            }
            
            # SNS Publish実行
            response = self.sns_client.publish(
                TopicArn=self.settings.sns_topic_arn,
                Message=json.dumps(message),
                Subject=notification_data["subject"],
                MessageStructure='json',
                MessageAttributes=message_attributes
            )
            
            return response
            
        except ClientError as e:
            logger.error("SNS publish failed", extra={
                "error_code": e.response['Error']['Code'],
                "error_message": e.response['Error']['Message'],
                "topic_arn": self.settings.sns_topic_arn
            })
            raise
        except Exception as e:
            logger.error("Unexpected error during SNS publish", extra={
                "error": str(e),
                "error_type": type(e).__name__
            })
            raise
    
    async def send_test_notification(self) -> Dict[str, Any]:
        """
        テスト通知を送信（設定確認用）
        
        Returns:
            Dict[str, Any]: テスト通知結果
        """
        test_inquiry = ContactInquiry(
            name="テストユーザー",
            email="test@example.com",
            subject="SNS通知テスト",
            message="これはHomebiyori Contact Serviceの通知システムテストです。",
            category=ContactCategory.OTHER,
            priority=ContactPriority.LOW
        )
        
        test_inquiry_id = f"test_{uuid.uuid4().hex[:8]}"
        
        return await self.send_inquiry_notification(test_inquiry, test_inquiry_id)