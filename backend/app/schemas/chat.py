import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.chat import MessageRole, MessageType


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    image_urls: list[str] = Field(default_factory=list)


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: MessageRole
    content: str
    message_type: MessageType
    metadata_json: Optional[dict] = None
    image_urls: list[str] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionCreate(BaseModel):
    title: str = Field("新对话", max_length=200)
    task_id: Optional[uuid.UUID] = None
    llm_provider: Optional[str] = Field(None, description="anthropic | openai")
    llm_model: Optional[str] = Field(None, max_length=128)


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    title: str
    task_id: Optional[uuid.UUID] = None
    is_active: bool
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    messages: list[ChatMessageResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionListItem(BaseModel):
    id: uuid.UUID
    title: str
    task_id: Optional[uuid.UUID] = None
    is_active: bool
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    message_count: int = 0
    last_message_preview: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
