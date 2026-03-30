import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.task import (
    TaskStatus, ArtType, ArtStyle,
    GenerationMode, GenerationProvider,
)


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    art_type: Optional[ArtType] = None
    art_style: Optional[ArtStyle] = None
    generation_mode: Optional[GenerationMode] = None
    generation_provider: Optional[GenerationProvider] = None
    width: Optional[int] = Field(None, ge=256, le=4096)
    height: Optional[int] = Field(None, ge=256, le=4096)
    num_variations: int = Field(4, ge=1, le=8)
    reference_images: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    priority: int = Field(0, ge=0, le=10)
    auto_process: Optional[bool] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    art_type: Optional[ArtType] = None
    art_style: Optional[ArtStyle] = None
    priority: Optional[int] = None


class GenerationResultResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    image_url: str
    thumbnail_url: Optional[str] = None
    provider: GenerationProvider
    generation_params: Optional[dict] = None
    generation_time_seconds: Optional[float] = None
    is_selected: bool = False
    rating: Optional[int] = None
    feedback: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    status: TaskStatus
    art_type: Optional[ArtType] = None
    art_style: Optional[ArtStyle] = None
    generation_mode: Optional[GenerationMode] = None
    generation_provider: Optional[GenerationProvider] = None
    width: Optional[int] = None
    height: Optional[int] = None
    num_variations: int
    reference_images: list[str] = []
    tags: list[str] = []
    ai_analysis: Optional[dict] = None
    optimized_prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    priority: int
    creator_id: Optional[uuid.UUID] = None
    results: list[GenerationResultResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int
    page: int
    page_size: int


class AIAnalysisResponse(BaseModel):
    art_type: ArtType
    art_style: ArtStyle
    recommended_mode: GenerationMode
    recommended_provider: GenerationProvider
    optimized_prompt: str
    negative_prompt: str
    recommended_size: dict
    tags: list[str]
    complexity: str
    confidence: float
    reasoning: str


class ResultFeedback(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None
    is_selected: bool = False
