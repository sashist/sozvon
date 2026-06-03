from fastapi import HTTPException

from src.schemas import EventTypeUpdate
from src.schemas.event_type import EventType, EventTypeAdd, EventTypeAddRequest
from src.services.base import BaseService


class EventTypesService(BaseService):
    async def create(
        self, event_type_data: EventTypeAddRequest, user_id: int
    ) -> EventType:
        """Создать тип события. Если указан team_id — проверяем членство и участников."""
        member_ids = list(event_type_data.member_ids)

        if event_type_data.team_id:
            is_member = await self.db.team_members.is_member(
                event_type_data.team_id, user_id
            )
            if not is_member:
                raise HTTPException(
                    status_code=403,
                    detail="Вы не являетесь участником этой команды"
                )

            if user_id not in member_ids:
                member_ids.insert(0, user_id)

            if member_ids:
                await self._validate_members(event_type_data.team_id, member_ids)
        elif event_type_data.member_ids:
            raise HTTPException(
                status_code=400,
                detail="member_ids можно указать только для командных событий (team_id)"
            )

        event_data = EventTypeAdd(
            user_id=user_id,
            **event_type_data.model_dump(exclude={"member_ids"})
        )
        event = await self.db.event_types.add(event_data)
        await self.db.session.flush()

        if event_type_data.team_id and member_ids:
            await self.db.event_type_members.set_members(event.id, member_ids)

        await self.db.commit()

        return EventType(
            **{c.name: getattr(event, c.name) for c in event.__table__.columns},
            member_ids=member_ids if event_type_data.team_id else []
        )

    async def get_events(self, user_id: int) -> list[EventType]:
        """Получить все типы событий пользователя"""
        event_types = await self.db.event_types.get_by_user_id(user_id=user_id)
        result = []
        for event_type in event_types:
            member_ids = [m.user_id for m in event_type.members]
            result.append(EventType(
                **{c.name: getattr(event_type, c.name) for c in event_type.__table__.columns},
                member_ids=member_ids
            ))
        return result

    async def get_by_id(self, event_type_id: int, user_id: int) -> EventType | None:
        """Получить тип события по ID"""
        event_type = await self.db.event_types.get_one_or_none(
            id=event_type_id, user_id=user_id
        )
        if event_type:
            member_ids = await self.db.event_type_members.get_member_ids(event_type_id)
            return EventType(
                **{c.name: getattr(event_type, c.name) for c in event_type.__table__.columns},
                member_ids=member_ids
            )
        return None

    async def update(
        self, event_id: int, user_id: int, event_type_data: EventTypeUpdate
    ) -> None:
        """Обновить тип события"""
        event = await self.db.event_types.get_one_or_none(id=event_id, user_id=user_id)
        if not event:
            raise HTTPException(status_code=404, detail="Событие не найдено")
        
        if event_type_data.member_ids is not None:
            team_id = event_type_data.team_id or event.team_id
            if not team_id:
                raise HTTPException(
                    status_code=400,
                    detail="member_ids можно указать только для командных событий"
                )

            member_ids = list(event_type_data.member_ids)

            if event.user_id not in member_ids:
                member_ids.insert(0, event.user_id)

            await self._validate_members(team_id, member_ids)
            await self.db.event_type_members.set_members(event_id, member_ids)

        update_data = event_type_data.model_dump(exclude={"member_ids"}, exclude_unset=True)
        if update_data:
            await self.db.event_types.edit(
                EventTypeUpdate(**update_data), exclude_unset=True, id=event_id, user_id=user_id
            )
        
        await self.db.commit()
    
    async def _validate_members(self, team_id: int, member_ids: list[int]) -> None:
        """Проверить что все участники являются членами команды"""
        valid_members = await self.db.team_members.get_team_members(team_id)
        valid_ids = {m.user_id for m in valid_members}
        for member_id in member_ids:
            if member_id not in valid_ids:
                raise HTTPException(
                    status_code=400,
                    detail=f"Пользователь {member_id} не является членом команды"
                )
    
    async def delete(self, event_id: int, user_id: int) -> bool:
        """
        Удаляет событие физически.
        Если есть будущие активные бронирования — 409.
        Прошлые бронирования сохраняют event_title (денормализован),
        а event_type_id у них автоматически становится NULL (ON DELETE SET NULL).
        """
        event = await self.db.event_types.get_one_or_none(id=event_id, user_id=user_id)
        if not event:
            return False

        future_bookings = await self.db.bookings.count_active_future(event_id)
        if future_bookings > 0:
            raise HTTPException(
                status_code=409,
                detail=f"Нельзя удалить тип события с предстоящими бронированиями ({future_bookings} шт.). "
                       f"Отмените бронирования перед удалением."
            )

        await self.db.event_types.delete(id=event_id)
        await self.db.commit()
        return True

