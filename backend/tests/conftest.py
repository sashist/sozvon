import json
from typing import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient

from src.api.v1.dependencies import get_db
from src.core.config import settings
from src.core.database import (
    Base,
    async_session_maker_with_null_pull,
    engine_null_pool,
)
from src.main import app
from src.models import *  # noqa
from src.utils.db_manager import DBManager


@pytest.fixture(scope="session", autouse=True)
def check_test_mode():
    assert settings.MODE == "TEST"


@pytest.fixture(autouse=True)
def disable_real_emails(monkeypatch):
    """Гарантированно не отправлять реальные письма в тестах.

    Не зависит от того, как загружен env (.env vs .env-test): даже если
    MAIL_SUPPRESS_SEND почему-то False, реальной отправки не будет.
    """
    async def _noop(*args, **kwargs):
        return None

    monkeypatch.setattr("fastapi_mail.FastMail.send_message", _noop)


async def get_db_null_pool():
    async with DBManager(session_factory=async_session_maker_with_null_pull) as db:
        yield db


@pytest.fixture(scope="function")
async def db() -> AsyncGenerator[DBManager, None]:
    async for db in get_db_null_pool():
        yield db


app.dependency_overrides[get_db] = get_db_null_pool


@pytest.fixture(scope="session", autouse=True)
async def setup_database(check_test_mode):
    async with engine_null_pool.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    with open("tests/mock_users.json", encoding="utf-8") as f:
        users = json.load(f)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        for user in users:
            await client.post("/auth/register", json=user)


@pytest.fixture(scope="session")
async def ac() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture(scope="session", autouse=True)
async def register_user(ac: AsyncClient, setup_database):
    await ac.post("/auth/register", json={"email": "kot@pes.com", "password": "password123", "full_name": "Test User"})


@pytest.fixture(scope="session")
async def authenticated_ac(register_user, ac: AsyncClient):
    await ac.post("/auth/login", json={"email": "kot@pes.com", "password": "password123"})
    assert ac.cookies["access_token"]
    yield ac