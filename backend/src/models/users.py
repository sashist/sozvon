import typing

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.models.mixin import TimestampMixin

if typing.TYPE_CHECKING:
    from src.models.schedule_overrides import ScheduleOverrideORM
    from src.models.availability_rules import AvailabilityRuleORM


class UserORM(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(200), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(200))
    full_name: Mapped[str | None] = mapped_column(String(50))
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    timezone: Mapped[str] = mapped_column(String, default="UTC", nullable=False)
    position: Mapped[str | None] = mapped_column(String(100), nullable=True)

    availability_rules: Mapped[list["AvailabilityRuleORM"]] = relationship(
        "AvailabilityRuleORM", back_populates="user", cascade="all, delete-orphan"
    )
    overrides: Mapped[list["ScheduleOverrideORM"]] = relationship(
        "ScheduleOverrideORM", back_populates="user", cascade="all, delete-orphan"
    )
