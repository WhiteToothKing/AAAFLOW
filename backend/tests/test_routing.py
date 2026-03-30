"""Unit tests for routing service."""
from app.models.task import GenerationMode, GenerationProvider
from app.services.routing_service import routing_service


def test_get_available_providers():
    providers = routing_service.get_available_providers()
    assert isinstance(providers, list)
    assert len(providers) >= 1
    provider_names = [p["provider"] for p in providers]
    assert "dall_e" in provider_names


def test_route_by_heuristics_icon():
    from app.models.task import ArtType
    decision = routing_service.route_by_heuristics(ArtType.ICON, None, "low")
    assert decision.mode == GenerationMode.API
    assert decision.provider == GenerationProvider.DALL_E


def test_route_by_heuristics_character():
    from app.models.task import ArtType, ArtStyle
    decision = routing_service.route_by_heuristics(ArtType.CHARACTER, ArtStyle.ANIME, "high")
    assert decision is not None
    assert decision.mode in (GenerationMode.API, GenerationMode.COMFYUI)
