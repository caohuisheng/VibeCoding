"""简单限流：进程内滑动窗口计数器（按用户）。"""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, status


class RateLimiter:
    def __init__(self, max_requests: int = 20, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = window_seconds
        self._buckets: dict[str, deque] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = time.time()
        dq = self._buckets[key]
        while dq and now - dq[0] > self.window:
            dq.popleft()
        if len(dq) >= self.max_requests:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                detail="请求过于频繁，请稍后再试",
            )
        dq.append(now)


chat_limiter = RateLimiter(max_requests=20, window_seconds=60)
