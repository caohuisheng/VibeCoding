"""聊天服务：检索 → 生成 → 落库，返回 SSE 事件流。

性能优化：对相同问题命中进程内缓存，直接返回缓存答案，减少 LLM 调用。
"""

from collections.abc import Generator
from typing import Any

from langchain_core.documents import Document

from ..core.cache import query_cache
from ..core.time import utcnow
from ..database import SessionLocal
from ..models import Conversation, Message
from ..rag.chain import build_chain, format_context
from ..rag.retriever import retrieve

_HISTORY_TURNS = 6  # 取最近 6 条消息作为上下文


def _normalize(text: str) -> str:
    return " ".join(text.lower().split())


def _get_or_create_conversation(db, user_id: int, conversation_id: int | None, title: str):
    if conversation_id:
        conv = db.get(Conversation, conversation_id)
        if conv and conv.user_id == user_id:
            return conv
    conv = Conversation(user_id=user_id, title=title or "新会话")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def _build_history(db, conversation_id: int) -> list[tuple[str, str]]:
    rows = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.id.desc())
        .limit(_HISTORY_TURNS)
        .all()
    )
    history = []
    for m in reversed(rows):
        role = "human" if m.role == "user" else "ai"
        history.append((role, m.content))
    return history


def _build_citation(doc: Document) -> dict[str, Any]:
    return {
        "document_id": doc.metadata.get("document_id"),
        "filename": doc.metadata.get("filename", ""),
        "chunk_index": doc.metadata.get("chunk_index", 0),
        "content": doc.page_content,
        "score": doc.metadata.get("rrf_score"),
    }


def stream_chat(
    user_id: int, conversation_id: int | None, message: str
) -> Generator[dict[str, Any], None, None]:
    """以 SSE 事件形式流式返回：sources → token* → done / error。"""
    db = SessionLocal()
    try:
        conv = _get_or_create_conversation(db, user_id, conversation_id, message[:20])
        history = _build_history(db, conv.id)

        # 保存用户消息
        db.add(Message(conversation_id=conv.id, role="user", content=message))
        db.commit()

        # 命中缓存则直接返回
        cached = query_cache.get(_normalize(message))
        if cached is not None:
            answer, citations = cached
            yield {"type": "sources", "data": citations}
            yield {"type": "token", "data": answer}
        else:
            sources = retrieve(message)
            citations = [_build_citation(d) for d in sources]
            yield {"type": "sources", "data": citations}

            context = format_context(sources)
            chain = build_chain()
            answer_parts: list[str] = []
            for chunk in chain.stream(
                {"context": context, "question": message, "history": history}
            ):
                answer_parts.append(chunk)
                yield {"type": "token", "data": chunk}
            answer = "".join(answer_parts)
            query_cache.set(_normalize(message), (answer, citations))

        # 保存助手消息
        msg = Message(
            conversation_id=conv.id,
            role="assistant",
            content=answer,
            citations=citations,
        )
        db.add(msg)
        if conv.title == "新会话":
            conv.title = message[:20]
        conv.updated_at = utcnow()
        db.commit()
        db.refresh(msg)

        yield {
            "type": "done",
            "data": {"conversation_id": conv.id, "message_id": msg.id},
        }
    except Exception as exc:  # noqa: BLE001
        yield {"type": "error", "data": str(exc)[:500]}
    finally:
        db.close()
