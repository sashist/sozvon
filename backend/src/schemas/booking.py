"""Pydantic схемы для Booking"""
from datetime import datetime, timezone, date
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from src.models.bookings import BookingStatus
from src.schemas.event_type import EventType


class BookingAddRequest(BaseModel):
    event_type_id: int = Field(..., gt=0)
    guest_name: str = Field(..., min_length=1, max_length=100)
    guest_email: EmailStr
    guest_comment: str | None = Field(None, max_length=1000)
    start_time: datetime
    guest_timezone: str | None = Field(None, description="IANA-таймзона гостя", examples=["Europe/Moscow"])

    @field_validator("guest_timezone")
    @classmethod
    def validate_guest_timezone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            ZoneInfo(v)
        except Exception:
            raise ValueError("Некорректная таймзона")
        return v

    @field_validator("start_time")
    @classmethod
    def validate_start_time(cls, v: datetime) -> datetime:
        """Конвертируем в UTC и проверяем что время в будущем"""
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        v_utc = v.astimezone(timezone.utc)

        if v_utc <= datetime.now(timezone.utc):
            raise ValueError("Время бронирования должно быть в будущем")
        return v_utc


class BookingAdd(BookingAddRequest):
    end_time: datetime
    status: BookingStatus = BookingStatus.PENDING
    guest_user_id: int | None = None
    host_user_id: int
    event_title: str


class Booking(BaseModel):
    id: int
    uid: UUID
    event_type_id: int | None = None
    event_type: EventType | None = None
    event_title: str
    guest_name: str
    guest_email: EmailStr
    guest_comment: str | None = None
    guest_user_id: int | None = None
    host_user_id: int
    guest_timezone: str | None = None
    start_time: datetime
    end_time: datetime
    status: BookingStatus
    cancellation_reason: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class BookingUpdate(BaseModel):
    status: BookingStatus | None = None
    cancellation_reason: str | None = Field(None, max_length=500)


class CancelSlotRequest(BaseModel):
    event_type_id: int
    start_time: datetime
    cancellation_reason: str | None = Field(None, max_length=500)


class CancelDateRangeRequest(BaseModel):
    start_date: date = Field(..., description="Начальная дата (YYYY-MM-DD)")
    end_date: date = Field(..., description="Конечная дата (YYYY-MM-DD)")
    cancellation_reason: str | None = Field(None, max_length=500)
    
    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v: date, info) -> date:
        """Проверяем что end_date >= start_date"""
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("Конечная дата должна быть >= начальной")
        return v
