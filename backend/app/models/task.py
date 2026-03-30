import enum
import uuid
from typing import Optional

from sqlalchemy import String, Text, Integer, Float, Enum, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDPrimaryKeyMixin, TimestampMixin


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    ANALYZING = "analyzing"
    ROUTING = "routing"
    GENERATING = "generating"
    REVIEW = "review"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ArtType(str, enum.Enum):
    CHARACTER = "character"
    SCENE = "scene"
    PROP = "prop"
    UI = "ui"
    CONCEPT = "concept"
    TEXTURE = "texture"
    ICON = "icon"
    POSTER = "poster"
    OTHER = "other"


class ArtStyle(str, enum.Enum):
    REALISTIC = "realistic"
    CARTOON = "cartoon"
    ANIME = "anime"
    PIXEL = "pixel"
    LOW_POLY = "low_poly"
    HAND_PAINTED = "hand_painted"
    FLAT = "flat"
    SEMI_REALISTIC = "semi_realistic"
    OTHER = "other"


class GenerationMode(str, enum.Enum):
    API = "api"
    COMFYUI = "comfyui"


class GenerationProvider(str, enum.Enum):
    DALL_E = "dall_e"
    GEMINI = "gemini"
    MIDJOURNEY = "midjourney"
    STABLE_DIFFUSION = "stable_diffusion"
    COMFYUI_LOCAL = "comfyui_local"
    COMFYUI_CLOUD = "comfyui_cloud"
    JIMENG = "jimeng"
    MINIMAX = "minimax"
    BANANA = "banana"


class ArtTask(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "art_tasks"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False
    )

    art_type: Mapped[Optional[ArtType]] = mapped_column(Enum(ArtType), nullable=True)
    art_style: Mapped[Optional[ArtStyle]] = mapped_column(Enum(ArtStyle), nullable=True)
    generation_mode: Mapped[Optional[GenerationMode]] = mapped_column(
        Enum(GenerationMode), nullable=True
    )
    generation_provider: Mapped[Optional[GenerationProvider]] = mapped_column(
        Enum(GenerationProvider), nullable=True
    )

    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    num_variations: Mapped[int] = mapped_column(Integer, default=4)

    reference_images: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True, default=list
    )
    tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    ai_analysis: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    optimized_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    negative_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    priority: Mapped[int] = mapped_column(Integer, default=0)

    creator_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    creator = relationship("User", back_populates="tasks", lazy="selectin")
    results = relationship(
        "GenerationResult", back_populates="task", lazy="selectin",
        cascade="all, delete-orphan"
    )


class GenerationResult(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "generation_results"

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("art_tasks.id"), nullable=False
    )

    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    provider: Mapped[GenerationProvider] = mapped_column(
        Enum(GenerationProvider), nullable=False
    )
    generation_params: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    generation_time_seconds: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )

    is_selected: Mapped[bool] = mapped_column(default=False)
    rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    task = relationship("ArtTask", back_populates="results")


class ComfyUIWorkflow(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "comfyui_workflows"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    workflow_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    art_types: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    art_styles: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    is_active: Mapped[bool] = mapped_column(default=True)
    version: Mapped[str] = mapped_column(String(20), default="1.0")
