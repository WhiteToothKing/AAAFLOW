"""
Agent Orchestrator: The central intelligence that coordinates the full pipeline —
  1. Receives a task
  2. Calls Claude to analyze the requirement
  3. Delegates routing to RoutingService
  4. Dispatches generation and collects results
  5. Persists everything to the database
"""
import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import (
    ArtTask, GenerationResult,
    TaskStatus, GenerationMode, GenerationProvider,
)
from app.schemas.task import AIAnalysisResponse
from app.services.claude_analyzer import claude_analyzer
from app.services.routing_service import routing_service
from app.services.skill_registry import skill_registry
from app.services.image_generator import image_generator_service
from app.services.comfyui_service import comfyui_service
from app.core.redis import get_redis

logger = logging.getLogger(__name__)


class AgentOrchestrator:

    async def process_task(self, task_id: uuid.UUID, db: AsyncSession) -> ArtTask:
        task = await db.get(ArtTask, task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        try:
            task.status = TaskStatus.ANALYZING
            await db.commit()
            await self._broadcast_status(task)

            analysis = await self._analyze(task)

            task.ai_analysis = {
                "art_type": analysis.art_type.value,
                "art_style": analysis.art_style.value,
                "recommended_mode": analysis.recommended_mode.value,
                "recommended_provider": analysis.recommended_provider.value,
                "complexity": analysis.complexity,
                "confidence": analysis.confidence,
                "reasoning": analysis.reasoning,
            }
            task.optimized_prompt = analysis.optimized_prompt
            task.negative_prompt = analysis.negative_prompt
            task.tags = analysis.tags

            if not task.art_type:
                task.art_type = analysis.art_type
            if not task.art_style:
                task.art_style = analysis.art_style
            if not task.width:
                task.width = analysis.recommended_size.get("width", 1024)
            if not task.height:
                task.height = analysis.recommended_size.get("height", 1024)

            task.status = TaskStatus.ROUTING
            await db.commit()
            await self._broadcast_status(task)

            decision = routing_service.route(
                analysis=analysis,
                user_mode=task.generation_mode,
                user_provider=task.generation_provider,
            )
            task.generation_mode = decision.mode
            task.generation_provider = decision.provider
            task.ai_analysis["routing_reason"] = decision.reason

            task.status = TaskStatus.GENERATING
            await db.commit()
            await self._broadcast_status(task)

            results = await self._generate(task, decision.provider)
            self._persist_results(db, task, results)

            task.status = TaskStatus.REVIEW
            await db.commit()
            await self._broadcast_status(task)

            await db.refresh(task)
            return task

        except Exception as e:
            logger.exception(f"Task {task_id} failed: {e}")
            task.status = TaskStatus.FAILED
            task.ai_analysis = task.ai_analysis or {}
            task.ai_analysis["error"] = str(e)
            await db.commit()
            await self._broadcast_status(task)
            raise

    async def _analyze(self, task: ArtTask) -> AIAnalysisResponse:
        size = None
        if task.width and task.height:
            size = {"width": task.width, "height": task.height}

        return await claude_analyzer.analyze_requirement(
            title=task.title,
            description=task.description,
            reference_image_urls=task.reference_images or [],
            tags=task.tags or [],
            requested_size=size,
        )

    async def _generate(
        self,
        task: ArtTask,
        provider: GenerationProvider,
    ) -> list[dict]:
        prompt = task.optimized_prompt or task.description
        negative = task.negative_prompt or ""
        w = task.width or 1024
        h = task.height or 1024
        n = task.num_variations

        if provider in (
            GenerationProvider.COMFYUI_LOCAL,
            GenerationProvider.COMFYUI_CLOUD,
            GenerationProvider.STABLE_DIFFUSION,
        ):
            workflow_json = await self._resolve_workflow(task)
            return await comfyui_service.generate(
                prompt=prompt,
                negative_prompt=negative,
                width=w,
                height=h,
                num_images=n,
                workflow_json=workflow_json,
            )
        else:
            return await image_generator_service.generate(
                provider=provider,
                prompt=prompt,
                negative_prompt=negative,
                width=w,
                height=h,
                num_images=n,
            )

    async def _resolve_workflow(self, task: ArtTask) -> dict | None:
        """Find the best matching DB workflow for this task's type/style."""
        art_type = task.art_type.value if task.art_type else None
        art_style = task.art_style.value if task.art_style else None
        skills = skill_registry.find_skills(art_type=art_type, art_style=art_style)
        if skills:
            from app.core.database import async_session_factory
            async with async_session_factory() as db:
                return await skill_registry.resolve_workflow(
                    skills[0], db,
                    art_type=art_type,
                    art_style=art_style,
                )
        return None

    @staticmethod
    def _persist_results(
        db: AsyncSession,
        task: ArtTask,
        results: list[dict],
    ):
        for r in results:
            gen_result = GenerationResult(
                task_id=task.id,
                image_url=r["image_url"],
                provider=r["provider"],
                generation_params=r.get("params"),
                generation_time_seconds=r.get("generation_time_seconds"),
            )
            db.add(gen_result)

    async def _broadcast_status(self, task: ArtTask):
        payload = {
            "task_id": str(task.id),
            "status": task.status.value,
            "title": task.title,
        }
        try:
            redis = await get_redis()
            await redis.publish(f"task:{task.id}:status", task.status.value)
        except Exception as e:
            logger.warning(f"Redis broadcast failed: {e}")
        try:
            from app.api.ws import ws_manager
            await ws_manager.broadcast("task_status", payload)
        except Exception as e:
            logger.warning(f"WS broadcast failed: {e}")

    async def regenerate_task(
        self,
        task_id: uuid.UUID,
        db: AsyncSession,
        feedback: str | None = None,
    ) -> ArtTask:
        task = await db.get(ArtTask, task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        if feedback and task.optimized_prompt:
            refined = await claude_analyzer.refine_prompt(
                task.optimized_prompt, feedback
            )
            task.optimized_prompt = refined.get(
                "optimized_prompt", task.optimized_prompt
            )
            task.negative_prompt = refined.get(
                "negative_prompt", task.negative_prompt
            )

        task.status = TaskStatus.GENERATING
        await db.commit()
        await self._broadcast_status(task)

        provider = task.generation_provider or GenerationProvider.DALL_E
        results = await self._generate(task, provider)
        self._persist_results(db, task, results)

        task.status = TaskStatus.REVIEW
        await db.commit()
        await self._broadcast_status(task)

        await db.refresh(task)
        return task


agent_orchestrator = AgentOrchestrator()
