import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.redis import close_redis
from app.api import auth, tasks, workflows, upload, health, analyze, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    yield
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

_cors_origins = (
    ["*"]
    if settings.CORS_ALLOW_ALL
    else [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(workflows.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(analyze.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

if os.path.isdir(settings.UPLOAD_DIR):
    app.mount(
        "/static/uploads",
        StaticFiles(directory=settings.UPLOAD_DIR),
        name="uploads",
    )

if os.path.isdir(settings.OUTPUT_DIR):
    app.mount(
        "/static/outputs",
        StaticFiles(directory=settings.OUTPUT_DIR),
        name="outputs",
    )


@app.get("/api/comfyui/image")
async def proxy_comfyui_image(filename: str, subfolder: str = "", type: str = "output"):
    """Proxy ComfyUI images to the browser to avoid cross-origin issues."""
    from fastapi.responses import Response
    from app.services.comfyui_service import comfyui_service, ComfyUIConnectionError
    try:
        data = await comfyui_service.fetch_image(filename, subfolder, type)
        media_type = "image/png"
        if filename.endswith(".jpg") or filename.endswith(".jpeg"):
            media_type = "image/jpeg"
        elif filename.endswith(".webp"):
            media_type = "image/webp"
        return Response(content=data, media_type=media_type)
    except ComfyUIConnectionError:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail="ComfyUI server unreachable")
    except Exception:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Image not found")
