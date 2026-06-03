from fastapi import APIRouter, HTTPException
from starlette import status

from src.api.v1.dependencies import DBDep, UserIdDep
from src.schemas.event_type import EventTypeAddRequest, EventTypeUpdate
from src.services.event_types import EventTypesService

router = APIRouter(prefix="/events", tags=["События"])


@router.post("/", summary="Создать событие")
async def create_event(
    data: EventTypeAddRequest, user_id: UserIdDep, db: DBDep
) -> dict:
    event = await EventTypesService(db).create(data, user_id)
    return {"status": "OK", "data": event}


@router.get("/", summary="Список событий пользователя")
async def get_events(user_id: UserIdDep, db: DBDep) -> dict:
    events = await EventTypesService(db).get_events(user_id)
    return {"status": "OK", "data": events}


@router.get("/{event_id}", summary="Детали события")
async def get_event(event_id: int, user_id: UserIdDep, db: DBDep) -> dict:
    event = await EventTypesService(db).get_by_id(event_id, user_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено"
        )
    return {"status": "OK", "data": event}


@router.put("/{event_id}", summary="Обновить событие")
async def update_event(
    event_id: int, data: EventTypeUpdate, user_id: UserIdDep, db: DBDep
) -> dict:
    await EventTypesService(db).update(event_id, user_id, data)
    return {"status": "OK"}


@router.delete("/{event_id}", summary="Удалить событие")
async def delete_event(event_id: int, user_id: UserIdDep, db: DBDep) -> dict:
    deleted = await EventTypesService(db).delete(event_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено"
        )
    return {"status": "OK"}

