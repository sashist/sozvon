from sqlalchemy import select

from src.models.availability_rules import AvailabilityRuleORM
from src.repos.base import BaseRepository


class AvailabilityRulesRepository(BaseRepository):
    model = AvailabilityRuleORM

    async def get_by_user_id(self, user_id: int):
        """Получить глобальные правила пользователя"""
        query = select(self.model).filter_by(user_id=user_id, event_type_id=None)
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def get_by_event_type_id(self, event_type_id: int):
        """Получить специфичные правила для типа встречи"""
        query = select(self.model).filter_by(event_type_id=event_type_id)
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def get_effective_rules(self, event_type_id: int, user_id: int):
        """
        Получить эффективные правила для event_type
        Сначала проверяем есть ли специфичные правила для event_type
        Если нет - используем глобальные правила пользователя
        """
        event_rules = await self.get_by_event_type_id(event_type_id)
        if event_rules:
            return event_rules
            
        return await self.get_by_user_id(user_id)

    async def delete_all_global_for_user(self, user_id: int):
        """Удалить все глобальные правила пользователя"""
        from sqlalchemy import delete
        query = delete(self.model).where(
            self.model.user_id == user_id, 
            self.model.event_type_id.is_(None)
        )
        await self.session.execute(query)
