from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/health/detailed")
async def detailed_health():
    checks = {
        "app": "ok",
        "database": await _check_db(),
        "redis": await _check_redis(),
        "comfyui": await _check_comfyui(),
    }
    all_ok = all(v == "ok" for v in checks.values())
    return {"status": "healthy" if all_ok else "degraded", "checks": checks}


async def _check_db() -> str:
    try:
        from app.core.database import engine
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return "ok"
    except Exception as e:
        return f"error: {e}"


async def _check_redis() -> str:
    try:
        from app.core.redis import get_redis
        r = await get_redis()
        await r.ping()
        return "ok"
    except Exception as e:
        return f"error: {e}"


async def _check_comfyui() -> str:
    try:
        from app.services.comfyui_service import comfyui_service
        await comfyui_service.get_system_stats()
        return "ok"
    except Exception as e:
        return f"unavailable: {e}"
