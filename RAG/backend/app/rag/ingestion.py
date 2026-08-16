"""文档入库管线：解析 → 切分 → 向量化 → 更新状态（后台线程执行）。"""

import threading

from ..database import SessionLocal
from ..models import Document as DocumentModel
from .loader import load_document
from .splitter import get_splitter
from .vector_store import add_documents, bump_version


def ingest_document_async(document_id: int, file_bytes: bytes, filename: str) -> None:
    """在新线程中执行入库，避免阻塞上传接口。"""
    thread = threading.Thread(
        target=ingest_document,
        args=(document_id, file_bytes, filename),
        daemon=True,
    )
    thread.start()


def ingest_document(document_id: int, file_bytes: bytes, filename: str) -> None:
    db = SessionLocal()
    try:
        doc = db.get(DocumentModel, document_id)
        if doc is None:
            return
        try:
            doc.status = "processing"
            doc.error = None
            db.commit()

            raw_docs = load_document(file_bytes, filename)
            if not raw_docs:
                raise ValueError("文档内容为空，无法解析")

            chunks = get_splitter().split_documents(raw_docs)
            for i, chunk in enumerate(chunks):
                chunk.metadata.update(
                    {
                        "document_id": document_id,
                        "filename": filename,
                        "chunk_index": i,
                        "chunk_id": f"{document_id}:{i}",
                    }
                )

            add_documents(chunks)
            bump_version()

            doc.status = "done"
            doc.chunk_count = len(chunks)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            doc.status = "failed"
            doc.error = str(exc)[:500]
            db.commit()
    finally:
        db.close()
