"""使用统计接口。"""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.deps import get_current_user
from ..database import get_db
from ..models import Conversation, Document, Message, User

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("")
def get_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv_count = (
        db.query(func.count(Conversation.id))
        .filter(Conversation.user_id == user.id)
        .scalar()
        or 0
    )
    msg_count = (
        db.query(func.count(Message.id))
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(Conversation.user_id == user.id)
        .scalar()
        or 0
    )

    stats = {
        "username": user.username,
        "role": user.role,
        "conversations": conv_count,
        "messages": msg_count,
    }
    if user.role == "admin":
        stats["documents"] = db.query(func.count(Document.id)).scalar() or 0
        stats["chunks"] = (
            db.query(func.sum(Document.chunk_count)).scalar() or 0
        )
    return stats
