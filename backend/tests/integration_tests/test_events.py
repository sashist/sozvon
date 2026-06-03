import pytest
from httpx import AsyncClient


@pytest.fixture(scope="module")
async def auth_ac(ac: AsyncClient):
    """Клиент с авторизацией через тестового пользователя."""
    await ac.post(
        "/auth/register",
        json={"email": "events_user@test.com", "password": "password123", "full_name": "Events User"},
    )
    await ac.post(
        "/auth/login",
        json={"email": "events_user@test.com", "password": "password123"},
    )
    yield ac
    await ac.post("/auth/logout")


async def test_create_event(auth_ac: AsyncClient):
    resp = await auth_ac.post(
        "/events/",
        json={"title": "Консультация", "slug": "konsultatsiya", "duration": 30},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["title"] == "Консультация"
    assert data["slug"] == "konsultatsiya"
    assert data["duration"] == 30


async def test_get_events(auth_ac: AsyncClient):
    resp = await auth_ac.get("/events/")
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)


async def test_get_event_by_id(auth_ac: AsyncClient):
    # Создаём событие и получаем по id
    create = await auth_ac.post(
        "/events/",
        json={"title": "Звонок", "slug": "zvonok", "duration": 15},
    )
    event_id = create.json()["data"]["id"]

    resp = await auth_ac.get(f"/events/{event_id}")
    assert resp.status_code == 200
    assert resp.json()["data"]["id"] == event_id


async def test_get_event_not_found(auth_ac: AsyncClient):
    resp = await auth_ac.get("/events/999999")
    assert resp.status_code == 404


async def test_update_event(auth_ac: AsyncClient):
    create = await auth_ac.post(
        "/events/",
        json={"title": "Старое название", "slug": "staroe-nazvanie", "duration": 20},
    )
    event_id = create.json()["data"]["id"]

    resp = await auth_ac.put(f"/events/{event_id}", json={"title": "Новое название"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "OK"


async def test_delete_event(auth_ac: AsyncClient):
    create = await auth_ac.post(
        "/events/",
        json={"title": "На удаление", "slug": "na-udalenie", "duration": 10},
    )
    event_id = create.json()["data"]["id"]

    resp = await auth_ac.delete(f"/events/{event_id}")
    assert resp.status_code == 200

    get = await auth_ac.get(f"/events/{event_id}")
    assert get.status_code == 404


async def test_create_event_requires_auth():
    from httpx import ASGITransport, AsyncClient as FreshClient
    from src.main import app as _app
    async with FreshClient(transport=ASGITransport(app=_app), base_url="http://test") as fresh:
        resp = await fresh.post(
            "/events/",
            json={"title": "Без авторизации", "slug": "bez-avtorizatsii", "duration": 30},
        )
    assert resp.status_code == 401
