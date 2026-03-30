"""Unit tests for the skill registry."""
import pytest
from app.services.skill_registry import skill_registry, BUILT_IN_SKILLS


def test_all_skills_have_unique_ids():
    ids = [s.id for s in BUILT_IN_SKILLS]
    assert len(ids) == len(set(ids)), "Duplicate skill IDs found"


def test_registry_list_returns_all_skills():
    skills = skill_registry.list_skills()
    assert len(skills) == len(BUILT_IN_SKILLS)


def test_get_skill_by_id():
    skill = skill_registry.get_skill("icon_generation")
    assert skill is not None
    assert skill.name == "游戏图标生成"


def test_get_nonexistent_skill():
    assert skill_registry.get_skill("nonexistent") is None


def test_find_skills_by_art_type():
    results = skill_registry.find_skills(art_type="icon")
    assert len(results) >= 1
    for s in results:
        assert "icon" in s.art_types or not s.art_types


def test_find_skills_by_art_style():
    results = skill_registry.find_skills(art_style="anime")
    assert len(results) >= 1


def test_skills_description_nonempty():
    desc = skill_registry.get_skills_description()
    assert len(desc) > 100
    assert "icon_generation" in desc


def test_all_skills_have_valid_provider():
    from app.models.task import GenerationProvider
    valid = set(GenerationProvider)
    for s in BUILT_IN_SKILLS:
        assert s.provider in valid, f"Skill {s.id} has invalid provider {s.provider}"
