from typing import Annotated

from fastapi import Depends, Request, HTTPException, status

from src.core import security
from src.core.database import async_session_maker
from src.utils.db_manager import DBManager


def get_token(request: Request) -> str:
    """Извлечь JWT-токен из httpOnly cookie."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен доступа отсутствует"
        )
    return token


def get_current_user_id(token: str = Depends(get_token)) -> int:
    """Декодировать токен и вернуть ID текущего пользователя."""
    try:
        data = security.decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный токен"
        )
    return data["user_id"]


UserIdDep = Annotated[int, Depends(get_current_user_id)]


def get_optional_user_id(request: Request) -> int | None:
    """Получить ID текущего пользователя если авторизован, иначе None."""
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        data = security.decode_token(token)
        return data["user_id"]
    except Exception:
        return None


OptionalUserIdDep = Annotated[int | None, Depends(get_optional_user_id)]


async def get_db():
    """Dependency для получения асинхронной сессии БД через DBManager."""
    async with DBManager(session_factory=async_session_maker) as db:
        yield db


DBDep = Annotated[DBManager, Depends(get_db)]
