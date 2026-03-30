"""Unit tests for auth security utilities."""
from app.core.security import (
    verify_password, get_password_hash, create_access_token, safe_decode_token,
)


def test_password_hash_and_verify():
    plain = "test_password_123"
    hashed = get_password_hash(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)
    assert not verify_password("wrong_password", hashed)


def test_create_and_decode_token():
    token = create_access_token("user-id-123", extra_claims={"role": "admin"})
    payload = safe_decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-id-123"
    assert payload["role"] == "admin"


def test_decode_invalid_token():
    result = safe_decode_token("invalid.token.here")
    assert result is None


def test_decode_empty_token():
    result = safe_decode_token("")
    assert result is None
