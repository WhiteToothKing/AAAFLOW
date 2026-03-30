"""Audit log read API — admin only."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse, AuditLogListResponse
from app.api.deps import require_admin

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[uuid.UUID] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    q = select(AuditLog)
    cq = select(func.count(AuditLog.id))
    if action:
        q = q.where(AuditLog.action == action)
        cq = cq.where(AuditLog.action == action)
    if resource_type:
        q = q.where(AuditLog.resource_type == resource_type)
        cq = cq.where(AuditLog.resource_type == resource_type)
    if user_id:
        q = q.where(AuditLog.user_id == user_id)
        cq = cq.where(AuditLog.user_id == user_id)

    total = (await db.execute(cq)).scalar() or 0
    q = q.order_by(desc(AuditLog.created_at)).offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(q)).scalars().all()

    logs = []
    for r in rows:
        d = AuditLogResponse.model_validate(r)
        if r.user:
            d.username = r.user.username
        logs.append(d)

    return AuditLogListResponse(logs=logs, total=total, page=page, page_size=page_size)
