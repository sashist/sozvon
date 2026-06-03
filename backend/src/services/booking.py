from datetime import datetime, timedelta, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy.exc import IntegrityError

from src.core.config import settings
from src.models.bookings import BookingStatus
from src.schemas.booking import BookingAdd, BookingAddRequest, Booking
from src.services.base import BaseService
import src.services.email as email_service


class BookingService(BaseService):
    """Сервис для управления бронированиями."""

    @staticmethod
    def _make_guest_manage_url(booking_uid: UUID) -> str:
        return f"{settings.FRONTEND_URL.rstrip('/')}/cancel/{booking_uid}"

    @staticmethod
    def _format_in_tz(
        dt: datetime,
        tz_name: str | None,
        fmt: str = "%d.%m.%Y %H:%M",
        with_tz: bool = True,
    ) -> str:
        """Форматировать момент времени в таймзоне владельца события.

        Время в БД хранится в UTC; без конвертации в письме показывался бы UTC.
        При with_tz добавляется подпись пояса (напр. «10:00 (MSK)»), чтобы время
        было однозначным для получателя в любом часовом поясе.
        """
        try:
            tz = ZoneInfo(tz_name) if tz_name else timezone.utc
        except Exception:
            tz = timezone.utc
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        local = dt.astimezone(tz)
        out = local.strftime(fmt)
        if with_tz:
            label = local.strftime("%Z") or "UTC"
            out = f"{out} ({label})"
        return out

    async def _owner_tz(self, event_type) -> str | None:
        """Таймзона владельца события (для отображения времени в письмах)."""
        if not event_type:
            return None
        owner = await self.db.users.get_by_id(event_type.user_id)
        return owner.timezone if owner else None

    async def _user_can_manage(self, event_type, user_id: int) -> bool:
        """Может ли пользователь управлять бронями события: владелец или член команды."""
        if event_type.user_id == user_id:
            return True
        # участники учитываются только для командных событий
        if not event_type.team_id:
            return False
        member_ids = await self.db.event_type_members.get_member_ids(event_type.id)
        return user_id in member_ids

    async def _collect_host_recipients(self, event_type) -> list[tuple[str, str]]:
        """(email, имя) владельца события и — для командных событий — членов команды,
        с дедупликацией по email."""
        user_ids = [event_type.user_id]
        if event_type.team_id:
            for uid in await self.db.event_type_members.get_member_ids(event_type.id):
                if uid not in user_ids:
                    user_ids.append(uid)

        recipients: dict[str, str] = {}
        for uid in user_ids:
            user = await self.db.users.get_by_id(uid)
            if user and user.email and user.email not in recipients:
                recipients[user.email] = user.full_name or user.username
        return list(recipients.items())

    async def create(
        self,
        data: BookingAddRequest,
        background_tasks: BackgroundTasks,
        user_id: int | None = None,
    ) -> Booking:
        """Создать бронирование.

        Защита от race condition:
        - check_conflict делает COUNT прямо перед INSERT внутри одной транзакции
        - При конкурентной записи IntegrityError конвертируется в HTTP 409
        """
        # блокировка строки сериализует конкурентные бронирования одного типа события
        event_type = await self.db.event_types.get_with_lock(data.event_type_id)
        if not event_type:
            raise HTTPException(status_code=404, detail="Тип события не найден")
        if not event_type.is_active:
            raise HTTPException(status_code=410, detail="Тип события недоступен для бронирования")

        end_time = data.start_time + timedelta(minutes=event_type.duration)

        from src.services.slots import SlotsService
        available_slots = await SlotsService(self.db).generate_available_slots(
            event_type_id=data.event_type_id,
            start_date=data.start_time.date(),
            end_date=data.start_time.date(),
        )
        is_valid_slot = any(s["start"] == data.start_time for s in available_slots)
        if not is_valid_slot:
            raise HTTPException(
                status_code=400,
                detail="Выбранное время недоступно для бронирования по расписанию."
            )

        for status in (BookingStatus.PENDING, BookingStatus.CONFIRMED):
            existing = await self.db.bookings.get_one_or_none(
                event_type_id=data.event_type_id,
                start_time=data.start_time,
                guest_email=data.guest_email,
                status=status
            )
            if existing:
                raise HTTPException(
                    status_code=409,
                    detail="Вы уже забронировали этот слот"
                )

        # COUNT перед INSERT в той же транзакции — строка event_type уже заблокирована
        has_conflict = await self.db.bookings.check_conflict(
            event_type_id=data.event_type_id,
            start_time=data.start_time,
            end_time=end_time,
            max_attendees=event_type.max_attendees,
        )
        if has_conflict:
            raise HTTPException(
                status_code=409,
                detail="Слот недоступен для бронирования — все места заняты или слот уже занят."
            )

        initial_status = (
            BookingStatus.PENDING if event_type.requires_confirmation
            else BookingStatus.CONFIRMED
        )

        booking_data = BookingAdd(
            **data.model_dump(),
            end_time=end_time,
            status=initial_status,
            guest_user_id=user_id,
            host_user_id=event_type.user_id,
            event_title=event_type.title,
        )

        try:
            new_booking = await self.db.bookings.add(booking_data)
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=409, detail="Ошибка при создании бронирования.")

        host = await self.db.users.get_by_id(event_type.user_id)
        host_tz = host.timezone if host else None
        guest_tz = data.guest_timezone or host_tz
        # хосту — в его поясе, гостю — в его собственном
        host_start_fmt = self._format_in_tz(data.start_time, host_tz)
        host_end_fmt = self._format_in_tz(end_time, host_tz, "%H:%M", with_tz=False)
        guest_start_fmt = self._format_in_tz(data.start_time, guest_tz)
        guest_end_fmt = self._format_in_tz(end_time, guest_tz, "%H:%M", with_tz=False)
        host_name = host.full_name if host else "Организатор"
        cancellation_url = self._make_guest_manage_url(new_booking.uid)

        background_tasks.add_task(
            email_service.send_booking_created_guest,
            guest_email=data.guest_email,
            guest_name=data.guest_name,
            event_title=event_type.title,
            start_time=guest_start_fmt,
            end_time=guest_end_fmt,
            host_name=host_name,
            cancellation_url=cancellation_url,
            is_confirmed=(initial_status == BookingStatus.CONFIRMED),
        )

        if initial_status == BookingStatus.PENDING:
            for h_email, h_name in await self._collect_host_recipients(event_type):
                background_tasks.add_task(
                    email_service.send_booking_created_host,
                    host_email=h_email,
                    host_name=h_name,
                    guest_name=data.guest_name,
                    guest_email=data.guest_email,
                    event_title=event_type.title,
                    start_time=host_start_fmt,
                    end_time=host_end_fmt,
                )

        booking_with_event = await self.db.bookings.get_with_event_type(new_booking.id)
        return Booking.model_validate(booking_with_event or new_booking)

    async def confirm(
        self,
        booking_id: int,
        user_id: int,
        background_tasks: BackgroundTasks,
    ) -> None:
        """Подтвердить бронирование (только владелец события)."""
        booking = await self.db.bookings.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Бронирование не найдено")

        if booking.status != BookingStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=f"Нельзя подтвердить бронирование со статусом «{booking.status}»"
            )

        if booking.end_time < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=400,
                detail="Время бронирования уже прошло — подтверждение невозможно",
            )

        event_type = await self.db.event_types.get_by_id(booking.event_type_id)
        if not event_type or event_type.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="Только владелец события может подтверждать бронирования"
            )

        booking.status = BookingStatus.CONFIRMED
        await self.db.commit()

        host = await self.db.users.get_by_id(event_type.user_id)
        host_tz = host.timezone if host else None
        guest_tz = booking.guest_timezone or host_tz
        background_tasks.add_task(
            email_service.send_booking_confirmed,
            guest_email=booking.guest_email,
            guest_name=booking.guest_name,
            event_title=event_type.title,
            start_time=self._format_in_tz(booking.start_time, guest_tz),
            end_time=self._format_in_tz(booking.end_time, guest_tz, "%H:%M", with_tz=False),
            host_name=host.full_name if host else "Организатор",
            cancellation_url=self._make_guest_manage_url(booking.uid),
        )

    async def cancel(
        self,
        booking_id: int,
        user_id: int,
        background_tasks: BackgroundTasks,
        reason: str | None = None,
    ) -> None:
        """Отменить бронирование (только владелец события)."""
        booking = await self.db.bookings.get_by_id(booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Бронирование не найдено")

        event_type = (
            await self.db.event_types.get_by_id(booking.event_type_id)
            if booking.event_type_id else None
        )
        can_manage = booking.host_user_id == user_id or (
            event_type and await self._user_can_manage(event_type, user_id)
        )
        if not can_manage:
            raise HTTPException(status_code=403, detail="Нет доступа к этому бронированию")

        guest_email = booking.guest_email
        guest_name = booking.guest_name
        event_title = booking.event_title
        guest_tz = booking.guest_timezone or await self._owner_tz(event_type)
        start_fmt = self._format_in_tz(booking.start_time, guest_tz)

        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = reason
        await self.db.commit()

        background_tasks.add_task(
            email_service.send_booking_cancelled,
            guest_email=guest_email,
            guest_name=guest_name,
            event_title=event_title,
            start_time=start_fmt,
            cancellation_reason=reason,
        )

    async def cancel_by_guest(
        self,
        uid: UUID,
        guest_email: str,
        background_tasks: BackgroundTasks,
        reason: str | None = None,
    ) -> None:
        """Отменить бронирование гостем (по UUID + email для верификации)."""
        booking = await self.db.bookings.get_by_uid(uid)
        if not booking:
            raise HTTPException(status_code=404, detail="Бронирование не найдено")
        if booking.guest_email != guest_email:
            raise HTTPException(
                status_code=400,
                detail="Укажите email, который использовался при бронировании",
            )

        if booking.status == BookingStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="Бронирование уже отменено")

        event_type = (
            await self.db.event_types.get_by_id(booking.event_type_id)
            if booking.event_type_id else None
        )
        owner_tz = await self._owner_tz(event_type)
        guest_start_fmt = self._format_in_tz(booking.start_time, booking.guest_timezone or owner_tz)
        host_start_fmt = self._format_in_tz(booking.start_time, owner_tz)

        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = reason
        await self.db.commit()

        background_tasks.add_task(
            email_service.send_booking_cancelled,
            guest_email=booking.guest_email,
            guest_name=booking.guest_name,
            event_title=booking.event_title,
            start_time=guest_start_fmt,
            cancellation_reason=reason,
        )
        if event_type:
            for h_email, h_name in await self._collect_host_recipients(event_type):
                background_tasks.add_task(
                    email_service.send_booking_cancelled_host,
                    host_email=h_email,
                    host_name=h_name,
                    guest_name=booking.guest_name,
                    guest_email=booking.guest_email,
                    event_title=booking.event_title,
                    start_time=host_start_fmt,
                    cancellation_reason=reason,
                )

    @staticmethod
    def _cancelled_guest_payload(booking, tz_name: str | None) -> dict:
        """Снимок данных для письма гостю об отмене (до commit, пока атрибуты живы)."""
        return {
            "guest_email": booking.guest_email,
            "guest_name": booking.guest_name,
            "event_title": booking.event_title,
            "start_time": BookingService._format_in_tz(booking.start_time, tz_name),
            "cancellation_reason": booking.cancellation_reason,
        }

    async def cancel_slot(
        self,
        user_id: int,
        event_type_id: int,
        start_time,
        background_tasks: BackgroundTasks,
        reason: str | None = None,
    ) -> int:
        """Отменить все бронирования в слоте (владелец или участник команды)"""
        event_type = await self.db.event_types.get_by_id(event_type_id)
        if not event_type:
            raise HTTPException(status_code=404, detail="Тип события не найден")
        if not await self._user_can_manage(event_type, user_id):
            raise HTTPException(status_code=403, detail="Нет доступа к этому событию")

        bookings = await self.db.bookings.get_slot_bookings(event_type_id, start_time)

        if not bookings:
            raise HTTPException(
                status_code=404,
                detail="В этом слоте нет активных бронирований"
            )

        owner_tz = await self._owner_tz(event_type)
        payloads = []
        for booking in bookings:
            booking.status = BookingStatus.CANCELLED
            booking.cancellation_reason = reason or "Встреча отменена владельцем"
            payloads.append(
                self._cancelled_guest_payload(booking, booking.guest_timezone or owner_tz)
            )

        await self.db.commit()

        for payload in payloads:
            background_tasks.add_task(email_service.send_booking_cancelled, **payload)
        return len(bookings)

    async def cancel_date_range(
        self,
        user_id: int,
        start_date,
        end_date,
        background_tasks: BackgroundTasks,
        reason: str | None = None,
    ) -> int:
        """Отменить все бронирования пользователя в диапазоне дат"""
        from datetime import datetime, time, timezone

        start_datetime = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        end_datetime = datetime.combine(end_date, time.max, tzinfo=timezone.utc)

        bookings = await self.db.bookings.get_by_time_range(
            user_id, start_datetime, end_datetime
        )

        if not bookings:
            raise HTTPException(
                status_code=404,
                detail="В указанном диапазоне нет активных бронирований"
            )

        # таймзона владельца для каждого события (читаем до изменения статусов)
        tz_cache: dict[int | None, str | None] = {}
        for booking in bookings:
            etid = booking.event_type_id
            if etid not in tz_cache:
                et = await self.db.event_types.get_by_id(etid) if etid else None
                tz_cache[etid] = await self._owner_tz(et)

        payloads = []
        for booking in bookings:
            booking.status = BookingStatus.CANCELLED
            booking.cancellation_reason = reason or "Отменено владельцем"
            guest_tz = booking.guest_timezone or tz_cache[booking.event_type_id]
            payloads.append(self._cancelled_guest_payload(booking, guest_tz))

        await self.db.commit()

        for payload in payloads:
            background_tasks.add_task(email_service.send_booking_cancelled, **payload)
        return len(bookings)

    async def get_by_id(self, booking_id: int, user_id: int) -> Booking | None:
        """Получить бронирование по ID (только владелец события)."""
        booking = await self.db.bookings.get_with_event_type(booking_id)
        if not booking:
            return None
        can_manage = booking.host_user_id == user_id or (
            booking.event_type
            and await self._user_can_manage(booking.event_type, user_id)
        )
        if not can_manage:
            raise HTTPException(status_code=403, detail="Нет доступа к этому бронированию")
        return Booking.model_validate(booking)

    async def get_by_uid(self, uid: UUID) -> Booking | None:
        """Получить бронирование по UUID (публичный доступ)."""
        booking = await self.db.bookings.get_by_uid(uid)
        if booking:
            return Booking.model_validate(booking)
        return None

    async def get_by_user_id(self, user_id: int) -> list[Booking]:
        """Получить бронирования где пользователь создатель ИЛИ участник события."""
        bookings = await self.db.bookings.get_for_user(user_id)
        return [Booking.model_validate(b) for b in bookings]

    async def get_my_bookings_as_guest(self, user_id: int) -> list[Booking]:
        """Получить бронирования где авторизованный пользователь записан как гость."""
        user = await self.db.users.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        bookings = await self.db.bookings.get_by_guest_user_id_or_email(user_id, user.email)
        return [Booking.model_validate(b) for b in bookings]
