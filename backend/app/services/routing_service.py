"""
RoutingService: Dedicated service for intelligent routing decisions.

Determines which generation mode (API vs ComfyUI) and which provider
(DALL-E, Midjourney, Stable Diffusion, ComfyUI) to use based on:
  - The AI analysis from Claude
  - User overrides on the task
  - Provider availability checks
  - Art type / style heuristics as fallback
"""
import logging
from dataclasses import dataclass
from typing import Optional

from app.core.config import settings
from app.models.task import (
    ArtType, ArtStyle, GenerationMode, GenerationProvider,
)
from app.schemas.task import AIAnalysisResponse

logger = logging.getLogger(__name__)


@dataclass
class RoutingDecision:
    mode: GenerationMode
    provider: GenerationProvider
    reason: str


COMFYUI_PROVIDERS = frozenset({
    GenerationProvider.COMFYUI_LOCAL,
    GenerationProvider.COMFYUI_CLOUD,
    GenerationProvider.STABLE_DIFFUSION,
})

COMFYUI_PREFERRED_ART_TYPES = frozenset({
    ArtType.CHARACTER,
    ArtType.TEXTURE,
    ArtType.CONCEPT,
})

COMFYUI_PREFERRED_STYLES = frozenset({
    ArtStyle.ANIME,
    ArtStyle.SEMI_REALISTIC,
    ArtStyle.HAND_PAINTED,
})


class RoutingService:
    """Stateless routing service — all decisions based on input parameters."""

    def route(
        self,
        analysis: AIAnalysisResponse,
        user_mode: Optional[GenerationMode] = None,
        user_provider: Optional[GenerationProvider] = None,
    ) -> RoutingDecision:
        if user_mode and user_provider:
            return RoutingDecision(
                mode=user_mode,
                provider=user_provider,
                reason="User explicitly specified both mode and provider",
            )

        mode = analysis.recommended_mode
        provider = analysis.recommended_provider

        provider, mode, reason = self._apply_availability_rules(provider, mode)
        mode = self._normalize_mode(provider, mode)

        if user_mode and user_mode != mode:
            provider, mode = self._adapt_to_user_mode(user_mode, analysis)
            reason = f"Adapted provider to match user-requested mode: {user_mode.value}"

        return RoutingDecision(mode=mode, provider=provider, reason=reason)

    def route_by_heuristics(
        self,
        art_type: Optional[ArtType],
        art_style: Optional[ArtStyle],
        complexity: str = "medium",
    ) -> RoutingDecision:
        """Fallback routing when Claude analysis is unavailable."""
        if art_type in COMFYUI_PREFERRED_ART_TYPES or art_style in COMFYUI_PREFERRED_STYLES:
            if self._comfyui_available():
                return RoutingDecision(
                    mode=GenerationMode.COMFYUI,
                    provider=GenerationProvider.COMFYUI_LOCAL,
                    reason=f"Heuristic: {art_type}/{art_style} preferred on ComfyUI",
                )

        if complexity == "low" or art_type in (ArtType.ICON, ArtType.UI, ArtType.POSTER):
            return RoutingDecision(
                mode=GenerationMode.API,
                provider=GenerationProvider.DALL_E,
                reason=f"Heuristic: simple {art_type} → DALL-E",
            )

        if self._midjourney_available():
            return RoutingDecision(
                mode=GenerationMode.API,
                provider=GenerationProvider.MIDJOURNEY,
                reason="Heuristic: complex task → Midjourney",
            )

        return RoutingDecision(
            mode=GenerationMode.API,
            provider=GenerationProvider.DALL_E,
            reason="Heuristic: default fallback → DALL-E",
        )

    def _apply_availability_rules(
        self,
        provider: GenerationProvider,
        mode: GenerationMode,
    ) -> tuple[GenerationProvider, GenerationMode, str]:
        reason = f"Claude recommended {provider.value}"

        if provider == GenerationProvider.MIDJOURNEY and not self._midjourney_available():
            logger.info("Midjourney unavailable, falling back to DALL-E")
            return GenerationProvider.DALL_E, GenerationMode.API, "Midjourney unavailable → DALL-E fallback"

        if provider == GenerationProvider.STABLE_DIFFUSION:
            if self._comfyui_available():
                return GenerationProvider.COMFYUI_LOCAL, GenerationMode.COMFYUI, "SD mapped to ComfyUI (SD runs via ComfyUI)"
            return GenerationProvider.DALL_E, GenerationMode.API, "SD unavailable (no ComfyUI) → DALL-E fallback"

        if provider in (GenerationProvider.COMFYUI_LOCAL, GenerationProvider.COMFYUI_CLOUD):
            if not self._comfyui_available():
                logger.info("ComfyUI unavailable, falling back to DALL-E")
                return GenerationProvider.DALL_E, GenerationMode.API, "ComfyUI unavailable → DALL-E fallback"

        if provider == GenerationProvider.JIMENG and not self._jimeng_available():
            logger.info("Jimeng unavailable, falling back to DALL-E")
            return GenerationProvider.DALL_E, GenerationMode.API, "Jimeng unavailable → DALL-E fallback"

        if provider == GenerationProvider.MINIMAX and not self._minimax_available():
            logger.info("MiniMax unavailable, falling back to DALL-E")
            return GenerationProvider.DALL_E, GenerationMode.API, "MiniMax unavailable → DALL-E fallback"

        if provider == GenerationProvider.BANANA and not self._banana_available():
            logger.info("Banana unavailable, falling back to DALL-E")
            return GenerationProvider.DALL_E, GenerationMode.API, "Banana unavailable → DALL-E fallback"

        return provider, mode, reason

    def _normalize_mode(
        self,
        provider: GenerationProvider,
        mode: GenerationMode,
    ) -> GenerationMode:
        if provider in COMFYUI_PROVIDERS:
            return GenerationMode.COMFYUI
        return GenerationMode.API

    def _adapt_to_user_mode(
        self,
        user_mode: GenerationMode,
        analysis: AIAnalysisResponse,
    ) -> tuple[GenerationProvider, GenerationMode]:
        if user_mode == GenerationMode.COMFYUI:
            return GenerationProvider.COMFYUI_LOCAL, GenerationMode.COMFYUI
        return GenerationProvider.DALL_E, GenerationMode.API

    @staticmethod
    def _midjourney_available() -> bool:
        return bool(settings.MIDJOURNEY_API_URL and settings.MIDJOURNEY_API_KEY)

    @staticmethod
    def _comfyui_available() -> bool:
        return bool(settings.COMFYUI_API_URL)

    @staticmethod
    def _gemini_available() -> bool:
        return bool(settings.GEMINI_API_KEY)

    @staticmethod
    def _jimeng_available() -> bool:
        return bool(settings.JIMENG_ACCESS_KEY and settings.JIMENG_SECRET_KEY)

    @staticmethod
    def _minimax_available() -> bool:
        return bool(settings.MINIMAX_API_KEY)

    @staticmethod
    def _banana_available() -> bool:
        return bool(settings.BANANA_API_KEY)

    def get_available_providers(self) -> list[dict]:
        providers = [
            {"provider": GenerationProvider.DALL_E.value, "available": bool(settings.OPENAI_API_KEY), "mode": GenerationMode.API.value},
        ]
        if self._gemini_available():
            providers.append({"provider": GenerationProvider.GEMINI.value, "available": True, "mode": GenerationMode.API.value})
        if self._midjourney_available():
            providers.append({"provider": GenerationProvider.MIDJOURNEY.value, "available": True, "mode": GenerationMode.API.value})
        if self._jimeng_available():
            providers.append({"provider": GenerationProvider.JIMENG.value, "available": True, "mode": GenerationMode.API.value})
        if self._minimax_available():
            providers.append({"provider": GenerationProvider.MINIMAX.value, "available": True, "mode": GenerationMode.API.value})
        if self._banana_available():
            providers.append({"provider": GenerationProvider.BANANA.value, "available": True, "mode": GenerationMode.API.value})
        if self._comfyui_available():
            providers.append({"provider": GenerationProvider.COMFYUI_LOCAL.value, "available": True, "mode": GenerationMode.COMFYUI.value})
        return providers


routing_service = RoutingService()
