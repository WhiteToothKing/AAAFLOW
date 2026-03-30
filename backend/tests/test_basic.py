"""Basic smoke tests for AAAFLOW backend."""
import pytest


def test_config_loads():
    """Settings can be instantiated (env defaults)."""
    from app.core.config import Settings
    s = Settings(
        DATABASE_URL="postgresql+asyncpg://localhost/test",
        REDIS_URL="redis://localhost",
    )
    assert s.APP_NAME == "AAAFLOW"


def test_generation_provider_enum():
    from app.models.task import GenerationProvider
    assert GenerationProvider.JIMENG == "jimeng"
    assert GenerationProvider.MINIMAX == "minimax"
    assert GenerationProvider.BANANA == "banana"


def test_skill_registry_has_skills():
    from app.services.skill_registry import skill_registry
    skills = skill_registry.list_skills()
    assert len(skills) >= 15
    ids = {s.id for s in skills}
    assert "icon_generation" in ids
    assert "character_concept" in ids
    assert "scene_concept" in ids
    assert "img2img_refine" in ids
    assert "general_api" in ids


def test_skill_find_by_type():
    from app.services.skill_registry import skill_registry
    icon_skills = skill_registry.find_skills(art_type="icon")
    assert len(icon_skills) >= 2


def test_security_password_hash():
    from app.core.security import get_password_hash, verify_password
    h = get_password_hash("test123")
    assert verify_password("test123", h)
    assert not verify_password("wrong", h)


def test_security_jwt():
    from app.core.security import create_access_token, safe_decode_token
    token = create_access_token("user-123", extra_claims={"role": "admin"})
    payload = safe_decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["role"] == "admin"


def test_image_generator_service_has_new_providers():
    from app.services.image_generator import image_generator_service
    from app.models.task import GenerationProvider
    for p in [GenerationProvider.JIMENG, GenerationProvider.MINIMAX, GenerationProvider.BANANA]:
        gen = image_generator_service.generators.get(p)
        assert gen is not None, f"Missing generator for {p}"
