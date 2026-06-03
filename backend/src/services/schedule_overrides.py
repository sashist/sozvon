from src.schemas import (
    ScheduleOverrideAddRequest,
    ScheduleOverrideAdd,
    ScheduleOverride,
    ScheduleOverrideUpdate,
)
from src.services.base import BaseService


class ScheduleOverridesService(BaseService):
    async def create_global_override(
        self, user_id: int, override_data: ScheduleOverrideAddRequest
    ) -> ScheduleOverride:
        """Добавить переопределение для пользователя"""
        override = await self.db.overrides.add(
            ScheduleOverrideAdd(user_id=user_id, **override_data.model_dump())
        )
        await self.db.commit()
        return ScheduleOverride.model_validate(override)

    async def get_global_overrides(self, user_id: int) -> list[ScheduleOverride]:
        """Получить переопределения пользователя"""
        overrides = await self.db.overrides.get_by_user_id(user_id)
        return [ScheduleOverride.model_validate(o) for o in overrides]

    async def update(
        self,
        override_id: int,
        user_id: int,
        override_data: ScheduleOverrideUpdate,
    ) -> None:
        """Обновить переопределение"""
        override = await self.db.overrides.get_one_or_none(id=override_id)
        if not override:
            raise ValueError("Переопределение не найдено")

        if override.user_id != user_id:
            raise ValueError("Доступ запрещён")

        await self.db.overrides.edit(
            override_data, exclude_unset=True, id=override_id
        )
        await self.db.commit()

    async def delete(
        self, override_id: int, user_id: int
    ) -> bool:
        """Удалить переопределение"""
        override = await self.db.overrides.get_one_or_none(id=override_id)
        if not override:
            return False

        if override.user_id != user_id:
            return False

        await self.db.overrides.delete(id=override_id)
        await self.db.commit()
        return True
