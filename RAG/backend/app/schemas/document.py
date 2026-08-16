"""知识库文档相关模型。"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    file_type: str
    size: int
    status: str
    chunk_count: int
    error: Optional[str] = None
    created_at: datetime
