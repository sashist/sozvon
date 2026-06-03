import pytest
from httpx import AsyncClient


@pytest.mark.parametrize(
    "email, password, full_name, status_code",
    [
        ("k0t@pes.com", "password123", "Kot Pes", 200),
        ("k0t@pes.com", "password123", "Kot Pes", 409),
        ("k0t1@pes.com", "password456", "Kot1 Pes1", 200),
        ("abcde", "password456", "Bad Email", 422),
        ("abcde@abc", "password456", "Bad Email2", 422),
    ],
)
async def test_auth_flow(email: str, password: str, full_name: str, status_code: int, ac: AsyncClient):
    # /register
    resp_register = await ac.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    assert resp_register.status_code == status_code
    if status_code != 200:
        return

    # /login
    resp_login = await ac.post(
        "/auth/login",
        json={"email": email, "password": password},
    )
    assert resp_login.status_code == 200
    assert ac.cookies["access_token"]
    assert resp_login.json()["status"] == "OK"

    # /me
    resp_me = await ac.get("/auth/me")
    assert resp_me.status_code == 200
    user = resp_me.json()
    assert user["email"] == email
    assert "id" in user
    assert "password" not in user
    assert "hashed_password" not in user

    # /logout
    resp_logout = await ac.post("/auth/logout")
    assert resp_logout.status_code == 200
    assert "access_token" not in ac.cookies