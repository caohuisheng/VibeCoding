"""安全模块单元测试。"""

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_and_verify_password():
    hashed = hash_password("123456")
    assert hashed != "123456"
    assert verify_password("123456", hashed)
    assert not verify_password("wrong", hashed)


def test_jwt_roundtrip():
    token = create_access_token(user_id=1, username="admin", role="admin")
    payload = decode_access_token(token)
    assert payload["sub"] == "1"
    assert payload["username"] == "admin"
    assert payload["role"] == "admin"


def test_jwt_tampered_token_rejected():
    import jwt
    import pytest

    from app.config import settings

    with pytest.raises(Exception):
        jwt.decode("bad.token.value", settings.secret_key, algorithms=["HS256"])
