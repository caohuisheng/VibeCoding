"""会话/消息相关模型。"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ConversationCreate(BaseModel):
    title: str = Field(default="新会话", max_length=200)


class ConversationRename(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class Citation(BaseModel):
    """单条引用来源片段。"""

    document_id: Optional[int] = None
    filename: str = ""
    chunk_index: int = 0
    content: str = ""
    score: Optional[float] = None


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    citations: Optional[list] = None
    feedback: Optional[str] = None
    created_at: datetime


class ChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str = Field(min_length=1, max_length=4000)


class FeedbackRequest(BaseModel):
    feedback: str = Field(pattern=r"^(up|down)$")
