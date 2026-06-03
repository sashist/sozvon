from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from src.models import EventTypeORM
from src.models.event_types import EventTypeMemberORM
from src.repos.base import BaseRepository


class EventTypesRepository(BaseRepository):
    model = EventTypeORM

    async def get_by_user_id(self, user_id: int):
        """Получить все события пользователя"""
        query = (
            select(self.model)
            .filter_by(user_id=user_id)
            .options(selectinload(self.model.members))
            .order_by(self.model.is_active.desc(), self.model.id.asc())
        )
        result = await self.session.execute(query)
        return result.scalars().unique().all()

    async def get_with_members(self, event_type_id: int) -> EventTypeORM | None:
        """Получить событие с загруженными участниками"""
        query = (
            select(self.model)
            .where(self.model.id == event_type_id)
            .options(selectinload(self.model.members))
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()


class EventTypeMembersRepository(BaseRepository):
    """Репозиторий для участников типа события"""
    model = EventTypeMemberORM

    async def get_member_ids(self, event_type_id: int) -> list[int]:
        """Получить список user_id участников события"""
        query = select(self.model.user_id).where(
            self.model.event_type_id == event_type_id
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def set_members(self, event_type_id: int, user_ids: list[int]) -> None:
        """Установить участников события (заменяет существующих)"""
        await self.session.execute(
            delete(self.model).where(self.model.event_type_id == event_type_id)
        )
        for user_id in user_ids:
            member = EventTypeMemberORM(event_type_id=event_type_id, user_id=user_id)
            self.session.add(member)
