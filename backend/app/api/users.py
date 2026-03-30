"""User management — admin-only CRUD."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserUpdateAdmin,
    UserListResponse,
    UserProfileSelfUpdate,
    PasswordChangeRequest,
)
from app.api.deps import require_admin, get_current_user
from app.services import audit_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(User)
    cq = select(func.count(User.id))
    if role:
        q = q.where(User.role == role)
        cq = cq.where(User.role == role)
    total = (await db.execute(cq)).scalar() or 0
    q = q.order_by(desc(User.created_at)).offset((page - 1) * page_size).limit(page_size)
    users = (await db.execute(q)).scalars().all()
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    payload: UserCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    exists = await db.execute(
        select(User).where((User.username == payload.username) | (User.email == payload.email))
    )
    if exists.scalar_one_or_none():
        raise HTTPException(400, "用户名或邮箱已存在")
    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        department=payload.department,
    )
    db.add(user)
    await db.flush()
    await audit_service.record(
        db, action="create_user", resource_type="user",
        resource_id=str(user.id), user_id=admin.id,
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdateAdmin,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    data = payload.model_dump(exclude_unset=True)
    if "password" in data:
        pw = data.pop("password")
        if pw:
            user.hashed_password = get_password_hash(pw)
    for k, v in data.items():
        setattr(user, k, v)
    await audit_service.record(
        db, action="update_user", resource_type="user",
        resource_id=str(user_id), user_id=admin.id,
        detail=f"fields={list(data.keys())}",
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def deactivate_user(
    user_id: uuid.UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    if user.id == admin.id:
        raise HTTPException(400, "不能停用自己的账号")
    user.is_active = False
    await audit_service.record(
        db, action="deactivate_user", resource_type="user",
        resource_id=str(user_id), user_id=admin.id,
    )
    await db.commit()


@router.get("/me/profile", response_model=UserResponse)
async def my_profile(user: User = Depends(get_current_user)):
    return user


@router.patch("/me/profile", response_model=UserResponse)
async def update_my_profile(
    payload: UserProfileSelfUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(user, k, v)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/me/password", status_code=204)
async def change_my_password(
    payload: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="当前密码不正确")
    user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()
