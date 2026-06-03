from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Query
from starlette import status

from src.api.v1.dependencies import DBDep
from src.services.slots import SlotsService

router = APIRouter(prefix="/events", tags=["Доступные слоты"])


@router.get("/{event_id}/slots", summary="Получить доступные слоты для события")
async def get_available_slots(
    event_id: int,
    db: DBDep,
    start_date: date = Query(..., description="Начальная дата YYYY-MM-DD"),
    end_date: date = Query(..., description="Конечная дата YYYY-MM-DD"),
) -> dict:
    """
    Генерирует список доступных временных слотов для бронирования конкретного типа события.
    ПУБЛИЧНЫЙ endpoint - не требует авторизации.
    
    Учитывает:
    - duration и buffer из event_type
    - правила доступности (специфичные ИЛИ глобальные пользователя)
    - переопределения расписания (специфичные + глобальные)
    - уже забронированные слоты
    - max_attendees для групповых встреч
    """
    event = await db.event_types.get_by_id(event_id)
    if not event or not event.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Событие не найдено или неактивно"
        )

    slots = await SlotsService(db).generate_available_slots(
        event_id, start_date, end_date
    )

    # убираем buffer из видимой длительности слота
    adjusted_slots = []
    for slot in slots:
        adjusted_slots.append({
            "start": slot["start"],
            "end": slot["start"] + (slot["end"] - slot["start"]) - timedelta(minutes=event.buffer)
        })
    
    return {"status": "OK", "data": adjusted_slots}


