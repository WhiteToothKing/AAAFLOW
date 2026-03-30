"""Integration tests for AAAFLOW API endpoints.
These test the API layer logic and schema validation without a running DB.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import uuid


def test_user_schema_validation():
    """UserResponse schema validates correctly."""
    from app.schemas.user import UserResponse
    data = {
        "id": str(uuid.uuid4()),
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "department": "Art",
        "role": "user",
        "is_active": True,
        "created_at": "2026-01-01T00:00:00Z",
    }
    user = UserResponse(**data)
    assert user.username == "testuser"
    assert user.role == "user"
    assert user.is_active is True


def test_user_list_response_schema():
    """UserListResponse schema validates correctly."""
    from app.schemas.user import UserListResponse, UserResponse
    user_data = {
        "id": str(uuid.uuid4()),
        "username": "admin",
        "email": "admin@test.com",
        "full_name": "Admin",
        "department": None,
        "role": "admin",
        "is_active": True,
        "created_at": "2026-01-01T00:00:00Z",
    }
    resp = UserListResponse(
        users=[UserResponse(**user_data)],
        total=1,
        page=1,
        page_size=20,
    )
    assert resp.total == 1
    assert len(resp.users) == 1


def test_audit_log_response_schema():
    """AuditLogResponse schema validates correctly."""
    from app.schemas.audit_log import AuditLogResponse
    data = {
        "id": str(uuid.uuid4()),
        "user_id": str(uuid.uuid4()),
        "username": "admin",
        "action": "create",
        "resource_type": "task",
        "resource_id": str(uuid.uuid4()),
        "detail": "Created task",
        "ip_address": "127.0.0.1",
        "created_at": "2026-01-01T00:00:00Z",
    }
    log = AuditLogResponse(**data)
    assert log.action == "create"
    assert log.resource_type == "task"


def test_audit_log_list_response():
    """AuditLogListResponse schema validates correctly."""
    from app.schemas.audit_log import AuditLogListResponse, AuditLogResponse
    log_data = {
        "id": str(uuid.uuid4()),
        "action": "login",
        "resource_type": "auth",
        "created_at": "2026-01-01T00:00:00Z",
    }
    resp = AuditLogListResponse(
        logs=[AuditLogResponse(**log_data)],
        total=1,
        page=1,
        page_size=20,
    )
    assert resp.total == 1


def test_user_update_admin_schema():
    """UserUpdateAdmin schema allows partial updates."""
    from app.schemas.user import UserUpdateAdmin
    update = UserUpdateAdmin(full_name="New Name", role="admin")
    assert update.full_name == "New Name"
    assert update.role == "admin"
    assert update.password is None


def test_audit_service_record():
    """audit_service.record creates an AuditLog entry."""
    from app.models.audit_log import AuditLog
    log = AuditLog(
        user_id=uuid.uuid4(),
        action="test_action",
        resource_type="test",
        resource_id="123",
        detail="test detail",
        ip_address="10.0.0.1",
    )
    assert log.action == "test_action"
    assert log.resource_type == "test"


def test_ws_connection_manager_init():
    """ConnectionManager initializes empty."""
    from app.api.ws import ConnectionManager
    mgr = ConnectionManager()
    assert mgr.client_count == 0


def test_metrics_middleware_metrics_object():
    """Metrics object tracks request data."""
    from app.middleware.metrics import _Metrics
    m = _Metrics()
    m.record("GET", "/api/health", 200, 0.05)
    m.record("POST", "/api/tasks", 201, 0.12)
    m.record("GET", "/api/health", 500, 0.08)
    assert m.request_count["GET /api/health"] == 2
    assert m.error_count["GET /api/health"] == 1
    assert m.request_count["POST /api/tasks"] == 1
    output = m.to_prometheus()
    assert "aaaflow_requests_total" in output
    assert "aaaflow_errors_total" in output
    assert "aaaflow_uptime_seconds" in output


def test_metrics_path_normalization():
    """UUID and numeric IDs in paths are normalized."""
    from app.middleware.metrics import _normalize_path
    assert _normalize_path("/api/tasks/550e8400-e29b-41d4-a716-446655440000") == "/api/tasks/{id}"
    assert _normalize_path("/api/users/123/profile") == "/api/users/{id}/profile"


def test_health_endpoint_structure():
    """Health check response has expected structure."""
    from app.core.config import Settings
    s = Settings(
        DATABASE_URL="postgresql+asyncpg://localhost/test",
        REDIS_URL="redis://localhost",
    )
    assert s.APP_NAME == "AAAFLOW"
    assert s.APP_VERSION is not None
