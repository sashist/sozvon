from datetime import date, datetime, time, timedelta, timezone, tzinfo
from zoneinfo import ZoneInfo

from src.services.base import BaseService


class SlotsService(BaseService):
    """Сервис для генерации доступных временных слотов"""
    
    async def generate_available_slots(
        self,
        event_type_id: int,
        start_date: date,
        end_date: date,
    ) -> list[dict]:
        """
        Генерирует доступные слоты для бронирования event_type.
        
        Для командных событий с участниками показывает только слоты,
        когда ВСЕ участники свободны (пересечение расписаний).
        
        Args:
            event_type_id: ID типа встречи
            start_date: Начальная дата
            end_date: Конечная дата
        
        Returns:
            Список доступных слотов [{"start": datetime, "end": datetime}, ...]
        """
        event_type = await self.db.event_types.get_by_id(event_type_id)
        if not event_type:
            return []

        today = date.today()
        start_date = max(start_date, today)
        max_date = today + timedelta(days=event_type.available_days_in_future)
        end_date = min(end_date, max_date)
        if start_date > end_date:
            return []
        
        if event_type.team_id:
            member_ids = await self.db.event_type_members.get_member_ids(event_type_id)
            user_ids = member_ids if member_ids else [event_type.user_id]
        else:
            user_ids = [event_type.user_id]

        owner = await self.db.users.get_by_id(event_type.user_id)
        try:
            owner_tz = ZoneInfo(owner.timezone)
        except Exception:
            owner_tz = timezone.utc

        duration_minutes = event_type.duration + event_type.buffer

        start_datetime = datetime.combine(start_date, datetime.min.time(), tzinfo=owner_tz)
        end_datetime = datetime.combine(end_date, datetime.max.time(), tzinfo=owner_tz)

        all_bookings = await self._get_bookings_for_users(
            user_ids, start_datetime, end_datetime
        )

        if len(user_ids) == 1:
            available_slots = await self._generate_slots_for_user(
                user_ids[0], event_type_id, start_date, end_date, duration_minutes, owner_tz
            )
        else:
            available_slots = await self._generate_slots_intersection(
                user_ids, event_type_id, start_date, end_date, duration_minutes, owner_tz
            )

        filtered_slots = self._filter_booked_slots(
            available_slots, all_bookings, event_type.max_attendees
        )

        now = datetime.now(timezone.utc)
        filtered_slots = [s for s in filtered_slots if s["start"] > now]
        
        filtered_slots.sort(key=lambda x: x["start"])
        
        return filtered_slots

    async def _generate_slots_for_user(
        self,
        user_id: int,
        event_type_id: int,
        start_date: date,
        end_date: date,
        duration_minutes: int,
        tz: tzinfo,
    ) -> list[dict]:
        """Генерирует слоты на основе расписания одного пользователя"""
        rules = await self.db.rules.get_effective_rules(event_type_id, user_id)
        overrides = await self.db.overrides.get_by_date_range(
            user_id, start_date, end_date
        )
        overrides_dict = {o.date: o for o in overrides}
        
        slots = []
        current_date = start_date
        
        while current_date <= end_date:
            day_of_week = current_date.weekday()
            
            if current_date in overrides_dict:
                override = overrides_dict[current_date]
                if override.is_holiday:
                    current_date += timedelta(days=1)
                    continue
                elif override.time_from and override.time_to:
                    day_slots = self._generate_slots_for_period(
                        current_date, override.time_from, override.time_to, duration_minutes, tz
                    )
                    slots.extend(day_slots)
            else:
                day_rules = [r for r in rules if r.day_of_week == day_of_week]
                for rule in day_rules:
                    day_slots = self._generate_slots_for_period(
                        current_date, rule.time_from, rule.time_to, duration_minutes, tz
                    )
                    slots.extend(day_slots)
            
            current_date += timedelta(days=1)
        
        return slots

    async def _generate_slots_intersection(
        self,
        user_ids: list[int],
        event_type_id: int,
        start_date: date,
        end_date: date,
        duration_minutes: int,
        tz: tzinfo,
    ) -> list[dict]:
        """
        Генерирует слоты как пересечение расписаний всех участников.
        Слот доступен только если ВСЕ участники свободны в это время.
        """
        if not user_ids:
            return []
        
        import asyncio
        tasks = [
            self._generate_slots_for_user(
                user_id, event_type_id, start_date, end_date, duration_minutes, tz
            )
            for user_id in user_ids
        ]
        results = await asyncio.gather(*tasks)
        
        if not results:
            return []
        
        result_slots = set((s["start"], s["end"]) for s in results[0])
        
        for user_slots in results[1:]:
            user_slots_set = set((s["start"], s["end"]) for s in user_slots)
            result_slots = result_slots.intersection(user_slots_set)
            
            if not result_slots:
                return []
        
        return [{"start": start, "end": end} for start, end in result_slots]
    
    async def _get_bookings_for_users(
        self,
        user_ids: list[int],
        start_datetime: datetime,
        end_datetime: datetime,
    ) -> list:
        """Получает все бронирования для списка пользователей."""
        import asyncio
        all_bookings = []
        seen_ids = set()
        
        tasks = [
            self.db.bookings.get_by_time_range(user_id, start_datetime, end_datetime)
            for user_id in user_ids
        ]
        results = await asyncio.gather(*tasks)
        
        for bookings in results:
            for b in bookings:
                if b.id not in seen_ids:
                    all_bookings.append(b)
                    seen_ids.add(b.id)
        
        return all_bookings
    
    def _generate_slots_for_period(
        self, date: date, time_from: time, time_to: time, duration_minutes: int, tz: tzinfo
    ) -> list[dict]:
        """Генерирует слоты для конкретного периода времени"""
        slots = []
        current_datetime = datetime.combine(date, time_from, tzinfo=tz)
        end_datetime = datetime.combine(date, time_to, tzinfo=tz)
        
        while current_datetime + timedelta(minutes=duration_minutes) <= end_datetime:
            slot_end = current_datetime + timedelta(minutes=duration_minutes)
            slots.append({"start": current_datetime, "end": slot_end})
            current_datetime = slot_end
        
        return slots
    
    @staticmethod
    def _to_utc(dt: datetime) -> datetime:
        """Нормализовать datetime к UTC.

        Если datetime без tzinfo (naive) — считаем UTC.
        Если datetime aware — конвертируем в UTC.
        """
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    def _filter_booked_slots(
        self, slots: list[dict], bookings: list, max_attendees: int = 1
    ) -> list[dict]:
        """
        Фильтрует слоты, исключая те что заняты.

        Для командных событий: слот недоступен если ЛЮБОЙ участник занят.
        Для групповых (max_attendees>1): исключаем где >= max_attendees бронирований.
        """
        if not bookings:
            return slots

        available = []
        for slot in slots:
            slot_start = self._to_utc(slot["start"])
            slot_end = self._to_utc(slot["end"])

            overlapping_count = 0
            for booking in bookings:
                b_start = self._to_utc(booking.start_time)
                b_end = self._to_utc(booking.end_time)
                if slot_start < b_end and slot_end > b_start:
                    overlapping_count += 1

            if overlapping_count < max_attendees:
                available.append(slot)

        return available
