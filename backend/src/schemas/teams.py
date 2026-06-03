"""Pydantic схемы для команд"""

from pydantic import BaseModel, ConfigDict, Field, field_validator
import re

from src.models.teams import TeamRole


class TeamCreate(BaseModel):
    """Схема для создания команды"""

    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100)
    description: str | None = Field(None, max_length=500)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", v) or "--" in v:
            raise ValueError(
                "Slug должен содержать только латинские буквы, цифры и дефисы"
            )
        return v


class TeamUpdate(BaseModel):
    """Схема для обновления команды"""

    name: str | None = Field(None, min_length=2, max_length=100)
    slug: str | None = Field(None, min_length=2, max_length=100)
    description: str | None = Field(None, max_length=500)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not re.match(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$", v) or "--" in v:
            raise ValueError(
                "Slug должен содержать только латинские буквы, цифры и дефисы"
            )
        return v


class TeamMemberAdd(BaseModel):
    """Схема для добавления участника"""

    user_id: int
    role: TeamRole = TeamRole.MEMBER


class TeamMemberUpdate(BaseModel):
    """Схема для обновления роли участника"""

    role: TeamRole


class TeamMember(BaseModel):
    """Схема участника команды"""

    id: int
    user_id: int
    role: TeamRole

    model_config = ConfigDict(from_attributes=True)


class TeamMemberWithUser(BaseModel):
    """Схема участника с данными пользователя"""

    id: int
    user_id: int
    role: TeamRole
    full_name: str | None = None
    email: str | None = None
    username: str | None = None
    position: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_user(cls, member) -> "TeamMemberWithUser":
        """Создать схему из ORM объекта с подгруженным user"""
        return cls(
            id=member.id,
            user_id=member.user_id,
            role=member.role,
            full_name=member.user.full_name if member.user else None,
            email=member.user.email if member.user else None,
            username=member.user.username if member.user else None,
            position=member.user.position if member.user else None,
        )


class Team(BaseModel):
    """Публичная схема команды"""

    id: int
    name: str
    slug: str
    description: str | None = None
    invite_token: str = Field(exclude=True)
    invite_url: str = ""

    model_config = ConfigDict(from_attributes=True)


class TeamWithMembers(Team):
    """Схема команды с участниками"""

    members: list[TeamMemberWithUser] = []


class TeamInviteLink(BaseModel):
    """Инвайт-ссылка команды."""

    token: str
    invite_url: str


class TeamInviteInfo(BaseModel):
    """Публичная информация о команде по токену приглашения."""

    team_name: str
    team_slug: str
    team_description: str | None = None
    member_count: int = 0
