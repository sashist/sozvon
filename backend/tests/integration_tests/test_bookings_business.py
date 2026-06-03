from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest
from httpx import AsyncClient


@pytest.fixture(scope="module")
async def host_client(ac: AsyncClient) -> AsyncClient:
    """Авторизованный клиент для хозяина событий (Host)."""
    # Регистрируем
    await ac.post(
        "/auth/register",
        json={
            "email": "business_host@test.com",
            "password": "password123",
            "full_name": "Business Host",
        },
    )
    # Логинимся
    await ac.post(
        "/auth/login",
        json={"email": "business_host@test.com", "password": "password123"},
    )
    yield ac
    # Логаут
    await ac.post("/auth/logout")


@pytest.fixture(scope="module")
async def stranger_client(ac: AsyncClient) -> AsyncClient:
    """Авторизованный клиент для стороннего пользователя (Stranger)."""
    # Регистрируем
    await ac.post(
        "/auth/register",
        json={
            "email": "business_stranger@test.com",
            "password": "password123",
            "full_name": "Business Stranger",
        },
    )
    # Логинимся
    # Для разделения сессий кук создадим отдельный запрос на вход.
    # Так как фикстура ac разделяемая (session scope), мы делаем логин для stranger_client.
    # Чтобы куки не перемешивались, в тестах, требующих stranger, мы выполним вход/выход динамически
    # или используем FreshClient.
    # Но для интеграционных тестов с использованием одной сессии ac мы можем войти
    # под нужным пользователем непосредственно перед тестом.
    yield ac


async def login_as_host(ac: AsyncClient) -> None:
    """Выполняет вход под хозяином событий."""
    await ac.post(
        "/auth/login",
        json={"email": "business_host@test.com", "password": "password123"},
    )


async def login_as_stranger(ac: AsyncClient) -> None:
    """Выполняет вход под сторонним пользователем."""
    await ac.post(
        "/auth/login",
        json={"email": "business_stranger@test.com", "password": "password123"},
    )


@pytest.fixture(scope="module")
async def event_no_confirm(host_client: AsyncClient) -> int:
    """Создает тип события без обязательного подтверждения."""
    await login_as_host(host_client)
    create = await host_client.post(
        "/events/",
        json={
            "title": "Бизнес встреча Авто",
            "slug": "business-auto",
            "duration": 30,
            "requires_confirmation": False,
        },
    )
    assert create.status_code == 200, f"Ошибка создания события: {create.text}"
    event_id = create.json()["data"]["id"]

    # Добавляем правила доступности на все дни недели с 09:00 до 18:00
    for day in range(7):
        await host_client.post(
            "/availability/rules",
            json={"day_of_week": day, "time_from": "09:00:00", "time_to": "18:00:00"},
        )

    return event_id


@pytest.fixture(scope="module")
async def event_with_confirm(host_client: AsyncClient) -> int:
    """Создает тип события с обязательным подтверждением."""
    await login_as_host(host_client)
    create = await host_client.post(
        "/events/",
        json={
            "title": "Бизнес встреча Ручная",
            "slug": "business-manual",
            "duration": 60,
            "requires_confirmation": True,
        },
    )
    assert create.status_code == 200
    event_id = create.json()["data"]["id"]

    # Добавляем правила доступности на все дни недели с 09:00 до 18:00
    for day in range(7):
        await host_client.post(
            "/availability/rules",
            json={"day_of_week": day, "time_from": "09:00:00", "time_to": "18:00:00"},
        )

    return event_id


# ==========================================
# 1. КОНФЛИКТЫ БРОНИРОВАНИЯ (DOUBLE BOOKING)
# ==========================================

async def test_double_booking_conflict(ac: AsyncClient, event_no_confirm: int) -> None:
    """Проверка невозможности забронировать один и тот же слот дважды разными людьми."""
    # 1. Выбираем слот (например, через 4 дня в 11:00 UTC)
    start = (datetime.now(timezone.utc) + timedelta(days=4)).replace(
        hour=11, minute=0, second=0, microsecond=0
    )

    # 2. Первый гость успешно бронирует слот
    guest_a_resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Гость А",
            "guest_email": "guest_a@test.com",
            "start_time": start.isoformat(),
        },
    )
    assert guest_a_resp.status_code == 200

    # 3. Второй гость пытается забронировать этот же слот
    guest_b_resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Гость Б",
            "guest_email": "guest_b@test.com",
            "start_time": start.isoformat(),
        },
    )
    # Ожидаем конфликт 409 или ошибку 400 (слот уже недоступен)
    assert guest_b_resp.status_code in (400, 409)



# ==========================================
# 2. ОГРАНИЧЕНИЯ ПО ВРЕМЕНИ И СЛОТАМ
# ==========================================

async def test_booking_unavailable_slot(ac: AsyncClient, event_no_confirm: int) -> None:
    """Проверка невозможности забронировать нерабочее время/время вне правил доступности."""
    # Выбираем нерабочее время (например, 22:00)
    start = (datetime.now(timezone.utc) + timedelta(days=4)).replace(
        hour=22, minute=0, second=0, microsecond=0
    )

    resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Неспящий Гость",
            "guest_email": "night@test.com",
            "start_time": start.isoformat(),
        },
    )
    # Ожидаем ошибку 400 (недоступно по расписанию)
    assert resp.status_code == 400
    assert "недоступно" in resp.json()["detail"]


async def test_booking_duplicate_email_same_slot(ac: AsyncClient, event_no_confirm: int) -> None:
    """Проверка невозможности забронировать один и тот же слот дважды одним и тем же человеком."""
    # Выбираем слот (например, через 4 дня в 12:00 UTC)
    start = (datetime.now(timezone.utc) + timedelta(days=4)).replace(
        hour=12, minute=0, second=0, microsecond=0
    )

    # 1-й запрос от гостя
    resp1 = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Дубликатор",
            "guest_email": "double@test.com",
            "start_time": start.isoformat(),
        },
    )
    assert resp1.status_code == 200

    # 2-й запрос от того же гостя на то же время
    resp2 = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Дубликатор",
            "guest_email": "double@test.com",
            "start_time": start.isoformat(),
        },
    )
    # Ожидаем ошибку 409 (уже забронировали этот слот) или 400 (слот уже недоступен)
    assert resp2.status_code in (400, 409)



# ==========================================
# 3. РАЗГРАНИЧЕНИЕ ПРАВ ДОСТУПА
# ==========================================

async def test_confirm_booking_by_stranger_forbidden(
    ac: AsyncClient, event_with_confirm: int, stranger_client: AsyncClient
) -> None:
    """Проверка, что сторонний пользователь не может подтвердить чужое бронирование."""
    # 1. Создаем бронирование, требующее подтверждения
    start = (datetime.now(timezone.utc) + timedelta(days=4)).replace(
        hour=14, minute=0, second=0, microsecond=0
    )
    create_resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_with_confirm,
            "guest_name": "Гость На Подтверждение",
            "guest_email": "pending_guest@test.com",
            "start_time": start.isoformat(),
        },
    )
    assert create_resp.status_code == 200
    booking_id = create_resp.json()["data"]["id"]

    # 2. Логинимся под сторонним пользователем (stranger)
    await login_as_stranger(ac)

    # 3. Пытаемся подтвердить бронирование
    confirm_resp = await ac.patch(f"/bookings/{booking_id}/confirm")
    # Должен быть статус 403 (Только владелец события может подтверждать)
    assert confirm_resp.status_code == 403
    assert "Только владелец" in confirm_resp.json()["detail"]


async def test_cancel_booking_by_stranger_forbidden(
    ac: AsyncClient, event_no_confirm: int, stranger_client: AsyncClient
) -> None:
    """Проверка, что сторонний пользователь не может отменить чужое бронирование."""
    # 1. Создаем бронирование
    start = (datetime.now(timezone.utc) + timedelta(days=4)).replace(
        hour=15, minute=0, second=0, microsecond=0
    )
    create_resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Гость На Отмену",
            "guest_email": "cancel_guest@test.com",
            "start_time": start.isoformat(),
        },
    )
    assert create_resp.status_code == 200
    booking_id = create_resp.json()["data"]["id"]

    # 2. Логинимся под сторонним пользователем (stranger)
    await login_as_stranger(ac)

    # 3. Пытаемся отменить бронирование через панель владельца
    cancel_resp = await ac.patch(
        f"/bookings/{booking_id}/cancel",
        json={"cancellation_reason": "Я взломщик"},
    )
    # Должен быть статус 403
    assert cancel_resp.status_code == 403
    assert "доступа" in cancel_resp.json()["detail"]


async def test_get_booking_by_id_by_stranger_forbidden(
    ac: AsyncClient, event_no_confirm: int, stranger_client: AsyncClient
) -> None:
    """Проверка, что сторонний пользователь не может просмотреть детальную информацию о чужом бронировании по ID."""
    # 1. Создаем бронирование
    start = (datetime.now(timezone.utc) + timedelta(days=4)).replace(
        hour=16, minute=0, second=0, microsecond=0
    )
    create_resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Секретный Гость",
            "guest_email": "secret@test.com",
            "start_time": start.isoformat(),
        },
    )
    assert create_resp.status_code == 200
    booking_id = create_resp.json()["data"]["id"]

    # 2. Логинимся под сторонним пользователем (stranger)
    await login_as_stranger(ac)

    # 3. Пытаемся прочитать бронирование по ID
    get_resp = await ac.get(f"/bookings/{booking_id}")
    # Должен быть статус 403
    assert get_resp.status_code == 403
    assert "доступа" in get_resp.json()["detail"]


# ==========================================
# 4. ЛОГИКА ПОДТВЕРЖДЕНИЯ БРОНИРОВАНИЯ
# ==========================================

async def test_booking_requires_confirmation_flow(
    ac: AsyncClient, event_with_confirm: int, host_client: AsyncClient
) -> None:
    """Проверка жизненного цикла бронирования с ручным подтверждением."""
    # 1. Создаем бронирование
    start = (datetime.now(timezone.utc) + timedelta(days=5)).replace(
        hour=9, minute=0, second=0, microsecond=0
    )
    create_resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_with_confirm,
            "guest_name": "Петр Петров",
            "guest_email": "petr@test.com",
            "start_time": start.isoformat(),
        },
    )
    assert create_resp.status_code == 200
    booking = create_resp.json()["data"]
    booking_id = booking["id"]
    # Ожидаем статус pending
    assert booking["status"] == "pending"

    # 2. Логинимся под владельцем
    await login_as_host(ac)

    # 3. Подтверждаем встречу
    confirm_resp = await ac.patch(f"/bookings/{booking_id}/confirm")
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "OK"

    # 4. Проверяем, что статус обновился до confirmed
    get_resp = await ac.get(f"/bookings/{booking_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["status"] == "confirmed"

    # 5. Повторное подтверждение должно вернуть ошибку 400
    reconfirm_resp = await ac.patch(f"/bookings/{booking_id}/confirm")
    assert reconfirm_resp.status_code == 400
    assert "Нельзя подтвердить" in reconfirm_resp.json()["detail"]


# ==========================================
# 5. ОТМЕНА БРОНИРОВАНИЯ ГОСТЕМ
# ==========================================

async def test_cancel_by_guest_success(ac: AsyncClient, event_no_confirm: int) -> None:
    """Успешная отмена бронирования гостем по публичной ссылке (UUID + email)."""
    # 1. Создаем бронирование
    start = (datetime.now(timezone.utc) + timedelta(days=5)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    create_resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Елена Прекрасная",
            "guest_email": "elena@test.com",
            "start_time": start.isoformat(),
        },
    )
    assert create_resp.status_code == 200
    booking = create_resp.json()["data"]
    booking_uid = booking["uid"]

    # 2. Отменяем встречу гостем с верными данными
    cancel_resp = await ac.patch(
        f"/bookings/p/{booking_uid}/cancel",
        json={
            "guest_email": "elena@test.com",
            "reason": "Изменились планы",
        },
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "OK"

    # 3. Проверяем статус встречи по публичной ссылке
    public_get = await ac.get(f"/bookings/p/{booking_uid}")
    assert public_get.status_code == 200
    assert public_get.json()["data"]["status"] == "cancelled"
    assert public_get.json()["data"]["cancellation_reason"] == "Изменились планы"


async def test_cancel_by_guest_wrong_email(ac: AsyncClient, event_no_confirm: int) -> None:
    """Попытка гостя отменить встречу с некорректным/чужим email."""
    # 1. Создаем бронирование
    start = (datetime.now(timezone.utc) + timedelta(days=5)).replace(
        hour=11, minute=0, second=0, microsecond=0
    )
    create_resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Николай",
            "guest_email": "kolya@test.com",
            "start_time": start.isoformat(),
        },
    )
    assert create_resp.status_code == 200
    booking_uid = create_resp.json()["data"]["uid"]

    # 2. Пытаемся отменить встречу, указав неверный email
    cancel_resp = await ac.patch(
        f"/bookings/p/{booking_uid}/cancel",
        json={
            "guest_email": "hacker@test.com",
            "reason": "Хакинг",
        },
    )
    # Ожидаем ошибку 400 (Укажите email, который использовался)
    assert cancel_resp.status_code == 400
    assert "Укажите email" in cancel_resp.json()["detail"]


async def test_cancel_by_guest_already_cancelled(ac: AsyncClient, event_no_confirm: int) -> None:
    """Попытка гостя повторно отменить уже отмененную встречу."""
    # 1. Создаем бронирование
    start = (datetime.now(timezone.utc) + timedelta(days=5)).replace(
        hour=12, minute=0, second=0, microsecond=0
    )
    create_resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Ольга",
            "guest_email": "olga@test.com",
            "start_time": start.isoformat(),
        },
    )
    booking_uid = create_resp.json()["data"]["uid"]

    # 2. Отменяем встречу в первый раз
    resp1 = await ac.patch(
        f"/bookings/p/{booking_uid}/cancel",
        json={"guest_email": "olga@test.com"},
    )
    assert resp1.status_code == 200

    # 3. Пытаемся отменить встречу во второй раз
    resp2 = await ac.patch(
        f"/bookings/p/{booking_uid}/cancel",
        json={"guest_email": "olga@test.com"},
    )
    # Ожидаем ошибку 400 (Бронирование уже отменено)
    assert resp2.status_code == 400
    assert "уже отменено" in resp2.json()["detail"]


# ==========================================
# 6. ГРУППОВЫЕ ОПЕРАЦИИ ОТМЕНЫ ВЛАДЕЛЬЦЕМ
# ==========================================

async def test_cancel_slot_success(
    ac: AsyncClient, event_no_confirm: int, host_client: AsyncClient
) -> None:
    """Успешная отмена владельцем целого слота (всех встреч в нем)."""
    # 1. Создаем встречу в определенное время
    start = (datetime.now(timezone.utc) + timedelta(days=6)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    create_resp = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Мария",
            "guest_email": "masha@test.com",
            "start_time": start.isoformat(),
        },
    )
    assert create_resp.status_code == 200
    booking_id = create_resp.json()["data"]["id"]

    # 2. Логинимся под владельцем события
    await login_as_host(ac)

    # 3. Отменяем весь слот
    cancel_resp = await ac.post(
        "/bookings/cancel-slot",
        json={
            "event_type_id": event_no_confirm,
            "start_time": start.isoformat(),
            "cancellation_reason": "Внеплановое совещание",
        },
    )
    assert cancel_resp.status_code == 200
    assert "Отменено бронирований: 1" in cancel_resp.json()["message"]

    # 4. Проверяем, что бронирование получило статус cancelled
    get_resp = await ac.get(f"/bookings/{booking_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["status"] == "cancelled"
    assert get_resp.json()["data"]["cancellation_reason"] == "Внеплановое совещание"


async def test_cancel_date_range_success(
    ac: AsyncClient, event_no_confirm: int, host_client: AsyncClient
) -> None:
    """Успешная отмена владельцем всех встреч в диапазоне дат."""
    # 1. Создаем два бронирования на разные дни
    # День 1 (через 6 дней)
    start1 = (datetime.now(timezone.utc) + timedelta(days=6)).replace(
        hour=14, minute=0, second=0, microsecond=0
    )
    c1 = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Диапазон 1",
            "guest_email": "r1@test.com",
            "start_time": start1.isoformat(),
        },
    )
    assert c1.status_code == 200
    b1_id = c1.json()["data"]["id"]

    # День 2 (через 7 дней)
    start2 = (datetime.now(timezone.utc) + timedelta(days=7)).replace(
        hour=14, minute=0, second=0, microsecond=0
    )
    c2 = await ac.post(
        "/bookings",
        json={
            "event_type_id": event_no_confirm,
            "guest_name": "Диапазон 2",
            "guest_email": "r2@test.com",
            "start_time": start2.isoformat(),
        },
    )
    assert c2.status_code == 200
    b2_id = c2.json()["data"]["id"]

    # 2. Логинимся под владельцем
    await login_as_host(ac)

    # 3. Отменяем диапазон дат, покрывающий обе встречи
    date_start = start1.date()
    date_end = start2.date()

    cancel_resp = await ac.post(
        "/bookings/cancel-range",
        json={
            "start_date": date_start.isoformat(),
            "end_date": date_end.isoformat(),
            "cancellation_reason": "Отпуск",
        },
    )
    assert cancel_resp.status_code == 200
    # Как минимум 2 бронирования должны быть отменены (или больше, если другие тесты добавили встречи в этот диапазон)
    assert cancel_resp.json()["status"] == "OK"
    assert "Отменено бронирований" in cancel_resp.json()["message"]

    # 4. Проверяем, что оба бронирования отменились
    get1 = await ac.get(f"/bookings/{b1_id}")
    assert get1.json()["data"]["status"] == "cancelled"
    assert get1.json()["data"]["cancellation_reason"] == "Отпуск"

    get2 = await ac.get(f"/bookings/{b2_id}")
    assert get2.json()["data"]["status"] == "cancelled"
    assert get2.json()["data"]["cancellation_reason"] == "Отпуск"
