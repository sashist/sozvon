from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import AliasChoices, BaseModel, EmailStr, Field, field_validator

from src.api.v1.dependencies import DBDep, UserIdDep, OptionalUserIdDep
from src.schemas.booking import (
    BookingAddRequest, 
    BookingUpdate, 
    CancelSlotRequest,
    CancelDateRangeRequest
)
from src.services.booking import BookingService

router = APIRouter(prefix="/bookings", tags=["Бронирования"])


class GuestCancelRequest(BaseModel):
    guest_email: EmailStr = Field(
        validation_alias=AliasChoices("guest_email", "guestEmail")
    )
    reason: str | None = None

    @field_validator("guest_email", mode="before")
    @classmethod
    def normalize_guest_email(cls, value: str) -> str:
        return value.strip().lower()


@router.post("")
async def create_booking(
    data: BookingAddRequest,
    background_tasks: BackgroundTasks,
    db: DBDep,
    user_id: OptionalUserIdDep,
) -> dict:
    """Создать бронирование."""
    booking = await BookingService(db).create(data, background_tasks, user_id)
    return {"status": "OK", "data": booking}


@router.get("")
async def get_bookings(
    user_id: UserIdDep,
    db: DBDep,
) -> dict:
    """Получить все бронирования для событий текущего пользователя."""
    bookings = await BookingService(db).get_by_user_id(user_id)
    return {"status": "OK", "data": bookings}


@router.get("/my")
async def get_my_bookings_as_guest(
    user_id: UserIdDep,
    db: DBDep,
) -> dict:
    """Получить бронирования, где текущий пользователь записан как гость."""
    bookings = await BookingService(db).get_my_bookings_as_guest(user_id)
    return {"status": "OK", "data": bookings}


@router.get("/p/{booking_uid}")
async def get_booking_public(
    booking_uid: UUID,
    db: DBDep,
) -> dict:
    """Получить бронирование по публичному UUID."""
    booking = await BookingService(db).get_by_uid(booking_uid)
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    return {"status": "OK", "data": booking}


@router.get("/{booking_id}")
async def get_booking(
    booking_id: int,
    user_id: UserIdDep,
    db: DBDep,
) -> dict:
    """Получить бронирование по ID (только владелец события)."""
    booking = await BookingService(db).get_by_id(booking_id, user_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    return {"status": "OK", "data": booking}


@router.patch("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: int,
    user_id: UserIdDep,
    background_tasks: BackgroundTasks,
    db: DBDep,
    data: BookingUpdate | None = None,
) -> dict:
    """Отменить бронирование (только владелец события)."""
    reason = data.cancellation_reason if data else None
    await BookingService(db).cancel(booking_id, user_id, background_tasks, reason)
    return {"status": "OK"}


@router.patch("/p/{booking_uid}/cancel")
async def cancel_booking_by_guest(
    booking_uid: UUID,
    data: GuestCancelRequest,
    background_tasks: BackgroundTasks,
    db: DBDep,
) -> dict:
    """Отменить бронирование гостем (по UUID + email)."""
    await BookingService(db).cancel_by_guest(
        booking_uid, data.guest_email, background_tasks, data.reason
    )
    return {"status": "OK"}


@router.patch("/{booking_id}/confirm")
async def confirm_booking(
    booking_id: int,
    background_tasks: BackgroundTasks,
    user_id: UserIdDep,
    db: DBDep,
) -> dict:
    """Подтвердить бронирование (только владелец события)."""
    await BookingService(db).confirm(booking_id, user_id, background_tasks)
    return {"status": "OK"}


@router.post("/cancel-slot")
async def cancel_slot(
    data: CancelSlotRequest,
    user_id: UserIdDep,
    db: DBDep,
    background_tasks: BackgroundTasks,
) -> dict:
    """Отменить весь слот (владелец или участник команды)."""
    cancelled_count = await BookingService(db).cancel_slot(
        user_id, data.event_type_id, data.start_time, background_tasks, data.cancellation_reason
    )
    return {
        "status": "OK", 
        "message": f"Отменено бронирований: {cancelled_count}"
    }


@router.post("/cancel-range")
async def cancel_date_range(
    data: CancelDateRangeRequest,
    user_id: UserIdDep,
    db: DBDep,
    background_tasks: BackgroundTasks,
) -> dict:
    """Отменить все бронирования в диапазоне дат (владелец или участник команды)."""
    cancelled_count = await BookingService(db).cancel_date_range(
        user_id, data.start_date, data.end_date, background_tasks, data.cancellation_reason
    )
    return {
        "status": "OK",
        "message": f"Отменено бронирований: {cancelled_count}",
        "period": f"{data.start_date} - {data.end_date}"
    }
