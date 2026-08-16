"""知识库管理接口（仅管理员）：上传 / 列表 / 删除。"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..core.deps import require_admin
from ..database import get_db
from ..models import Document, User
from ..rag.ingestion import ingest_document_async
from ..rag.vector_store import bump_version, delete_by_document_id
from ..schemas.document import DocumentOut

router = APIRouter(prefix="/api/documents", tags=["documents"])

_ALLOWED = {"pdf", "docx", "md", "markdown", "txt", "text"}


@router.get("", response_model=list[DocumentOut])
def list_documents(
    _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    return db.query(Document).order_by(Document.id.desc()).all()


@router.post("/upload", response_model=DocumentOut, status_code=201)
def upload_document(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    filename = file.filename or "未命名"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in _ALLOWED:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail=f"不支持的文件类型: .{ext}"
        )

    data = file.file.read()
    doc = Document(filename=filename, file_type=ext, size=len(data), status="pending")
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 异步入库
    ingest_document_async(doc.id, data, filename)
    return doc


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="文档不存在")
    delete_by_document_id(document_id)
    bump_version()
    db.delete(doc)
    db.commit()
