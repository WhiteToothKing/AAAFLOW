"""
SkillRegistry: A registry of "skills" that the AI agent can invoke.

Each skill maps to:
  - A human-readable name and description
  - Applicable art types and styles
  - A generation backend (API provider or ComfyUI workflow)
  - A default ComfyUI workflow ID (from DB) or inline workflow

The AI agent uses skill names in conversations to tell the user what
it will do, and the orchestrator looks up the skill to dispatch generation.
"""
import logging
import uuid
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import (
    ArtType, ArtStyle, GenerationMode, GenerationProvider, ComfyUIWorkflow,
)

logger = logging.getLogger(__name__)


@dataclass
class Skill:
    id: str
    name: str
    description: str
    art_types: list[str] = field(default_factory=list)
    art_styles: list[str] = field(default_factory=list)
    mode: GenerationMode = GenerationMode.API
    provider: GenerationProvider = GenerationProvider.DALL_E
    workflow_id: Optional[str] = None
    default_params: dict = field(default_factory=dict)


BUILT_IN_SKILLS: list[Skill] = [
    # ── 图标类 ──────────────────────────────────────────
    Skill(
        id="icon_generation",
        name="游戏图标生成",
        description="生成游戏UI图标，包括道具图标、技能图标、状态图标等。适合扁平和半写实风格。",
        art_types=["icon", "ui"],
        art_styles=["flat", "semi_realistic", "cartoon"],
        mode=GenerationMode.API,
        provider=GenerationProvider.DALL_E,
        default_params={"width": 512, "height": 512, "quality": "hd"},
    ),
    Skill(
        id="icon_app",
        name="App图标设计",
        description="生成移动端应用图标（圆角方形），支持多种风格。",
        art_types=["icon"],
        art_styles=["flat", "semi_realistic", "cartoon"],
        mode=GenerationMode.API,
        provider=GenerationProvider.JIMENG,
        default_params={"width": 1024, "height": 1024},
    ),
    Skill(
        id="icon_badge",
        name="徽章/Logo生成",
        description="生成游戏内成就徽章、公会Logo、队伍标志等。",
        art_types=["icon"],
        art_styles=["flat", "semi_realistic", "hand_painted"],
        mode=GenerationMode.API,
        provider=GenerationProvider.DALL_E,
        default_params={"width": 512, "height": 512, "quality": "hd"},
    ),

    # ── 角色原画类 ────────────────────────────────────────
    Skill(
        id="character_concept",
        name="角色原画概念",
        description="生成角色概念原画，包含全身立绘、角色设计等。支持多种风格。",
        art_types=["character", "concept"],
        art_styles=["anime", "semi_realistic", "realistic", "cartoon"],
        mode=GenerationMode.COMFYUI,
        provider=GenerationProvider.COMFYUI_LOCAL,
        default_params={"width": 768, "height": 1024, "steps": 30},
    ),
    Skill(
        id="character_lineart",
        name="角色线稿生成",
        description="生成干净的角色线稿/线描，适合后续上色。",
        art_types=["character", "concept"],
        art_styles=["anime", "cartoon"],
        mode=GenerationMode.COMFYUI,
        provider=GenerationProvider.COMFYUI_LOCAL,
        default_params={"width": 768, "height": 1024, "steps": 25},
    ),
    Skill(
        id="character_turnaround",
        name="角色三视图",
        description="生成角色正面/侧面/背面三视图设定，用于3D建模参考。",
        art_types=["character", "concept"],
        art_styles=["anime", "semi_realistic", "realistic"],
        mode=GenerationMode.COMFYUI,
        provider=GenerationProvider.COMFYUI_LOCAL,
        default_params={"width": 1536, "height": 768, "steps": 35},
    ),
    Skill(
        id="character_chibi",
        name="Q版角色生成",
        description="生成Q版/SD比例的可爱角色，适合手游角色卡牌或表情包。",
        art_types=["character"],
        art_styles=["cartoon", "anime"],
        mode=GenerationMode.API,
        provider=GenerationProvider.JIMENG,
        default_params={"width": 1024, "height": 1024},
    ),
    Skill(
        id="character_portrait",
        name="角色半身像/头像",
        description="生成角色头像或半身像立绘，适合对话系统、社交头像等。",
        art_types=["character"],
        art_styles=["anime", "semi_realistic", "realistic"],
        mode=GenerationMode.API,
        provider=GenerationProvider.MINIMAX,
        default_params={"width": 1024, "height": 1024},
    ),

    # ── 场景原画类 ────────────────────────────────────────
    Skill(
        id="scene_concept",
        name="场景原画概念",
        description="生成游戏场景概念图，包含环境、建筑、自然景观等。",
        art_types=["scene", "concept"],
        art_styles=["realistic", "semi_realistic", "hand_painted"],
        mode=GenerationMode.COMFYUI,
        provider=GenerationProvider.COMFYUI_LOCAL,
        default_params={"width": 1344, "height": 768, "steps": 30},
    ),
    Skill(
        id="scene_atmosphere",
        name="场景气氛图",
        description="生成氛围感十足的场景气氛图，强调光影和色调情绪表达。",
        art_types=["scene", "concept"],
        art_styles=["realistic", "semi_realistic"],
        mode=GenerationMode.COMFYUI,
        provider=GenerationProvider.COMFYUI_LOCAL,
        default_params={"width": 1344, "height": 768, "steps": 35},
    ),
    Skill(
        id="scene_lineart",
        name="场景线稿",
        description="生成场景透视线稿图，用于建筑和环境设计参考。",
        art_types=["scene"],
        art_styles=["hand_painted", "semi_realistic"],
        mode=GenerationMode.COMFYUI,
        provider=GenerationProvider.COMFYUI_LOCAL,
        default_params={"width": 1344, "height": 768, "steps": 25},
    ),

    # ── UED/GUI 类 ────────────────────────────────────────
    Skill(
        id="ui_hud_design",
        name="游戏HUD设计",
        description="生成游戏内HUD界面设计，包含血条、技能栏、小地图等UI元素组合。",
        art_types=["ui"],
        art_styles=["flat", "semi_realistic"],
        mode=GenerationMode.API,
        provider=GenerationProvider.DALL_E,
        default_params={"width": 1792, "height": 1024, "quality": "hd"},
    ),
    Skill(
        id="ui_panel_design",
        name="弹窗/面板设计",
        description="生成游戏内弹窗、背包面板、商店界面等UI面板设计稿。",
        art_types=["ui"],
        art_styles=["flat", "semi_realistic", "cartoon"],
        mode=GenerationMode.API,
        provider=GenerationProvider.DALL_E,
        default_params={"width": 1024, "height": 1024, "quality": "hd"},
    ),
    Skill(
        id="ui_loading_screen",
        name="登录/加载界面",
        description="生成游戏启动画面、登录界面、加载过渡页面设计。",
        art_types=["ui", "poster"],
        art_styles=["realistic", "semi_realistic", "anime"],
        mode=GenerationMode.API,
        provider=GenerationProvider.DALL_E,
        default_params={"width": 1024, "height": 1792, "quality": "hd"},
    ),

    # ── 道具/纹理/特效类 ──────────────────────────────────
    Skill(
        id="prop_design",
        name="道具设计",
        description="生成武器、装备、物品等游戏道具设计。",
        art_types=["prop"],
        art_styles=["realistic", "semi_realistic", "cartoon", "anime"],
        mode=GenerationMode.API,
        provider=GenerationProvider.DALL_E,
        default_params={"width": 1024, "height": 1024, "quality": "hd"},
    ),
    Skill(
        id="texture_generation",
        name="纹理贴图生成",
        description="生成无缝纹理贴图，适用于3D模型材质。支持石头、木材、金属、布料等。",
        art_types=["texture"],
        art_styles=["realistic", "hand_painted"],
        mode=GenerationMode.COMFYUI,
        provider=GenerationProvider.COMFYUI_LOCAL,
        default_params={"width": 1024, "height": 1024, "steps": 30},
    ),
    Skill(
        id="vfx_reference",
        name="特效参考图",
        description="生成技能特效、粒子效果、魔法阵等特效设计参考图。",
        art_types=["concept", "prop"],
        art_styles=["semi_realistic", "anime"],
        mode=GenerationMode.API,
        provider=GenerationProvider.GEMINI,
        default_params={"width": 1024, "height": 1024},
    ),

    # ── 海报/插画/营销类 ──────────────────────────────────
    Skill(
        id="poster_design",
        name="海报设计",
        description="生成游戏海报、宣传图、启动画面等营销素材。",
        art_types=["poster"],
        art_styles=["realistic", "semi_realistic", "anime"],
        mode=GenerationMode.API,
        provider=GenerationProvider.DALL_E,
        default_params={"width": 1024, "height": 1792, "quality": "hd"},
    ),
    Skill(
        id="illustration",
        name="游戏插画",
        description="生成精致的游戏插画、卡牌插图、CG场景等。",
        art_types=["poster", "concept"],
        art_styles=["anime", "semi_realistic", "realistic"],
        mode=GenerationMode.COMFYUI,
        provider=GenerationProvider.COMFYUI_LOCAL,
        default_params={"width": 1024, "height": 1024, "steps": 35},
    ),

    # ── 风格化/特殊需求类 ─────────────────────────────────
    Skill(
        id="pixel_art",
        name="像素风格生成",
        description="生成像素风格的角色、场景、图标等。",
        art_types=["character", "scene", "icon", "prop"],
        art_styles=["pixel"],
        mode=GenerationMode.API,
        provider=GenerationProvider.DALL_E,
        default_params={"width": 1024, "height": 1024},
    ),
    Skill(
        id="img2img_refine",
        name="参考图精修（img2img）",
        description="基于上传的参考图进行AI风格迁移、细节增强或风格统一。需要上传参考图。",
        art_types=["character", "scene", "prop", "concept"],
        art_styles=["realistic", "semi_realistic", "anime", "hand_painted"],
        mode=GenerationMode.COMFYUI,
        provider=GenerationProvider.COMFYUI_LOCAL,
        default_params={"width": 1024, "height": 1024, "steps": 30, "denoise": 0.55},
    ),
    Skill(
        id="style_transfer",
        name="风格迁移",
        description="将现有图片转换为指定的游戏美术风格（如写实转卡通、照片转手绘）。",
        art_types=["character", "scene", "concept"],
        art_styles=["anime", "cartoon", "hand_painted", "pixel"],
        mode=GenerationMode.COMFYUI,
        provider=GenerationProvider.COMFYUI_LOCAL,
        default_params={"width": 1024, "height": 1024, "steps": 25, "denoise": 0.65},
    ),

    # ── 通用兜底 ──────────────────────────────────────────
    Skill(
        id="general_api",
        name="通用大模型生成",
        description="使用大模型API（DALL-E/Gemini/即梦/MiniMax）直接生成，适合快速原型和各种类型。",
        art_types=[],
        art_styles=[],
        mode=GenerationMode.API,
        provider=GenerationProvider.DALL_E,
        default_params={"width": 1024, "height": 1024},
    ),
]


class SkillRegistry:
    def __init__(self):
        self._skills: dict[str, Skill] = {}
        for skill in BUILT_IN_SKILLS:
            self._skills[skill.id] = skill

    def get_skill(self, skill_id: str) -> Skill | None:
        return self._skills.get(skill_id)

    def list_skills(self) -> list[Skill]:
        return list(self._skills.values())

    def find_skills(
        self,
        art_type: str | None = None,
        art_style: str | None = None,
    ) -> list[Skill]:
        results = []
        for skill in self._skills.values():
            type_match = not art_type or not skill.art_types or art_type in skill.art_types
            style_match = not art_style or not skill.art_styles or art_style in skill.art_styles
            if type_match and style_match:
                results.append(skill)
        return results

    def get_skills_description(self) -> str:
        """Format skills list for Claude's system prompt."""
        lines = []
        for s in self._skills.values():
            types_str = ", ".join(s.art_types) if s.art_types else "通用"
            styles_str = ", ".join(s.art_styles) if s.art_styles else "所有风格"
            lines.append(
                f"- **{s.id}** ({s.name}): {s.description} "
                f"[类型: {types_str} | 风格: {styles_str} | 模式: {s.mode.value}]"
            )
        return "\n".join(lines)

    async def resolve_workflow(
        self,
        skill: Skill,
        db: AsyncSession,
        art_type: str | None = None,
        art_style: str | None = None,
    ) -> dict | None:
        """Try to find a matching DB workflow for this skill.
        Falls back to None (use default ComfyUI workflow)."""
        if skill.workflow_id:
            wf = await db.get(ComfyUIWorkflow, uuid.UUID(skill.workflow_id))
            if wf and wf.is_active:
                return wf.workflow_json

        if skill.mode != GenerationMode.COMFYUI:
            return None

        query = select(ComfyUIWorkflow).where(ComfyUIWorkflow.is_active == True)
        result = await db.execute(query)
        workflows = result.scalars().all()

        for wf in workflows:
            wf_types = wf.art_types or []
            wf_styles = wf.art_styles or []
            if art_type and art_type in wf_types:
                if not art_style or art_style in wf_styles or not wf_styles:
                    return wf.workflow_json
            if art_style and art_style in wf_styles:
                if not art_type or art_type in wf_types or not wf_types:
                    return wf.workflow_json

        return None


skill_registry = SkillRegistry()
