"""文本切分策略：递归切分 + 中文标点分隔符 + 重叠窗口。"""

from functools import lru_cache

from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..config import settings


@lru_cache
def get_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=["\n\n", "\n", "。", "！", "？", "；", ". ", " ", ""],
    )
