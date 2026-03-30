"""Authentication routes: setup, login, me."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.schemas.user import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    SetupRequest,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/setup", response_model=TokenResponse)
async def setup_first_admin(
    body: SetupRequest,
    db: AsyncSession = Depends(get_db),
    x_setup_token: str | None = Header(None),
):
    """Create the first admin user. Only works when the users table is empty."""
    if settings.SETUP_TOKEN:
        if x_setup_token != settings.SETUP_TOKEN:
            raise HTTPException(status_code=403, detail="SETUP_TOKEN 不匹配")

    count = await db.scalar(select(func.count()).select_from(User))
    if count and count > 0:
        raise HTTPException(status_code=409, detail="已存在用户，无法通过 setup 创建")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=get_password_hash(body.password),
        full_name=body.full_name or body.username,
        role="admin",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id), extra_claims={"role": user.role})
    return TokenResponse(access_token=token, token_type="bearer")


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.username == body.username)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已停用")

    token = create_access_token(str(user.id), extra_claims={"role": user.role})
    return TokenResponse(access_token=token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user
