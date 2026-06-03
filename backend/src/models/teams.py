"""Модели для команд"""
import enum
import typing

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.models.mixin import TimestampMixin

if typing.TYPE_CHECKING:
    from src.models.users import UserORM
    from src.models.event_types import EventTypeORM


class TeamRole(str, enum.Enum):
    """Роли участников команды"""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class TeamORM(Base, TimestampMixin):
    """Команда пользователей"""
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    invite_token: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)

    members: Mapped[list["TeamMemberORM"]] = relationship(
        "TeamMemberORM", 
        back_populates="team", 
        cascade="all, delete-orphan"
    )
    event_types: Mapped[list["EventTypeORM"]] = relationship(
        "EventTypeORM",
        back_populates="team"
    )


class TeamMemberORM(Base):
    """Участник команды"""
    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), 
        nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False
    )
    role: Mapped[TeamRole] = mapped_column(String(20), default=TeamRole.MEMBER)

    team: Mapped["TeamORM"] = relationship("TeamORM", back_populates="members")
    user: Mapped["UserORM"] = relationship("UserORM")

    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_member"),
    )
