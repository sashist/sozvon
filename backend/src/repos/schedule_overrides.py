from datetime import date
from sqlalchemy import select

from src.models.schedule_overrides import ScheduleOverrideORM
from src.repos.base import BaseRepository


class ScheduleOverridesRepository(BaseRepository):
    model = ScheduleOverrideORM

    async def get_by_user_id(self, user_id: int):
        """Получить переопределения пользователя"""
        query = select(self.model).filter_by(user_id=user_id)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_by_date_range(self, user_id: int, start_date: date, end_date: date):
        """Получить переопределения пользователя в диапазоне дат"""
        query = (
            select(self.model)
            .filter_by(user_id=user_id)
            .filter(self.model.date >= start_date, self.model.date <= end_date)
        )
        result = await self.session.execute(query)
        return result.scalars().all()
