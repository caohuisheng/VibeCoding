"""文本切分单元测试。"""

from app.rag.splitter import get_splitter


def test_splitter_chunks_long_text():
    splitter = get_splitter()
    text = "这是第一句话。这是第二句话。" * 100
    chunks = splitter.split_text(text)
    assert len(chunks) > 1
    # 每个分块长度不应超过 chunk_size（留少量余量给重叠与标点）
    assert all(len(c) <= 600 for c in chunks)
