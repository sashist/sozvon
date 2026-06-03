
from fastapi import APIRouter, HTTPException
from starlette import status

from src.api.v1.dependencies import DBDep, UserIdDep
from src.schemas import (
    ScheduleOverrideAddRequest,
    ScheduleOverrideUpdate,
)
from src.services.schedule_overrides import ScheduleOverridesService

router = APIRouter(tags=["Переопределения расписания"])


@router.post("/availability/overrides", summary="Добавить глобальное переопределение")
async def create_global_override(
    data: ScheduleOverrideAddRequest,
    user_id: UserIdDep,
    db: DBDep,
) -> dict:
    """Создать глобальное переопределение для пользователя"""
    override = await ScheduleOverridesService(db).create_global_override(user_id, data)
    return {"status": "OK", "data": override}


@router.get("/availability/overrides", summary="Список глобальных переопределений")
async def get_global_overrides(user_id: UserIdDep, db: DBDep) -> dict:
    """Получить глобальные переопределения пользователя"""
    overrides = await ScheduleOverridesService(db).get_global_overrides(user_id)
    return {"status": "OK", "data": overrides}


@router.put("/availability/overrides/{override_id}", summary="Обновить переопределение")
async def update_override(
    override_id: int,
    data: ScheduleOverrideUpdate,
    user_id: UserIdDep,
    db: DBDep,
) -> dict:
    """Обновить переопределение (глобальное или специфичное)"""
    try:
        await ScheduleOverridesService(db).update(override_id, user_id, data)
        return {"status": "OK"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/availability/overrides/{override_id}", summary="Удалить переопределение")
async def delete_override(
    override_id: int, user_id: UserIdDep, db: DBDep
) -> dict:
    """Удалить переопределение"""
    deleted = await ScheduleOverridesService(db).delete(override_id, user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Переопределение не найдено"
        )
    return {"status": "OK"}
