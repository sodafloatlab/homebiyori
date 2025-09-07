"""
日時処理ユーティリティ

Homebiyori（ほめびより）全体で統一されるJST時刻処理を提供。
- JST時刻取得・変換
- ISO形式文字列変換
- 日時パース処理
- タイムゾーン統一管理

全Lambdaサービスで共通利用される基盤機能。
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
import pytz


# JST (日本標準時) タイムゾーン定数
JST = pytz.timezone('Asia/Tokyo')


def get_current_jst() -> datetime:
    """
    現在時刻をJST（日本標準時）で取得
    
    Homebiyoriシステム全体で統一されるJST時刻取得関数。
    全てのタイムスタンプ生成でこの関数を使用する。
    
    Returns:
        datetime: 現在時刻（JST、tzinfo付き）
    
    Example:
        >>> now = get_current_jst()
        >>> print(now.tzinfo)  # Asia/Tokyo
    """
    return datetime.now(JST)


def to_jst_string(dt: datetime) -> str:
    """
    datetimeオブジェクトをJST文字列（ISO形式）に変換
    
    Args:
        dt: 変換対象のdatetimeオブジェクト
    
    Returns:
        str: ISO形式のJST時刻文字列
    
    Example:
        >>> dt = datetime(2024, 8, 5, 12, 30, 45)
        >>> jst_str = to_jst_string(dt)
        >>> # "2024-08-05T12:30:45+09:00"
    """
    if dt.tzinfo is None:
        # ナイーブなdatetimeの場合、JSTと仮定してローカライズ
        dt = JST.localize(dt)
    else:
        # タイムゾーン付きdatetimeをJSTに変換
        dt = dt.astimezone(JST)
    
    return dt.isoformat()


def parse_jst_datetime(datetime_str: Optional[str]) -> Optional[datetime]:
    """
    JST時刻文字列をdatetimeオブジェクトに変換
    
    Args:
        datetime_str: 時刻文字列（ISO形式、None可）
    
    Returns:
        datetime: JST時刻のdatetimeオブジェクト（入力がNoneの場合はNone）
    
    Example:
        >>> dt = parse_jst_datetime("2024-08-05T12:30:45+09:00")
        >>> print(dt.tzinfo)  # Asia/Tokyo
    """
    if not datetime_str:
        return None
    
    try:
        # ISO文字列をパース（Zは+00:00に置換）
        dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        
        # JSTに変換
        return dt.astimezone(JST)
        
    except (ValueError, TypeError) as e:
        # パース失敗時はNoneを返す（呼び出し元でログ出力）
        return None


def jst_now_string() -> str:
    """
    現在時刻のJST文字列を取得（ショートカット関数）
    
    Returns:
        str: 現在時刻のISO形式JST文字列
    """
    return to_jst_string(get_current_jst())


def add_days_jst(base_dt: datetime, days: int) -> datetime:
    """JST基準で日数を加算"""
    if base_dt.tzinfo is None:
        base_dt = JST.localize(base_dt)
    else:
        base_dt = base_dt.astimezone(JST)
    
    return base_dt + timedelta(days=days)


def format_jst_for_display(dt: datetime, format_str: str = "%Y年%m月%d日 %H:%M") -> str:
    """
    JST時刻を日本語表示用にフォーマット
    
    Args:
        dt: フォーマット対象のdatetime
        format_str: フォーマット文字列
    
    Returns:
        str: 日本語フォーマットされた時刻文字列
    """
    if dt.tzinfo is None:
        dt = JST.localize(dt)
    else:
        dt = dt.astimezone(JST)
    
    return dt.strftime(format_str)


def get_jst_date_range(days_back: int = 7) -> tuple[datetime, datetime]:
    """
    JST基準で指定日数前からの日付範囲を取得
    
    Args:
        days_back: 遡る日数
    
    Returns:
        tuple: (開始日時, 終了日時) のJST datetime
    """
    end_dt = get_current_jst()
    start_dt = end_dt - timedelta(days=days_back)
    
    return start_dt, end_dt


def get_jst_timezone():
    """
    JST（日本標準時）タイムゾーンオブジェクトを取得
    
    billing_serviceなどで使用される共通タイムゾーン取得関数。
    
    Returns:
        pytz.timezone: Asia/Tokyoタイムゾーンオブジェクト
    
    Example:
        >>> jst_tz = get_jst_timezone()
        >>> now_jst = datetime.now(jst_tz)
    """
    return JST


