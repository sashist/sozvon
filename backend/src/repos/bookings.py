from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select, and_, or_

from sqlalchemy.orm import joinedload

from src.models.bookings import BookingORM, BookingStatus
from src.models.event_types import EventTypeMemberORM
from src.repos.base import BaseRepository


class BookingsRepository(BaseRepository):
    """Репозиторий для работы с бронированиями."""

    model = BookingORM

    ACTIVE_STATUSES = [BookingStatus.PENDING, BookingStatus.CONFIRMED]

    async def get_with_event_type(self, booking_id: int) -> BookingORM | None:
        """Получить бронирование с загруженным event_type (для сериализации после commit)."""
        from src.models.event_types import EventTypeORM

        query = (
            select(self.model)
            .options(joinedload(BookingORM.event_type).joinedload(EventTypeORM.user))
            .where(self.model.id == booking_id)
        )
        result = await self.session.execute(query)
        return result.unique().scalar_one_or_none()

    async def get_by_user_id(self, user_id: int):
        """Получить все бронирования для событий пользователя (как создатель)"""
        from src.models.event_types import EventTypeORM
        query = (
            select(self.model)
            .options(
                joinedload(BookingORM.event_type).joinedload(EventTypeORM.user)
            )
            .where(self.model.host_user_id == user_id)
            .order_by(self.model.start_time.desc())
        )
        result = await self.session.execute(query)
        return result.scalars().unique().all()

    async def get_for_user(self, user_id: int):
        """Получить все бронирования пользователя (как создатель ИЛИ участник события)"""
        from src.models.event_types import EventTypeORM

        member_subquery = (
            select(EventTypeMemberORM.event_type_id)
            .where(EventTypeMemberORM.user_id == user_id)
        )

        query = (
            select(self.model)
            .options(
                joinedload(BookingORM.event_type).joinedload(EventTypeORM.user)
            )
            .where(
                or_(
                    self.model.host_user_id == user_id,
                    self.model.event_type_id.in_(member_subquery)
                )
            )
            .order_by(self.model.start_time.desc())
        )
        result = await self.session.execute(query)
        return result.scalars().unique().all()

    async def get_by_time_range(
        self, user_id: int, start_time: datetime, end_time: datetime
    ):
        """
        Получить все активные бронирования пользователя в диапазоне времени.
        Включает события где пользователь создатель ИЛИ участник.
        """
        member_subquery = (
            select(EventTypeMemberORM.event_type_id)
            .where(EventTypeMemberORM.user_id == user_id)
        )

        query = (
            select(self.model)
            .filter(
                and_(
                    or_(
                        self.model.host_user_id == user_id,
                        self.model.event_type_id.in_(member_subquery)
                    ),
                    self.model.status.in_(self.ACTIVE_STATUSES),
                    self.model.start_time < end_time,
                    self.model.end_time > start_time,
                )
            )
        )
        result = await self.session.execute(query)
        return result.scalars().unique().all()

    async def count_for_slot(
        self, event_type_id: int, start_time: datetime, end_time: datetime
    ) -> int:
        """Подсчитать количество активных бронирований в слоте (pending + confirmed)."""
        query = (
            select(func.count(self.model.id))
            .filter(
                and_(
                    self.model.event_type_id == event_type_id,
                    self.model.status.in_(self.ACTIVE_STATUSES),
                    self.model.start_time < end_time,
                    self.model.end_time > start_time,
                )
            )
        )
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def check_conflict(
        self, event_type_id: int, start_time: datetime, end_time: datetime,
        max_attendees: int = 1
    ) -> bool:
        """
        Проверить есть ли конфликт с существующими бронированиями
        Для solo (max_attendees=1): конфликт если есть хотя бы 1 бронь
        Для group: конфликт если все места заняты
        """
        booked_count = await self.count_for_slot(event_type_id, start_time, end_time)
        return booked_count >= max_attendees

    async def get_by_uid(self, uid: UUID) -> BookingORM | None:
        """Получить бронирование по публичному UUID."""
        from src.models.event_types import EventTypeORM

        query = (
            select(self.model)
            .options(joinedload(BookingORM.event_type).joinedload(EventTypeORM.user))
            .where(self.model.uid == uid)
        )
        result = await self.session.execute(query)
        return result.unique().scalar_one_or_none()

    async def get_by_guest_user_id_or_email(self, user_id: int, email: str) -> list[BookingORM]:
        """Получить бронирования гостя по user_id (новые) или email (старые без user_id).
        Загружает event_type вместе с хозяином встречи (user).
        """
        from src.models.event_types import EventTypeORM
        query = (
            select(self.model)
            .options(
                joinedload(BookingORM.event_type).joinedload(EventTypeORM.user)
            )
            .where(
                or_(
                    self.model.guest_user_id == user_id,
                    and_(
                        self.model.guest_user_id.is_(None),
                        self.model.guest_email == email,
                    )
                )
            )
            .order_by(self.model.start_time.desc())
        )
        result = await self.session.execute(query)
        return list(result.unique().scalars().all())

    async def get_slot_bookings(
        self, event_type_id: int, start_time: datetime
    ) -> list[BookingORM]:
        """Получить все активные бронирования в конкретном слоте (pending + confirmed)."""
        query = (
            select(self.model)
            .filter(
                and_(
                    self.model.event_type_id == event_type_id,
                    self.model.start_time == start_time,
                    self.model.status.in_(self.ACTIVE_STATUSES)
                )
            )
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())


    async def count_active_future(self, event_type_id: int) -> int:
        """Подсчитать количество активных будущих бронирований (pending + confirmed)."""
        query = (
            select(func.count(self.model.id))
            .filter(
                and_(
                    self.model.event_type_id == event_type_id,
                    self.model.status.in_(self.ACTIVE_STATUSES),
                    self.model.end_time > func.now()
                )
            )
        )
        result = await self.session.execute(query)
        return result.scalar() or 0
