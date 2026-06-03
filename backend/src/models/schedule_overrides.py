import datetime
import typing

from sqlalchemy import CheckConstraint, ForeignKey, and_, or_, column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

if typing.TYPE_CHECKING:
    from src.models.users import UserORM


class ScheduleOverrideORM(Base):
    """Переопределение расписания пользователя на конкретную дату."""

    __tablename__ = "schedule_overrides"
    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    date: Mapped[datetime.date] = mapped_column(nullable=False)
    time_from: Mapped[datetime.time | None] = mapped_column(nullable=True)
    time_to: Mapped[datetime.time | None] = mapped_column(nullable=True)
    is_holiday: Mapped[bool] = mapped_column(default=False)

    user: Mapped["UserORM"] = relationship("UserORM", back_populates="overrides")

    __table_args__ = (
        # выходной, либо корректный интервал time_from < time_to
        CheckConstraint(
            or_(
                column("is_holiday") == True,  # noqa: E712
                and_(
                    column("time_from").isnot(None),
                    column("time_to").isnot(None),
                    column("time_from") < column("time_to"),
                ),
            ),
            name="ck_schedule_overrides_time_order"
        ),
    )
