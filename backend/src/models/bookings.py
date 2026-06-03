import enum
import uuid
from datetime import datetime

from sqlalchemy import UUID, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.models.mixin import TimestampMixin


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class BookingORM(Base, TimestampMixin):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)

    uid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True
    )

    event_type_id: Mapped[int | None] = mapped_column(
        ForeignKey("event_types.id", ondelete="SET NULL"), nullable=True
    )
    host_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # денормалиция для типов встреч
    event_title: Mapped[str] = mapped_column(String(100), nullable=False)

    guest_name: Mapped[str] = mapped_column(String(100), nullable=False)
    guest_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    guest_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    guest_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # таймзона гостя (IANA), чтобы письма гостю показывали его локальное время
    guest_timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)

    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    status: Mapped[BookingStatus] = mapped_column(
        String(20), default=BookingStatus.PENDING, index=True
    )
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    event_type = relationship("EventTypeORM", back_populates="bookings", lazy="joined")



