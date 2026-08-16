"""进程内 LRU 缓存：缓存相似问题的答案，降低重复 LLM 调用成本与延迟。"""

from collections import OrderedDict
from typing import Any


class LRUCache:
    def __init__(self, capacity: int = 128):
        self.capacity = capacity
        self._data: OrderedDict[str, Any] = OrderedDict()

    def get(self, key: str) -> Any:
        if key not in self._data:
            return None
        self._data.move_to_end(key)
        return self._data[key]

    def set(self, key: str, value: Any) -> None:
        if key in self._data:
            self._data.move_to_end(key)
        self._data[key] = value
        if len(self._data) > self.capacity:
            self._data.popitem(last=False)

    def clear(self) -> None:
        self._data.clear()


# 相似问题答案缓存：key = 归一化后的问题文本，value = (answer, citations)
query_cache = LRUCache(capacity=128)
