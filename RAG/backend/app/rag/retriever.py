"""混合检索：向量检索 + BM25 关键词检索 → RRF 融合。"""

from langchain_core.documents import Document

from ..config import settings
from .vector_store import get_bm25_retriever, get_vectorstore

_RECALL_MULTIPLIER = 2  # 先多召回候选，融合后再收敛到 top-k


def _rrf_fuse(ranked_lists: list[list[Document]], k: int = 60) -> list[Document]:
    """Reciprocal Rank Fusion：对多路召回结果按排名融合打分。"""
    scores: dict[str, float] = {}
    docs: dict[str, Document] = {}
    for ranked in ranked_lists:
        for rank, doc in enumerate(ranked):
            key = doc.metadata.get("chunk_id") or doc.page_content
            docs[key] = doc
            scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank + 1)
    fused = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    out = []
    for key, score in fused:
        d = docs[key]
        d.metadata["rrf_score"] = round(score, 6)
        out.append(d)
    return out


def retrieve(query: str, k: int | None = None) -> list[Document]:
    """混合检索入口，返回融合后的 top-k 分块。"""
    k = k or settings.retrieval_k
    recall_k = k * _RECALL_MULTIPLIER

    vector_docs = get_vectorstore().similarity_search_with_score(query, k=recall_k)
    vector_ranked = [doc for doc, _ in vector_docs]

    bm25 = get_bm25_retriever()
    bm25_ranked = bm25.search(query, recall_k) if bm25 else []

    return _rrf_fuse([vector_ranked, bm25_ranked])[:k]
