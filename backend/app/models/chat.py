"""
Chat models: Multi-turn conversation between user and AI agent.
Each task can have a conversation thread. Messages track the full dialogue
including AI analysis, skill invocations, and generation results.
"""
import enum
import uuid
from typing import Optional

from sqlalchemy import String, Text, Integer, Enum, ForeignKey, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageType(str, enum.Enum):
    TEXT = "text"
    ANALYSIS = "analysis"
    SKILL_INVOKE = "skill_invoke"
    GENERATION_RESULT = "generation_result"
    ERROR = "error"


class ChatSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "chat_sessions"

    title: Mapped[str] = mapped_column(String(200), nullable=False, default="新对话")
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("art_tasks.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    llm_provider: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    llm_model: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    messages = relationship(
        "ChatMessage", back_populates="session", lazy="selectin",
        cascade="all, delete-orphan", order_by="ChatMessage.created_at",
    )
    task = relationship("ArtTask", lazy="selectin")


class ChatMessage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "chat_messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id"), nullable=False
    )
    role: Mapped[MessageRole] = mapped_column(Enum(MessageRole), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[MessageType] = mapped_column(
        Enum(MessageType), default=MessageType.TEXT, nullable=False
    )

    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    image_urls: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    session = relationship("ChatSession", back_populates="messages")
