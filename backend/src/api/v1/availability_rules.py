from fastapi import APIRouter, HTTPException
from starlette import status

from src.api.v1.dependencies import DBDep, UserIdDep
from src.schemas import (
    AvailabilityRuleAddRequest,
    AvailabilityRuleUpdate,
)
from src.services.availability_rules import AvailabilityRulesService

router = APIRouter(tags=["Правила доступности"])


@router.post("/availability/rules", summary="Добавить глобальное правило")
async def create_global_rule(
    data: AvailabilityRuleAddRequest, user_id: UserIdDep, db: DBDep
) -> dict:
    """Создать глобальное правило доступности для пользователя"""
    rule = await AvailabilityRulesService(db).create_global_rule(user_id, data)
    return {"status": "OK", "data": rule}


@router.put("/availability/rules", summary="Заменить все глобальные правила")
async def replace_global_rules(
    data: list[AvailabilityRuleAddRequest], user_id: UserIdDep, db: DBDep
) -> dict:
    """Полностью перезаписать глобальные правила пользователя (атомарно)"""
    rules = await AvailabilityRulesService(db).replace_global_rules(user_id, data)
    return {"status": "OK", "data": rules}


@router.get("/availability/rules", summary="Список глобальных правил")
async def get_global_rules(user_id: UserIdDep, db: DBDep) -> dict:
    """Получить глобальные правила доступности пользователя"""
    rules = await AvailabilityRulesService(db).get_global_rules(user_id)
    return {"status": "OK", "data": rules}


@router.post("/events/{event_type_id}/availability/rules", summary="Добавить правило для события")
async def create_event_type_rule(
    event_type_id: int, data: AvailabilityRuleAddRequest, user_id: UserIdDep, db: DBDep
) -> dict:
    """Создать специфичное правило доступности для типа встречи"""
    try:
        rule = await AvailabilityRulesService(db).create_event_type_rule(
            event_type_id, user_id, data
        )
        return {"status": "OK", "data": rule}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/events/{event_type_id}/availability/rules", summary="Список правил события")
async def get_event_type_rules(event_type_id: int, user_id: UserIdDep, db: DBDep) -> dict:
    """Получить правила доступности для конкретного типа встречи"""
    rules = await AvailabilityRulesService(db).get_event_type_rules(event_type_id, user_id)
    return {"status": "OK", "data": rules}


@router.get("/events/{event_type_id}/availability/effective-rules", summary="Эффективные правила")
async def get_effective_rules(event_type_id: int, user_id: UserIdDep, db: DBDep) -> dict:
    """
    Получить эффективные правила для event_type
    (специфичные если есть, иначе глобальные)
    """
    rules = await AvailabilityRulesService(db).get_effective_rules(event_type_id, user_id)
    return {"status": "OK", "data": rules}


@router.put("/availability/rules/{rule_id}", summary="Обновить правило")
async def update_rule(
    rule_id: int,
    data: AvailabilityRuleUpdate,
    user_id: UserIdDep,
    db: DBDep,
) -> dict:
    """Обновить правило доступности (глобальное или специфичное)"""
    try:
        await AvailabilityRulesService(db).update(rule_id, user_id, data)
        return {"status": "OK"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/availability/rules/{rule_id}", summary="Удалить правило")
async def delete_rule(
    rule_id: int, user_id: UserIdDep, db: DBDep
) -> dict:
    """Удалить правило доступности"""
    deleted = await AvailabilityRulesService(db).delete(rule_id, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Правило не найдено")
    return {"status": "OK"}
