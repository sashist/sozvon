from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


@pytest.fixture(scope="module")
async def host_ac(ac: AsyncClient):
    """Авторизованный клиент-хозяин событий."""
    await ac.post(
        "/auth/register",
        json={"email": "host@test.com", "password": "password123", "full_name": "Host User"},
    )
    await ac.post("/auth/login", json={"email": "host@test.com", "password": "password123"})
    yield ac
    await ac.post("/auth/logout")


@pytest.fixture(scope="module")
async def event_with_availability(host_ac: AsyncClient):
    """Создаёт событие с правилом доступности на все дни недели."""
    create = await host_ac.post(
        "/events/",
        json={"title": "Тестовая встреча", "slug": "test-meeting", "duration": 30},
    )
    event_id = create.json()["data"]["id"]

    # Добавляем правила доступности на все дни (0-6)
    for day in range(7):
        await host_ac.post(
            "/availability/rules",
            json={"day_of_week": day, "time_from": "09:00:00", "time_to": "18:00:00"},
        )

    return event_id


async def test_create_booking(ac: AsyncClient, event_with_availability: int):
    """Гость создаёт бронирование на доступный слот."""
    # Берём слот через 3 дня в 10:00 UTC
    start = (datetime.now(timezone.utc) + timedelta(days=3)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_with_availability,
            "guest_name": "Иван Иванов",
            "guest_email": "ivan@example.com",
            "start_time": start.isoformat(),
        },
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["guest_email"] == "ivan@example.com"
    assert data["status"] in ("pending", "confirmed")


async def test_get_bookings_as_host(host_ac: AsyncClient):
    """Хозяин видит бронирования своих событий."""
    resp = await host_ac.get("/bookings")
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)


async def test_get_my_bookings_as_guest(host_ac: AsyncClient):
    """Пользователь видит бронирования, где он гость."""
    resp = await host_ac.get("/bookings/my")
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)


async def test_cancel_booking(host_ac: AsyncClient, event_with_availability: int):
    """Хозяин отменяет бронирование."""
    start = (datetime.now(timezone.utc) + timedelta(days=5)).replace(
        hour=11, minute=0, second=0, microsecond=0
    )
    create = await host_ac.post(
        "/bookings",
        json={
            "event_type_id": event_with_availability,
            "guest_name": "Гость Второй",
            "guest_email": "guest2@example.com",
            "start_time": start.isoformat(),
        },
    )
    booking_id = create.json()["data"]["id"]

    resp = await host_ac.patch(
        f"/bookings/{booking_id}/cancel",
        json={"cancellation_reason": "Тест отмены"},
    )
    assert resp.status_code == 200


async def test_get_booking_by_uid(ac: AsyncClient, event_with_availability: int):
    """Публичный доступ к бронированию по UUID."""
    start = (datetime.now(timezone.utc) + timedelta(days=6)).replace(
        hour=14, minute=0, second=0, microsecond=0
    )
    create = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_with_availability,
            "guest_name": "Гость UID",
            "guest_email": "uid@example.com",
            "start_time": start.isoformat(),
        },
    )
    uid = create.json()["data"]["uid"]

    resp = await ac.get(f"/bookings/p/{uid}")
    assert resp.status_code == 200
    assert resp.json()["data"]["uid"] == uid


async def test_bookings_require_auth():
    from httpx import ASGITransport, AsyncClient as FreshClient
    from src.main import app as _app
    async with FreshClient(transport=ASGITransport(app=_app), base_url="http://test") as fresh:
        resp = await fresh.get("/bookings")
    assert resp.status_code == 401
