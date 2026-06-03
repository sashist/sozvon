from src.schemas import (
    AvailabilityRuleAddRequest,
    AvailabilityRuleAdd,
    AvailabilityRule,
    AvailabilityRuleUpdate,
)
from src.services.base import BaseService


class AvailabilityRulesService(BaseService):
    async def create_global_rule(
        self, user_id: int, rule_data: AvailabilityRuleAddRequest
    ) -> AvailabilityRule:
        """Добавить глобальное правило для пользователя"""
        rule = await self.db.rules.add(
            AvailabilityRuleAdd(
                user_id=user_id, 
                event_type_id=None, 
                **rule_data.model_dump(exclude={"event_type_id"})
            )
        )
        await self.db.commit()
        return AvailabilityRule.model_validate(rule)

    async def replace_global_rules(
        self, user_id: int, rules_data: list[AvailabilityRuleAddRequest]
    ) -> list[AvailabilityRule]:
        """Заменить все глобальные правила пользователя (атомарно)"""
        await self.db.rules.delete_all_global_for_user(user_id)

        new_rules = []
        for data in rules_data:
            rule = await self.db.rules.add(
                AvailabilityRuleAdd(
                    user_id=user_id,
                    event_type_id=None,
                    **data.model_dump(exclude={"event_type_id"})
                )
            )
            new_rules.append(rule)
            
        await self.db.commit()
        return [AvailabilityRule.model_validate(r) for r in new_rules]
    
    async def create_event_type_rule(
        self, event_type_id: int, user_id: int, rule_data: AvailabilityRuleAddRequest
    ) -> AvailabilityRule:
        """Добавить специфичное правило для типа встречи"""
        event_type = await self.db.event_types.get_one_or_none(
            id=event_type_id, user_id=user_id
        )
        if not event_type:
            raise ValueError("Тип встречи не найден")

        rule = await self.db.rules.add(
            AvailabilityRuleAdd(
                user_id=None,
                event_type_id=event_type_id,
                **rule_data.model_dump(exclude={"event_type_id"})
            )
        )
        await self.db.commit()
        return AvailabilityRule.model_validate(rule)

    async def get_global_rules(self, user_id: int) -> list[AvailabilityRule]:
        """Получить глобальные правила пользователя"""
        rules = await self.db.rules.get_by_user_id(user_id)
        return [AvailabilityRule.model_validate(r) for r in rules]
    
    async def get_event_type_rules(self, event_type_id: int, user_id: int) -> list[AvailabilityRule]:
        """Получить правила для конкретного типа встречи"""
        event_type = await self.db.event_types.get_one_or_none(
            id=event_type_id, user_id=user_id
        )
        if not event_type:
            return []
        
        rules = await self.db.rules.get_by_event_type_id(event_type_id)
        return [AvailabilityRule.model_validate(r) for r in rules]
    
    async def get_effective_rules(self, event_type_id: int, user_id: int) -> list[AvailabilityRule]:
        """
        Получить эффективные правила для event_type
        Если есть специфичные - возвращаем их, иначе глобальные
        """
        rules = await self.db.rules.get_effective_rules(event_type_id, user_id)
        return [AvailabilityRule.model_validate(r) for r in rules]

    async def update(
        self, rule_id: int, user_id: int, rule_data: AvailabilityRuleUpdate
    ) -> None:
        """Обновить правило (проверяем что оно принадлежит user_id или его event_type)"""
        rule = await self.db.rules.get_one_or_none(id=rule_id)
        if not rule:
            raise ValueError("Правило не найдено")

        if rule.user_id and rule.user_id != user_id:
            raise ValueError("Доступ запрещён")
        if rule.event_type_id:
            event_type = await self.db.event_types.get_one_or_none(
                id=rule.event_type_id, user_id=user_id
            )
            if not event_type:
                raise ValueError("Доступ запрещён")
        
        await self.db.rules.edit(rule_data, exclude_unset=True, id=rule_id)
        await self.db.commit()

    async def delete(self, rule_id: int, user_id: int) -> bool:
        """Удалить правило"""
        rule = await self.db.rules.get_one_or_none(id=rule_id)
        if not rule:
            return False

        if rule.user_id and rule.user_id != user_id:
            return False
        if rule.event_type_id:
            event_type = await self.db.event_types.get_one_or_none(
                id=rule.event_type_id, user_id=user_id
            )
            if not event_type:
                return False

        await self.db.rules.delete(id=rule_id)
        await self.db.commit()
        return True
