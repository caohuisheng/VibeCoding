"""混合检索 RRF 融合逻辑单元测试。"""

from langchain_core.documents import Document

from app.rag.retriever import _rrf_fuse


def _doc(key: str, content: str) -> Document:
    return Document(page_content=content, metadata={"chunk_id": key})


def test_rrf_fuses_and_dedupes():
    a = _doc("1", "内容A")
    b = _doc("2", "内容B")
    c = _doc("3", "内容C")
    # chunk "1" 同时出现在两路召回中，应去重且排名更靠前
    fused = _rrf_fuse([[a, b], [a, c]])
    keys = [d.metadata["chunk_id"] for d in fused]
    assert keys[0] == "1"
    assert set(keys) == {"1", "2", "3"}


def test_rrf_empty_input():
    assert _rrf_fuse([]) == []
