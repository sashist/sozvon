import pytest

from src.core.security import create_access_token, decode_token, hash_password, verify_password


def test_hash_and_verify_password():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_create_and_decode_token():
    token = create_access_token({"user_id": 42})
    assert isinstance(token, str)
    payload = decode_token(token)
    assert payload["user_id"] == 42


def test_decode_invalid_token():
    with pytest.raises(ValueError):
        decode_token("not.a.valid.token")
