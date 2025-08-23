"""
Homebiyori Common Enums

サービス間で共有される列挙型定義
tree_serviceとuser_serviceの正しい定義を基準として作成
"""

from enum import Enum
from typing import Literal


# =====================================
# AIキャラクター・対話関連
# =====================================

class AICharacterType(str, Enum):
    """
    AIキャラクタータイプ定義（user_service準拠）
    """

    MITTYAN = "mittyan"  # みっちゃん（下町のベテランおばちゃん）
    MADOKASAN = "madokasan"  # まどかさん（バリキャリ共働きママ）
    HIDEJI = "hideji"  # ひでじい（元教師の詩人）


class PraiseLevel(str, Enum):
    """
    AI褒めレベル設定（2段階）（user_service準拠）

    各レベルの応答文字数目安:
    - NORMAL: 2-3文程度（適度なサポートと承認）
    - DEEP: 4-5文程度（思慮深く詳細な肯定と共感）
    """

    NORMAL = "normal"  # ノーマル: 適度なサポートと承認
    DEEP = "deep"  # ディープ: 思慮深く詳細な肯定と共感


class InteractionMode(str, Enum):
    """
    AI対話モード設定（user_service準拠）
    
    ユーザーの今日の気分や必要に応じてAI応答のトーンを調整。
    chat_serviceでプロンプト生成時に参照される。
    """
    
    PRAISE = "praise"  # 褒めモード: 積極的な肯定・承認・励まし中心
    LISTEN = "listen"  # 傾聴モード: 共感・理解・寄り添い中心


# =====================================
# 感情・成長システム関連
# =====================================

class EmotionType(str, Enum):
    """感情タイプ（tree_service準拠・design_database.md準拠）"""
    JOY = "joy"                    # 喜び
    SADNESS = "sadness"           # 悲しみ
    FATIGUE = "fatigue"           # 疲労
    ACCOMPLISHMENT = "accomplishment"  # 達成感
    WORRY = "worry"               # 心配


class TreeTheme(str, Enum):
    """木のテーマカラー（tree_service準拠・design_ai.md準拠）"""
    ROSE = "rose"        # みっちゃん - ピンク系
    SKY = "sky"          # まどかさん - ブルー系  
    AMBER = "amber"      # ヒデじい - オレンジ系


# =====================================
# サブスクリプション・課金関連
# =====================================

class SubscriptionStatus(str, Enum):
    """
    サブスクリプション状態（Stripe公式仕様準拠）
    
    Stripe API 2024年仕様に基づく正式なステータス定義：
    https://stripe.com/docs/api/subscriptions/object#subscription_object-status
    
    Issue #15 新戦略対応：
    billing_service と webhook_service の重複定義を統一
    """
    INCOMPLETE = "incomplete"                  # 未完了（初回支払い処理中）
    INCOMPLETE_EXPIRED = "incomplete_expired"  # 未完了期限切れ（初回支払い失敗）
    TRIALING = "trialing"                     # トライアル期間中
    ACTIVE = "active"                         # アクティブ（正常稼働）
    PAST_DUE = "past_due"                    # 支払い遅延
    CANCELED = "canceled"                     # キャンセル済み
    UNPAID = "unpaid"                        # 未払い（複数回決済失敗）         # 期限切れ（新戦略）


class SubscriptionPlan(str, Enum):
    """
    サブスクリプションプラン（統一定義）
    
    Issue #15 新戦略対応：
    全ユーザー統一体験、月額・年額データレベル区別のみ
    """
    TRIAL = "trial"              # 1週間無料トライアル
    MONTHLY = "monthly"          # 月額プラン（580円）
    YEARLY = "yearly"            # 年額プラン（5800円）


class PaymentStatus(str, Enum):
    """支払い状態（統一定義）"""
    SUCCEEDED = "succeeded"      # 成功
    FAILED = "failed"           # 失敗
    PENDING = "pending"         # 保留中
    CANCELED = "canceled"       # キャンセル


# =====================================
# 型エイリアス
# =====================================

TreeStage = Literal[0, 1, 2, 3, 4, 5, 6]