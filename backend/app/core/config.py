from pydantic import model_validator
from pydantic_settings import BaseSettings
from typing import Optional


_DEV_JWT_PLACEHOLDER = "dev-secret-key-change-in-production"


class Settings(BaseSettings):
    APP_NAME: str = "AAAFLOW"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/gameart_ai"
    REDIS_URL: str = "redis://localhost:6379/0"

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    OPENAI_API_KEY: str = ""
    OPENAI_CHAT_MODEL: str = "gpt-4o"
    DALL_E_MODEL: str = "dall-e-3"

    # anthropic | openai — used when session has no llm_provider set
    DEFAULT_LLM_PROVIDER: str = "anthropic"

    COMFYUI_API_URL: str = "http://localhost:8188"
    COMFYUI_WS_URL: str = "ws://localhost:8188/ws"

    UPLOAD_DIR: str = "./uploads"
    OUTPUT_DIR: str = "./outputs"
    MAX_UPLOAD_SIZE_MB: int = 50

    JWT_SECRET_KEY: str = _DEV_JWT_PLACEHOLDER
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # 内网私有化：首个组织 UUID（与迁移中默认组织一致）
    DEFAULT_ORGANIZATION_ID: str = "11111111-1111-1111-1111-111111111111"
    # 若设置，则允许携带 X-Setup-Token 调用 POST /auth/setup 创建首个管理员（仅当 users 表为空）
    SETUP_TOKEN: str = ""

    CORS_ALLOW_ALL: bool = False
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    EXPOSE_OPENAPI: bool = True

    # True：关闭 /static 直出，仅允许登录用户通过 /api/files/{uploads|outputs}/{filename} 访问（支持 ?access_token= 供 img src）
    STATIC_REQUIRE_AUTH: bool = False

    # True：启动时强制校验 JWT/SETUP 强度（生产/等保部署请开启）
    PRODUCTION_MODE: bool = False

    # True：本地联调时跳过 JWT；固定使用库中最早创建的一名活跃用户（切勿在生产开启；PRODUCTION_MODE=true 时禁止）
    AUTH_DISABLED: bool = False

    GEMINI_API_KEY: str = ""
    # Nano Banana 2 — text+image output; use AI Studio key with billing if marked Paid
    GEMINI_MODEL: str = "gemini-3.1-flash-image-preview"

    MIDJOURNEY_API_URL: Optional[str] = None
    MIDJOURNEY_API_KEY: Optional[str] = None

    JIMENG_ACCESS_KEY: str = ""
    JIMENG_SECRET_KEY: str = ""
    JIMENG_MODEL: str = "jimeng-2.1-pro"

    MINIMAX_API_KEY: str = ""
    MINIMAX_MODEL: str = "image-01"

    BANANA_API_KEY: str = ""
    BANANA_MODEL: str = "banana-pro"

    # Figma → frontend（npm run figma:sync）；仅脚本/同步使用，可为空
    FIGMA_ACCESS_TOKEN: str = ""
    FIGMA_FILE_KEY: str = ""
    FIGMA_SHELL_NODE_ID: str = ""
    FIGMA_CLIENT_SCREENS_NODE_ID: str = ""

    model_config = {"env_file": ".env", "case_sensitive": True}

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.PRODUCTION_MODE and self.AUTH_DISABLED:
            raise ValueError("PRODUCTION_MODE=true 时不可设置 AUTH_DISABLED=true")
        if not self.PRODUCTION_MODE:
            return self
        if len(self.JWT_SECRET_KEY) < 32:
            raise ValueError(
                "PRODUCTION_MODE=true 时 JWT_SECRET_KEY 长度须至少 32 字符"
            )
        if self.JWT_SECRET_KEY == _DEV_JWT_PLACEHOLDER:
            raise ValueError("PRODUCTION_MODE=true 时不可使用默认 JWT_SECRET_KEY")
        st = (self.SETUP_TOKEN or "").strip()
        if st and len(st) < 16:
            raise ValueError(
                "PRODUCTION_MODE=true 且设置了 SETUP_TOKEN 时，SETUP_TOKEN 长度须至少 16 字符"
            )
        return self


settings = Settings()
