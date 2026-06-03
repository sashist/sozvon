import typing

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.models.mixin import TimestampMixin

if typing.TYPE_CHECKING:
    from src.models.teams import TeamORM
    from src.models.users import UserORM


class EventTypeORM(Base, TimestampMixin):
    __tablename__ = "event_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    team_id: Mapped[int | None] = mapped_column(
        ForeignKey("teams.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    slug: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    duration: Mapped[int] = mapped_column(nullable=False)
    buffer: Mapped[int] = mapped_column(default=0)
    max_attendees: Mapped[int] = mapped_column(default=1)  # 1 = solo, >1 = group
    requires_confirmation: Mapped[bool] = mapped_column(default=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    available_days_in_future: Mapped[int] = mapped_column(default=60)

    availability_rules = relationship(
        "AvailabilityRuleORM",
        back_populates="event_type",
        cascade="all, delete-orphan"
    )
    bookings = relationship(
        "BookingORM",
        back_populates="event_type"
    )
    user: Mapped["UserORM"] = relationship(
        "UserORM",
        foreign_keys="EventTypeORM.user_id",
    )
    team: Mapped["TeamORM | None"] = relationship(
        "TeamORM",
        back_populates="event_types"
    )
    members: Mapped[list["EventTypeMemberORM"]] = relationship(
        "EventTypeMemberORM",
        back_populates="event_type",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "slug", name="uq_user_slug"),
    )


class EventTypeMemberORM(Base):
    """Участник типа события — для командных встреч"""
    __tablename__ = "event_type_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_type_id: Mapped[int] = mapped_column(
        ForeignKey("event_types.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    event_type: Mapped["EventTypeORM"] = relationship(
        "EventTypeORM",
        back_populates="members"
    )
    user: Mapped["UserORM"] = relationship("UserORM")

    __table_args__ = (
        UniqueConstraint("event_type_id", "user_id", name="uq_event_type_member"),
    )
