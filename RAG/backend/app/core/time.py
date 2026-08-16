"""时间工具。"""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """返回 naive UTC 时间（与 SQLite/MySQL 存储兼容，规避 3.12+ 的 utcnow 弃用告警）。"""
    return datetime.now(timezone.utc).replace(tzinfo=None)
