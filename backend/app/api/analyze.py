"""
Standalone analysis endpoint: Lets the frontend preview AI analysis
before submitting a full task. Returns classification, recommended strategy,
optimized prompt, and routing decision.
"""
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.task import GenerationMode
from app.schemas.task import AIAnalysisResponse
from app.services.claude_analyzer import claude_analyzer
from app.services.routing_service import routing_service

router = APIRouter(prefix="/analyze", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    reference_images: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    width: Optional[int] = Field(None, ge=256, le=4096)
    height: Optional[int] = Field(None, ge=256, le=4096)


class RoutingDecisionResponse(BaseModel):
    mode: GenerationMode
    provider: str
    reason: str
    available_providers: list[dict]


class AnalyzeResponse(BaseModel):
    analysis: AIAnalysisResponse
    routing: RoutingDecisionResponse


@router.post("", response_model=AnalyzeResponse)
async def analyze_requirement(payload: AnalyzeRequest):
    """
    Preview AI analysis without creating a task.
    Returns the Claude analysis plus the routing decision.
    """
    try:
        size = None
        if payload.width and payload.height:
            size = {"width": payload.width, "height": payload.height}

        analysis = await claude_analyzer.analyze_requirement(
            title=payload.title,
            description=payload.description,
            reference_image_urls=payload.reference_images or [],
            tags=payload.tags or [],
            requested_size=size,
        )

        decision = routing_service.route(analysis=analysis)

        return AnalyzeResponse(
            analysis=analysis,
            routing=RoutingDecisionResponse(
                mode=decision.mode,
                provider=decision.provider.value,
                reason=decision.reason,
                available_providers=routing_service.get_available_providers(),
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/providers")
async def list_available_providers():
    """Return which generation providers are currently configured and available."""
    return {
        "providers": routing_service.get_available_providers(),
    }
