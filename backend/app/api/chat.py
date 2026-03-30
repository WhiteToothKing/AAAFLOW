"""
Chat API: Multi-turn conversation with the AI agent.
Supports SSE streaming for real-time responses.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.models.chat import ChatSession
from app.models.user import User
from app.schemas.chat import (
    ChatMessageCreate, ChatSessionCreate,
    ChatSessionResponse, ChatSessionListItem,
)
from app.services.chat_service import chat_service
from app.services.skill_registry import skill_registry
from app.api.deps import get_current_user, require_not_readonly

router = APIRouter(prefix="/chat", tags=["chat"])


def _validate_llm_credentials(provider: str) -> None:
    p = provider.lower().strip()
    if p == "openai" and not (settings.OPENAI_API_KEY or "").strip():
        raise HTTPException(
            status_code=400,
            detail="服务端未配置 OPENAI_API_KEY，无法使用 OpenAI",
        )
    if p == "anthropic" and not (settings.ANTHROPIC_API_KEY or "").strip():
        raise HTTPException(
            status_code=400,
            detail="服务端未配置 ANTHROPIC_API_KEY，无法使用 Claude",
        )


@router.get("/llm-options")
async def chat_llm_options():
    ant_ok = bool((settings.ANTHROPIC_API_KEY or "").strip())
    oai_ok = bool((settings.OPENAI_API_KEY or "").strip())
    return {
        "default_provider": (settings.DEFAULT_LLM_PROVIDER or "anthropic").lower(),
        "default_models": {
            "anthropic": settings.ANTHROPIC_MODEL,
            "openai": settings.OPENAI_CHAT_MODEL,
        },
        "providers": [
            {
                "id": "anthropic",
                "label": "Anthropic (Claude)",
                "available": ant_ok,
                "models": (
                    [{"id": settings.ANTHROPIC_MODEL, "label": settings.ANTHROPIC_MODEL}]
                    if ant_ok
                    else []
                ),
            },
            {
                "id": "openai",
                "label": "OpenAI",
                "available": oai_ok,
                "models": (
                    [
                        {"id": "gpt-4o", "label": "GPT-4o"},
                        {"id": "gpt-4o-mini", "label": "GPT-4o mini"},
                    ]
                    if oai_ok
                    else []
                ),
            },
        ],
    }


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_session(
    payload: ChatSessionCreate,
    user: User = Depends(require_not_readonly),
    db: AsyncSession = Depends(get_db),
):
    prov = chat_service._normalize_provider(payload.llm_provider)
    _validate_llm_credentials(prov)
    session = await chat_service.create_session(
        db=db,
        title=payload.title,
        task_id=payload.task_id,
        llm_provider=payload.llm_provider,
        llm_model=payload.llm_model,
    )
    return session


@router.get("/sessions", response_model=list[ChatSessionListItem])
async def list_sessions(
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sessions = await chat_service.list_sessions(db, limit=limit)
    result = []
    for s in sessions:
        last_preview = None
        if s.messages:
            last_msg = s.messages[-1]
            last_preview = last_msg.content[:100] if last_msg.content else None
        result.append(
            ChatSessionListItem(
                id=s.id,
                title=s.title,
                task_id=s.task_id,
                is_active=s.is_active,
                llm_provider=s.llm_provider,
                llm_model=s.llm_model,
                message_count=len(s.messages),
                last_message_preview=last_preview,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
        )
    return result


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await chat_service.get_session(session_id, db)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: uuid.UUID,
    user: User = Depends(require_not_readonly),
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(ChatSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_active = False
    await db.commit()


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: uuid.UUID,
    payload: ChatMessageCreate,
    user: User = Depends(require_not_readonly),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and receive a streaming SSE response."""
    session = await chat_service.get_session(session_id, db)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    async def event_stream():
        async for chunk in chat_service.send_message(
            session_id=session_id,
            content=payload.content,
            image_urls=payload.image_urls,
            db=db,
        ):
            yield f"data: {chunk}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/skills")
async def list_skills(user: User = Depends(get_current_user)):
    """List all available skills the AI agent can invoke."""
    skills = skill_registry.list_skills()
    return {
        "skills": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "art_types": s.art_types,
                "art_styles": s.art_styles,
                "mode": s.mode.value,
                "provider": s.provider.value,
            }
            for s in skills
        ]
    }
