import pytest
from httpx import AsyncClient


@pytest.fixture(scope="module")
async def public_user(ac: AsyncClient):
    """Регистрирует пользователя с известным username и создаёт событие."""
    await ac.post(
        "/auth/register",
        json={"email": "public@test.com", "password": "password123", "full_name": "Public User"},
    )
    await ac.post("/auth/login", json={"email": "public@test.com", "password": "password123"})

    me = await ac.get("/auth/me")
    username = me.json()["username"]

    await ac.post(
        "/events/",
        json={"title": "Открытая встреча", "slug": "open-meeting", "duration": 30, "is_active": True},
    )

    await ac.post("/auth/logout")
    return username


async def test_get_public_user_events(ac: AsyncClient, public_user: str):
    resp = await ac.get(f"/public/{public_user}")
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert "user" in body
    assert "events" in body
    assert body["user"]["username"] == public_user


async def test_get_public_event(ac: AsyncClient, public_user: str):
    resp = await ac.get(f"/public/{public_user}/open-meeting")
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["slug"] == "open-meeting"


async def test_get_public_user_not_found(ac: AsyncClient):
    resp = await ac.get("/public/nonexistent-user-xyz")
    assert resp.status_code == 404


async def test_get_public_event_not_found(ac: AsyncClient, public_user: str):
    resp = await ac.get(f"/public/{public_user}/no-such-event")
    assert resp.status_code == 404
