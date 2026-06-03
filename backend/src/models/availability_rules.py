import typing
from datetime import time

from sqlalchemy import CheckConstraint, ForeignKey, Index, and_, or_, column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

if typing.TYPE_CHECKING:
    from src.models.users import UserORM
    from src.models.event_types import EventTypeORM


class AvailabilityRuleORM(Base):
    """Правило доступности для пользователя или типа события."""
    
    __tablename__ = "availability_rules"
    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    event_type_id: Mapped[int | None] = mapped_column(
        ForeignKey("event_types.id", ondelete="CASCADE"), nullable=True
    )
    day_of_week: Mapped[int] = mapped_column(nullable=False)  # 0 = Monday, 6 = Sunday
    time_from: Mapped[time] = mapped_column(nullable=False)
    time_to: Mapped[time] = mapped_column(nullable=False)

    user: Mapped["UserORM"] = relationship("UserORM", back_populates="availability_rules")
    event_type: Mapped["EventTypeORM"] = relationship("EventTypeORM", back_populates="availability_rules")

    __table_args__ = (
        # user_id XOR event_type_id
        CheckConstraint(
            or_(
                and_(column("user_id").isnot(None), column("event_type_id").is_(None)),
                and_(column("user_id").is_(None), column("event_type_id").isnot(None)),
            ),
            name="ck_availability_rules_owner"
        ),
        CheckConstraint(
            column("time_from") < column("time_to"),
            name="ck_availability_rules_time_order"
        ),
        Index("ix_availability_rules_user_id_day", "user_id", "day_of_week"),
        Index("ix_availability_rules_event_type_id_day", "event_type_id", "day_of_week"),
    )