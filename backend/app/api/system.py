"""System configuration and status API — admin only."""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.task import ArtTask, TaskStatus
from app.models.audit_log import AuditLog
from app.services.routing_service import routing_service
from app.api.deps import require_admin, get_current_user

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/config")
async def get_system_config(admin: User = Depends(require_admin)):
    """Non-secret runtime configuration visible to admins."""
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "debug": settings.DEBUG,
        "auth_disabled": settings.AUTH_DISABLED,
        "production_mode": settings.PRODUCTION_MODE,
        "cors_allow_all": settings.CORS_ALLOW_ALL,
        "cors_origins": settings.CORS_ORIGINS,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
        "default_llm_provider": settings.DEFAULT_LLM_PROVIDER,
        "comfyui_api_url": settings.COMFYUI_API_URL,
        "providers_configured": {
            "anthropic": bool(settings.ANTHROPIC_API_KEY),
            "openai": bool(settings.OPENAI_API_KEY),
            "gemini": bool(settings.GEMINI_API_KEY),
            "midjourney": bool(settings.MIDJOURNEY_API_KEY),
            "jimeng": bool(settings.JIMENG_ACCESS_KEY and settings.JIMENG_SECRET_KEY),
            "minimax": bool(settings.MINIMAX_API_KEY),
            "banana": bool(settings.BANANA_API_KEY),
        },
    }


@router.get("/stats")
async def get_system_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate counts for the dashboard."""
    total_tasks = (await db.execute(select(func.count(ArtTask.id)))).scalar() or 0
    pending = (
        await db.execute(
            select(func.count(ArtTask.id)).where(ArtTask.status == TaskStatus.PENDING)
        )
    ).scalar() or 0
    generating = (
        await db.execute(
            select(func.count(ArtTask.id)).where(ArtTask.status == TaskStatus.GENERATING)
        )
    ).scalar() or 0
    completed = (
        await db.execute(
            select(func.count(ArtTask.id)).where(ArtTask.status == TaskStatus.COMPLETED)
        )
    ).scalar() or 0
    failed = (
        await db.execute(
            select(func.count(ArtTask.id)).where(ArtTask.status == TaskStatus.FAILED)
        )
    ).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    return {
        "tasks": {"total": total_tasks, "pending": pending, "generating": generating, "completed": completed, "failed": failed},
        "users": {"total": total_users},
        "available_providers": routing_service.get_available_providers(),
    }
