"""RAG 问答接口：SSE 流式返回（含限流）。"""

import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ..core.deps import get_current_user
from ..core.rate_limit import chat_limiter
from ..models import User
from ..schemas.conversation import ChatRequest
from ..services.chat_service import stream_chat

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/stream")
def chat_stream(req: ChatRequest, user: User = Depends(get_current_user)):
    chat_limiter.check(f"chat:{user.id}")

    def event_stream():
        for event in stream_chat(user.id, req.conversation_id, req.message):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
