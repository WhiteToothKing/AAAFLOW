"""
ChatService: Multi-turn conversation with the AI agent.

The agent can:
1. Analyze requirements in natural language
2. Recommend and invoke skills (generation pipelines)
3. Answer questions about art styles, workflows, etc.
4. Trigger image generation with the selected skill

Flow:
  User: "我需要一个Q版女战士角色" + [参考图]
  Agent: [分析需求] → 推荐使用"角色原画概念"技能 → 询问确认
  User: "好的，用动漫风格"
  Agent: [调用技能] → 生成图片 → 展示结果
  User: "盔甲颜色改成红色"
  Agent: [优化提示词] → 重新生成
"""
import json
import uuid
import logging
from typing import AsyncGenerator

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.chat import ChatSession, ChatMessage, MessageRole, MessageType
from app.models.task import (
    ArtTask, GenerationResult, TaskStatus,
    GenerationMode, GenerationProvider,
)
from app.services.skill_registry import skill_registry, Skill
from app.services.image_generator import image_generator_service
from app.services.comfyui_service import comfyui_service
from app.services.claude_analyzer import claude_analyzer
from app.services.llm_chat_stream import stream_anthropic, stream_openai

logger = logging.getLogger(__name__)

ALLOWED_PROVIDERS = frozenset({"anthropic", "openai"})

CHAT_SYSTEM_PROMPT = """你是一个专业的游戏美术AI助手，帮助外包公司的员工完成美术需求。

## 你的职责
1. 分析员工提交的美术需求（文字描述 + 参考图）
2. 推荐最适合的生成技能(skill)
3. 根据确认，调用对应技能生成图片
4. 根据反馈优化和重新生成

## 可用技能
{skills_description}

## 工作流程
1. 员工描述需求后，你先分析需求的类型、风格、复杂度
2. 推荐1-2个最合适的技能，解释为什么推荐
3. 员工确认后，你输出一个特殊格式来触发技能调用：
   ```skill_invoke
   {{"skill_id": "技能ID", "prompt": "优化后的英文提示词", "negative_prompt": "反向提示词", "width": 宽, "height": 高, "num_images": 数量}}
   ```
4. 生成结果出来后，根据员工反馈调整

## 对话规范
- 用中文和员工交流
- 第一次回复需分析需求并推荐技能，不要直接生成
- 等员工确认后再调用技能
- 提示词(prompt)必须用英文写，因为生图模型只接受英文
- 如果员工的需求不明确，主动询问细节（风格偏好、用途、尺寸等）
- 每次推荐时说明推荐理由"""


class ChatService:
    @staticmethod
    def _normalize_provider(name: str | None) -> str:
        p = (name or settings.DEFAULT_LLM_PROVIDER or "anthropic").lower().strip()
        return p if p in ALLOWED_PROVIDERS else "anthropic"

    @staticmethod
    def _resolve_model(session: ChatSession, provider: str) -> str:
        if session.llm_model and session.llm_model.strip():
            return session.llm_model.strip()
        if provider == "openai":
            return settings.OPENAI_CHAT_MODEL
        return settings.ANTHROPIC_MODEL

    async def create_session(
        self,
        db: AsyncSession,
        title: str = "新对话",
        task_id: uuid.UUID | None = None,
        llm_provider: str | None = None,
        llm_model: str | None = None,
    ) -> ChatSession:
        prov = self._normalize_provider(llm_provider)
        model = llm_model.strip() if llm_model and llm_model.strip() else None
        session = ChatSession(
            title=title,
            task_id=task_id,
            llm_provider=prov,
            llm_model=model,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    async def send_message(
        self,
        session_id: uuid.UUID,
        content: str,
        image_urls: list[str] | None = None,
        db: AsyncSession | None = None,
    ) -> AsyncGenerator[str, None]:
        """Send a user message and stream back the AI response.
        Yields chunks of the response text.
        If the response contains a skill_invoke block, executes it."""
        session = await db.get(ChatSession, session_id)
        if not session:
            yield json.dumps({"type": "error", "content": "会话不存在"})
            return

        user_msg = ChatMessage(
            session_id=session_id,
            role=MessageRole.USER,
            content=content,
            message_type=MessageType.TEXT,
            image_urls=image_urls or [],
        )
        db.add(user_msg)
        await db.commit()

        ordered_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        ordered = list(ordered_result.scalars().all())
        if not ordered:
            yield json.dumps({"type": "error", "content": "消息保存失败"})
            return
        prior = ordered[:-1]

        provider = self._normalize_provider(session.llm_provider)
        model = self._resolve_model(session, provider)

        if provider == "openai" and not (settings.OPENAI_API_KEY or "").strip():
            yield json.dumps({"type": "error", "content": "服务端未配置 OPENAI_API_KEY，无法使用 OpenAI 模型"})
            return
        if provider == "anthropic" and not (settings.ANTHROPIC_API_KEY or "").strip():
            yield json.dumps({"type": "error", "content": "服务端未配置 ANTHROPIC_API_KEY，无法使用 Claude"})
            return

        prior = sorted(session.messages, key=lambda m: m.created_at)
        prior = [m for m in prior if m.id != user_msg.id]

        system_prompt = CHAT_SYSTEM_PROMPT.format(
            skills_description=skill_registry.get_skills_description()
        )

        full_response = ""
        try:
            if provider == "openai":
                openai_messages = self._build_openai_messages(prior, content, image_urls)
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                async for text in stream_openai(client, model, system_prompt, openai_messages):
                    full_response += text
                    yield json.dumps({"type": "text", "content": text})
            else:
                anthropic_messages = self._build_anthropic_messages(prior, content, image_urls)
                client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
                async for text in stream_anthropic(client, model, system_prompt, anthropic_messages):
                    full_response += text
                    yield json.dumps({"type": "text", "content": text})

        except Exception as e:
            logger.exception(f"Chat stream error: {e}")
            yield json.dumps({"type": "error", "content": f"AI响应失败: {str(e)}"})
            return

        assistant_msg = ChatMessage(
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=full_response,
            message_type=MessageType.TEXT,
        )

        skill_block = self._extract_skill_invoke(full_response)
        if skill_block:
            assistant_msg.message_type = MessageType.SKILL_INVOKE
            assistant_msg.metadata_json = skill_block

            yield json.dumps({"type": "skill_start", "skill_id": skill_block.get("skill_id", ""), "content": "正在调用技能生成图片..."})

            try:
                results = await self._execute_skill(skill_block, session, db)
                for r in results:
                    yield json.dumps({"type": "generation_result", "image_url": r["image_url"], "provider": r["provider"].value if hasattr(r["provider"], "value") else str(r["provider"])})

                result_msg = ChatMessage(
                    session_id=session_id,
                    role=MessageRole.ASSISTANT,
                    content=f"已生成 {len(results)} 张图片",
                    message_type=MessageType.GENERATION_RESULT,
                    image_urls=[r["image_url"] for r in results],
                    metadata_json={"skill_id": skill_block.get("skill_id"), "count": len(results)},
                )
                db.add(result_msg)

                yield json.dumps({"type": "skill_done", "count": len(results)})
            except Exception as e:
                logger.exception(f"Skill execution error: {e}")
                error_msg = ChatMessage(
                    session_id=session_id,
                    role=MessageRole.ASSISTANT,
                    content=f"技能执行失败: {str(e)}",
                    message_type=MessageType.ERROR,
                )
                db.add(error_msg)
                yield json.dumps({"type": "error", "content": f"生成失败: {str(e)}"})

        db.add(assistant_msg)
        await db.commit()

        if session.title == "新对话" and len(session.messages) <= 2:
            session.title = content[:50]
            await db.commit()

        yield json.dumps({"type": "done"})

    @staticmethod
    def _user_blocks_anthropic(text: str, image_urls: list[str] | None) -> list[dict] | str:
        urls = [u for u in (image_urls or []) if u][:4]
        if not urls:
            return text
        blocks: list[dict] = []
        for url in urls:
            blocks.append({"type": "image", "source": {"type": "url", "url": url}})
        blocks.append({"type": "text", "text": text})
        return blocks

    @staticmethod
    def _user_blocks_openai(text: str, image_urls: list[str] | None) -> str | list[dict]:
        urls = [u for u in (image_urls or []) if u][:4]
        if not urls:
            return text
        parts: list[dict] = [{"type": "text", "text": text}]
        for url in urls:
            parts.append({"type": "image_url", "image_url": {"url": url}})
        return parts

    def _build_anthropic_messages(
        self,
        prior_messages: list[ChatMessage],
        current_content: str,
        current_images: list[str] | None,
    ) -> list[dict]:
        out: list[dict] = []
        for msg in prior_messages:
            if msg.role == MessageRole.SYSTEM:
                continue
            out.append({"role": msg.role.value, "content": msg.content})
        out.append({
            "role": "user",
            "content": self._user_blocks_anthropic(current_content, current_images),
        })
        return out

    def _build_openai_messages(
        self,
        prior_messages: list[ChatMessage],
        current_content: str,
        current_images: list[str] | None,
    ) -> list[dict]:
        out: list[dict] = []
        for msg in prior_messages:
            if msg.role == MessageRole.SYSTEM:
                continue
            out.append({"role": msg.role.value, "content": msg.content})
        out.append({
            "role": "user",
            "content": self._user_blocks_openai(current_content, current_images),
        })
        return out

    @staticmethod
    def _extract_skill_invoke(text: str) -> dict | None:
        marker = "```skill_invoke"
        if marker not in text:
            return None
        try:
            start = text.index(marker) + len(marker)
            end = text.index("```", start)
            json_str = text[start:end].strip()
            return json.loads(json_str)
        except (ValueError, json.JSONDecodeError) as e:
            logger.warning(f"Failed to parse skill_invoke block: {e}")
            return None

    async def _execute_skill(
        self,
        skill_block: dict,
        session: ChatSession,
        db: AsyncSession,
    ) -> list[dict]:
        skill_id = skill_block.get("skill_id", "general_api")
        skill = skill_registry.get_skill(skill_id)
        if not skill:
            skill = skill_registry.get_skill("general_api")

        prompt = skill_block.get("prompt", "")
        negative = skill_block.get("negative_prompt", "")
        width = skill_block.get("width", skill.default_params.get("width", 1024))
        height = skill_block.get("height", skill.default_params.get("height", 1024))
        num = skill_block.get("num_images", 2)

        if skill.mode == GenerationMode.COMFYUI:
            workflow_json = await skill_registry.resolve_workflow(
                skill, db,
                art_type=skill.art_types[0] if skill.art_types else None,
                art_style=skill.art_styles[0] if skill.art_styles else None,
            )
            results = await comfyui_service.generate(
                prompt=prompt,
                negative_prompt=negative,
                width=width,
                height=height,
                num_images=num,
                workflow_json=workflow_json,
            )
        else:
            provider = skill.provider
            results = await image_generator_service.generate(
                provider=provider,
                prompt=prompt,
                negative_prompt=negative,
                width=width,
                height=height,
                num_images=num,
            )

        if session.task_id:
            task = await db.get(ArtTask, session.task_id)
            if task:
                for r in results:
                    gen_result = GenerationResult(
                        task_id=task.id,
                        image_url=r["image_url"],
                        provider=r["provider"],
                        generation_params=r.get("params"),
                        generation_time_seconds=r.get("generation_time_seconds"),
                    )
                    db.add(gen_result)
                task.status = TaskStatus.REVIEW
                await db.commit()

        return results

    async def get_session(
        self,
        session_id: uuid.UUID,
        db: AsyncSession,
    ) -> ChatSession | None:
        return await db.get(ChatSession, session_id)

    async def list_sessions(
        self,
        db: AsyncSession,
        limit: int = 50,
    ) -> list[ChatSession]:
        query = (
            select(ChatSession)
            .where(ChatSession.is_active == True)
            .order_by(ChatSession.updated_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        return list(result.scalars().all())


chat_service = ChatService()
