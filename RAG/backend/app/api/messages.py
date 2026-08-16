"""消息接口：问答反馈。"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.deps import get_current_user
from ..database import get_db
from ..models import Conversation, Message, User
from ..schemas.conversation import FeedbackRequest, MessageOut

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.post("/{message_id}/feedback", response_model=MessageOut)
def set_feedback(
    message_id: int,
    req: FeedbackRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = db.get(Message, message_id)
    if not msg:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="消息不存在")
    conv = db.get(Conversation, msg.conversation_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="消息不存在")

    msg.feedback = req.feedback
    db.commit()
    db.refresh(msg)
    return msg
