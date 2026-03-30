"""
Claude AI Analyzer: Analyzes art requirements and produces structured analysis
including art type, style, recommended generation approach, and optimized prompts.
"""
import json
import os
import base64
import logging
from pathlib import Path

import httpx
from anthropic import AsyncAnthropic

from app.core.config import settings
from app.schemas.task import AIAnalysisResponse

logger = logging.getLogger(__name__)

ANALYSIS_SYSTEM_PROMPT = """你是一个专业的游戏美术外包需求分析AI助手。你服务于一个游戏美术外包公司,需要分析来自不同项目、不同类型的美术外包需求,并给出结构化的分析结果和智能路由建议。

## 分析维度

1. **美术类型 (art_type)**: character(角色), scene(场景), prop(道具), ui(UI), concept(概念图), texture(纹理), icon(图标), poster(海报), other(其他)
2. **美术风格 (art_style)**: realistic(写实), cartoon(卡通), anime(动漫), pixel(像素), low_poly(低多边形), hand_painted(手绘), flat(扁平), semi_realistic(半写实), other(其他)
3. **推荐生成模式 (recommended_mode)**: api(大模型API) 或 comfyui(ComfyUI工作流)
4. **推荐生成服务 (recommended_provider)**: dall_e, gemini, midjourney, jimeng, minimax, banana, stable_diffusion, comfyui_local, comfyui_cloud
5. **优化后的英文提示词 (optimized_prompt)**: 针对AI图像生成优化的英文提示词,要尽可能详细和专业
6. **反向提示词 (negative_prompt)**: 需要避免的元素
7. **推荐尺寸 (recommended_size)**: {"width": int, "height": int}
8. **标签 (tags)**: 相关标签列表
9. **复杂度 (complexity)**: low, medium, high
10. **置信度 (confidence)**: 0.0-1.0
11. **分析理由 (reasoning)**: 解释为什么推荐这个方案
12. **推荐技能ID (recommended_skill_ids)**: 从下方技能列表中选出最合适的1-3个技能ID

## 游戏美术外包常见品类详解

### 角色原画
- **角色立绘**: 全身站姿/动态姿势,用于角色展示和卡牌
- **角色线稿**: 干净的线描稿件,交给美术手动上色
- **角色三视图**: 正面/侧面/背面设定图,用于3D建模
- **Q版角色**: SD比例(2-3头身)的可爱版本,手游常用
- **半身像/头像**: 对话系统、社交头像、卡牌头像

### 场景原画
- **场景概念图**: 完整场景设计,含建筑/地形/植被/天空
- **场景气氛图**: 强调色调和光影情绪的概念设计
- **场景线稿**: 透视结构图,建筑和环境设计参考

### UED/GUI设计
- **游戏HUD**: 血条、技能栏、小地图等游戏内UI
- **弹窗/面板**: 背包、商店、设置等功能面板
- **登录/加载界面**: 启动画面、过渡页面

### 其他类型
- **道具设计**: 武器、装备、消耗品
- **纹理贴图**: 3D模型无缝材质
- **特效参考**: 技能特效、粒子效果
- **海报/插画**: 宣传物料、CG插图
- **像素风格**: 像素游戏全品类资源

## 路由规则（按优先级排列）

### ComfyUI 工作流优先场景（可精确控制）
- 需要精确控制构图/姿态(ControlNet) → comfyui_local
- 动漫/二次元风格角色、场景 → comfyui_local（专用动漫模型）
- 角色三视图/线稿 → comfyui_local（Lineart/Canny ControlNet）
- 复杂写实角色/场景概念 → comfyui_local
- 纹理贴图/无缝材质 → comfyui_local（tiling节点）
- img2img 风格迁移/精修 → comfyui_local
- 需要 LoRA 定制模型 → comfyui_local

### API 大模型优先场景（快速出图）
- 简单图标、UI元素、扁平设计 → dall_e（最快最稳定）
- 概念草图/快速原型 → gemini 或 dall_e
- Q版角色、简单卡通风 → jimeng（中文理解强）
- 写实人像/半身像 → minimax（人像质量好）
- 海报/宣传图 → dall_e（构图稳定性高）
- 像素风格 → dall_e
- 通用需求、无特殊要求 → dall_e 或 gemini

### Provider 特点
- **dall_e**: OpenAI, 构图稳定, 创意强, 英文prompt效果最好
- **gemini**: Google, 理解力强, 支持多轮对话引导
- **jimeng (即梦/豆包)**: 字节跳动, 中文理解优秀, 东方美术风格好
- **minimax (海螺AI)**: 人像/肖像质量好, 细腻写实
- **banana**: 快速生成, 多风格支持
- **midjourney**: 艺术品质最高, 但速度较慢
- **comfyui_local**: 可定制工作流, ControlNet精确控制, 支持多种SD模型

你必须以纯JSON格式回复,不要包含任何markdown标记或其他文字。"""

ANALYSIS_USER_TEMPLATE = """请分析以下游戏美术需求:

**标题**: {title}
**描述**: {description}
{tags_section}
{size_section}

请以JSON格式返回分析结果,包含以下字段:
art_type, art_style, recommended_mode, recommended_provider, optimized_prompt, negative_prompt, recommended_size, tags, complexity, confidence, reasoning"""


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    return text


class ClaudeAnalyzer:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def analyze_requirement(
        self,
        title: str,
        description: str,
        reference_image_urls: list[str] | None = None,
        tags: list[str] | None = None,
        requested_size: dict | None = None,
    ) -> AIAnalysisResponse:
        tags_section = f"**标签**: {', '.join(tags)}" if tags else ""
        size_section = (
            f"**要求尺寸**: {requested_size['width']}x{requested_size['height']}"
            if requested_size
            else ""
        )

        user_text = ANALYSIS_USER_TEMPLATE.format(
            title=title,
            description=description,
            tags_section=tags_section,
            size_section=size_section,
        )

        content: list[dict] = []

        if reference_image_urls:
            for img_url in reference_image_urls[:3]:
                try:
                    image_content = await self._load_image(img_url)
                    if image_content:
                        content.append(image_content)
                except Exception as e:
                    logger.warning(f"Failed to load reference image {img_url}: {e}")

        content.append({"type": "text", "text": user_text})

        response = await self.client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=2000,
            system=ANALYSIS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
        )

        response_text = _strip_json_fences(response.content[0].text)
        analysis_data = json.loads(response_text)
        return AIAnalysisResponse(**analysis_data)

    async def _load_image(self, image_url: str) -> dict | None:
        if image_url.startswith("data:"):
            parts = image_url.split(",", 1)
            media_type = parts[0].split(";")[0].split(":")[1]
            data = parts[1]
            return {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": data,
                },
            }

        local_path = self._resolve_local_path(image_url)
        if local_path and local_path.exists():
            return self._read_local_image(local_path)

        if image_url.startswith(("http://", "https://")):
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(image_url)
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "image/png")
                media_type = content_type.split(";")[0].strip()
                data = base64.b64encode(resp.content).decode()
                return {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": data,
                    },
                }

        logger.warning(f"Cannot resolve image URL: {image_url}")
        return None

    @staticmethod
    def _resolve_local_path(url: str) -> Path | None:
        """Convert /static/uploads/xxx.png to local filesystem path."""
        if url.startswith("/static/uploads/"):
            filename = url.split("/static/uploads/", 1)[1]
            return Path(settings.UPLOAD_DIR) / filename
        if url.startswith("/"):
            candidate = Path(settings.UPLOAD_DIR) / os.path.basename(url)
            if candidate.exists():
                return candidate
        return None

    @staticmethod
    def _read_local_image(path: Path) -> dict | None:
        suffix = path.suffix.lower()
        mime_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".bmp": "image/bmp",
        }
        media_type = mime_map.get(suffix, "image/png")
        data = base64.b64encode(path.read_bytes()).decode()
        return {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": data,
            },
        }

    async def refine_prompt(
        self,
        original_prompt: str,
        feedback: str,
    ) -> dict:
        response = await self.client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=1000,
            system="你是一个AI图像生成提示词优化专家。根据用户反馈优化提示词。以JSON格式回复: {\"optimized_prompt\": \"...\", \"negative_prompt\": \"...\"}",
            messages=[
                {
                    "role": "user",
                    "content": f"原始提示词: {original_prompt}\n\n用户反馈: {feedback}\n\n请优化提示词。",
                }
            ],
        )
        text = _strip_json_fences(response.content[0].text)
        return json.loads(text)


claude_analyzer = ClaudeAnalyzer()
