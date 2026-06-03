"""Публичный API для страниц бронирования"""
from fastapi import APIRouter, HTTPException
from starlette import status

from src.api.v1.dependencies import DBDep
from src.schemas.event_type import EventType

router = APIRouter(prefix="/public", tags=["Публичное API"])


@router.get("/{username}/{event_slug}", summary="Получить событие для бронирования")
async def get_public_event(
    username: str,
    event_slug: str,
    db: DBDep,
) -> dict:
    """
    Получает информацию о типе события по username автора и slug события.
    ПУБЛИЧНЫЙ endpoint - не требует авторизации.
    """
    user = await db.users.get_one_or_none(username=username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    event = await db.event_types.get_one_or_none(
        user_id=user.id, slug=event_slug
    )
    if not event or not event.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Событие не найдено или неактивно"
        )
    
    return {"status": "OK", "data": EventType.model_validate(event)}


@router.get("/{username}", summary="Получить публичные типы встреч пользователя")
async def get_public_user_events(
    username: str,
    db: DBDep,
) -> dict:
    """Вернуть публичный профиль пользователя и список активных типов встреч."""
    user = await db.users.get_one_or_none(username=username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    events = await db.event_types.get_by_user_id(user.id)
    active_events = [event for event in events if event.is_active]
    data = [EventType.model_validate(event) for event in active_events]

    return {
        "status": "OK",
        "data": {
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "position": user.position,
            },
            "events": data,
        },
    }
