import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.task import ComfyUIWorkflow
from app.schemas.workflow import WorkflowCreate, WorkflowResponse, WorkflowUpdate

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    payload: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
):
    workflow = ComfyUIWorkflow(
        name=payload.name,
        description=payload.description,
        workflow_json=payload.workflow_json,
        art_types=payload.art_types,
        art_styles=payload.art_styles,
        version=payload.version,
    )
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    return workflow


@router.get("", response_model=list[WorkflowResponse])
async def list_workflows(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    query = select(ComfyUIWorkflow)
    if active_only:
        query = query.where(ComfyUIWorkflow.is_active == True)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    wf = await db.get(ComfyUIWorkflow, workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.patch("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: uuid.UUID,
    payload: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
):
    wf = await db.get(ComfyUIWorkflow, workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(wf, field, value)

    await db.commit()
    await db.refresh(wf)
    return wf


@router.delete("/{workflow_id}", status_code=204)
async def delete_workflow(
    workflow_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    wf = await db.get(ComfyUIWorkflow, workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    await db.delete(wf)
    await db.commit()
