import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.task import ArtTask, GenerationResult, TaskStatus
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskResponse,
    TaskListResponse, ResultFeedback,
)
from app.services.agent_orchestrator import agent_orchestrator

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    payload: TaskCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    task = ArtTask(
        title=payload.title,
        description=payload.description,
        art_type=payload.art_type,
        art_style=payload.art_style,
        generation_mode=payload.generation_mode,
        generation_provider=payload.generation_provider,
        width=payload.width,
        height=payload.height,
        num_variations=payload.num_variations,
        reference_images=payload.reference_images,
        tags=payload.tags,
        priority=payload.priority,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    background_tasks.add_task(_process_task_bg, task.id)

    return task


async def _process_task_bg(task_id: uuid.UUID):
    from app.core.database import async_session_factory
    async with async_session_factory() as db:
        try:
            await agent_orchestrator.process_task(task_id, db)
        except Exception as e:
            import logging
            logging.getLogger(__name__).exception(f"Background task {task_id} failed")


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[TaskStatus] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(ArtTask)
    count_query = select(func.count(ArtTask.id))

    if status:
        query = query.where(ArtTask.status == status)
        count_query = count_query.where(ArtTask.status == status)

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(desc(ArtTask.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    tasks = result.scalars().all()

    return TaskListResponse(
        tasks=[TaskResponse.model_validate(t) for t in tasks],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    task = await db.get(ArtTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    task = await db.get(ArtTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    task = await db.get(ArtTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()


@router.post("/{task_id}/regenerate", response_model=TaskResponse)
async def regenerate_task(
    task_id: uuid.UUID,
    feedback: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
):
    task = await db.get(ArtTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    background_tasks.add_task(_regenerate_task_bg, task_id, feedback)
    task.status = TaskStatus.GENERATING
    await db.commit()
    await db.refresh(task)
    return task


async def _regenerate_task_bg(task_id: uuid.UUID, feedback: Optional[str]):
    from app.core.database import async_session_factory
    async with async_session_factory() as db:
        try:
            await agent_orchestrator.regenerate_task(task_id, db, feedback)
        except Exception:
            import logging
            logging.getLogger(__name__).exception(f"Regeneration {task_id} failed")


@router.post(
    "/{task_id}/results/{result_id}/feedback",
    response_model=dict,
)
async def submit_feedback(
    task_id: uuid.UUID,
    result_id: uuid.UUID,
    payload: ResultFeedback,
    db: AsyncSession = Depends(get_db),
):
    result = await db.get(GenerationResult, result_id)
    if not result or result.task_id != task_id:
        raise HTTPException(status_code=404, detail="Result not found")

    if payload.rating is not None:
        result.rating = payload.rating
    if payload.feedback is not None:
        result.feedback = payload.feedback
    if payload.is_selected:
        stmt = (
            select(GenerationResult)
            .where(GenerationResult.task_id == task_id)
            .where(GenerationResult.is_selected == True)
        )
        existing = (await db.execute(stmt)).scalars().all()
        for r in existing:
            r.is_selected = False
        result.is_selected = True

    await db.commit()
    return {"status": "ok"}
