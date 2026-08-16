"""Embedding 模型封装（阿里百炼 text-embedding-v3）。

说明：直接通过 httpx 调 DashScope OpenAI 兼容的 /embeddings 接口，
规避 openai SDK v3 与兼容端点之间 input 序列化格式不一致的问题，同时支持分批。
"""

from functools import lru_cache

import httpx
from langchain_core.embeddings import Embeddings

from ..config import settings

_BATCH_SIZE = 16


class DashScopeEmbeddings(Embeddings):
    def __init__(self, model: str | None = None, api_key: str | None = None, base_url: str | None = None):
        self.model = model or settings.embedding_model
        self.api_key = api_key or settings.dashscope_api_key
        self.base_url = (base_url or settings.dashscope_base_url).rstrip("/")

    def _embed(self, texts: list[str]) -> list[list[float]]:
        resp = httpx.post(
            f"{self.base_url}/embeddings",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={"model": self.model, "input": texts},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()["data"]
        data.sort(key=lambda x: x.get("index", 0))
        return [d["embedding"] for d in data]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for i in range(0, len(texts), _BATCH_SIZE):
            out.extend(self._embed(texts[i : i + _BATCH_SIZE]))
        return out

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text])[0]


@lru_cache
def get_embeddings() -> DashScopeEmbeddings:
    return DashScopeEmbeddings()
