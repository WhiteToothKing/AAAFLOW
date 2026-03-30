import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Header, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import safe_decode_token
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def _dev_bypass_user(db: AsyncSession) -> User:
    result = await db.execute(
        select(User)
        .where(User.is_active.is_(True))
        .order_by(User.created_at.asc())
        .limit(1)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "AUTH_DISABLED 已开启但数据库中无活跃用户；"
                "请先执行 POST /api/auth/setup 创建首个账号，或关闭 AUTH_DISABLED"
            ),
        )
    return user


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    creds: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ] = None,
) -> User:
    if settings.AUTH_DISABLED:
        return await _dev_bypass_user(db)
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="未登录或令牌缺失")
    payload = safe_decode_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="令牌无效或已过期")
    try:
        uid = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="令牌无效")
    user = await db.get(User, uid)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不可用")
    return user


async def get_current_user_bearer_or_query(
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
    access_token: Annotated[str | None, Query()] = None,
) -> User:
    """Authorization: Bearer … 或查询参数 access_token（供 <img src> 内网场景）。"""
    raw: str | None = None
    if authorization:
        auth = authorization.strip()
        if auth.lower().startswith("bearer "):
            raw = auth[7:].strip()
    if raw is None and access_token:
        raw = access_token.strip()
    if settings.AUTH_DISABLED:
        return await _dev_bypass_user(db)
    if not raw:
        raise HTTPException(status_code=401, detail="未登录或令牌缺失")
    payload = safe_decode_token(raw)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="令牌无效或已过期")
    try:
        uid = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(status_code=401, detail="令牌无效")
    user = await db.get(User, uid)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不可用")
    return user


def require_roles(*roles: str):
    async def _dep(user: User = Depends(get_current_user)) -> User:
        if settings.AUTH_DISABLED:
            return user
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="权限不足")
        return user

    return _dep


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if settings.AUTH_DISABLED:
        return user
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


async def require_not_readonly(user: User = Depends(get_current_user)) -> User:
    if settings.AUTH_DISABLED:
        return user
    if user.role == "readonly":
        raise HTTPException(status_code=403, detail="只读账号不可执行此操作")
    return user
