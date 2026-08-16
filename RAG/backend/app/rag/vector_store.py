"""向量库管理（Chroma 持久化）与 BM25 关键词索引。

说明：
- 向量检索走 Chroma（语义匹配）。
- 关键词检索走自研 BM25（jieba 中文分词 + rank_bm25），精确匹配商品名/型号，
  索引由 Chroma 中的全量分块构建，并用版本号 `_doc_version` 做缓存失效。
"""

from functools import lru_cache

import jieba
from langchain_chroma import Chroma
from langchain_core.documents import Document
from rank_bm25 import BM25Okapi

from ..config import settings
from .embeddings import get_embeddings

_COLLECTION_NAME = "ecommerce_kb"

# 文档版本号：增删文档后 +1，触发 BM25 索引重建
_doc_version = 0
_bm25_index: "BM25Index | None" = None
_bm25_cached_version = -1


class BM25Index:
    """基于 jieba 中文分词的 BM25 关键词索引。"""

    def __init__(self, docs: list[Document]):
        self._docs = docs
        self._corpus = [self._tokenize(d.page_content) for d in docs]
        self._bm25 = BM25Okapi(self._corpus)

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return [t.strip() for t in jieba.lcut(text) if t.strip()]

    def search(self, query: str, k: int) -> list[Document]:
        tokens = self._tokenize(query)
        if not tokens:
            return []
        scores = self._bm25.get_scores(tokens)
        ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
        return [self._docs[i] for i in ranked[:k] if scores[i] > 0]


@lru_cache
def get_vectorstore() -> Chroma:
    return Chroma(
        collection_name=_COLLECTION_NAME,
        embedding_function=get_embeddings(),
        persist_directory=settings.chroma_persist_dir,
    )


def add_documents(documents: list[Document]) -> None:
    if not documents:
        return
    get_vectorstore().add_documents(documents)


def delete_by_document_id(document_id: int) -> None:
    get_vectorstore().delete(where={"document_id": document_id})


def bump_version() -> None:
    global _doc_version
    _doc_version += 1


def get_bm25_retriever() -> "BM25Index | None":
    """返回基于当前全量分块构建的 BM25 索引（无文档时返回 None）。"""
    global _bm25_index, _bm25_cached_version
    if _bm25_index is not None and _bm25_cached_version == _doc_version:
        return _bm25_index

    data = get_vectorstore().get(include=["documents", "metadatas"])
    docs = [
        Document(page_content=text, metadata=meta or {})
        for text, meta in zip(data["documents"], data["metadatas"])
    ]
    _bm25_index = BM25Index(docs) if docs else None
    _bm25_cached_version = _doc_version
    return _bm25_index
