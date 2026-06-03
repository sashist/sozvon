"""Pydantic схемы для EventType"""
import re

from pydantic import AliasChoices, BaseModel, Field, ConfigDict, field_validator


class EventTypeHost(BaseModel):
    """Краткая информация о хозяине встречи."""

    id: int
    full_name: str
    username: str

    model_config = ConfigDict(from_attributes=True)


class EventTypeAddRequest(BaseModel):
    """Схема для создания типа события"""

    title: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=1000)
    duration: int = Field(..., gt=0)
    buffer: int = Field(default=0, ge=0)
    max_attendees: int = Field(default=1, ge=1, le=100)
    requires_confirmation: bool = False
    is_active: bool = True
    available_days_in_future: int = Field(default=60, ge=1, le=365)
    team_id: int | None = None
    member_ids: list[int] = Field(default_factory=list)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$', v) and not re.match(r'^[a-z0-9]$', v):
            raise ValueError(
                "Slug может содержать только латинские буквы, цифры, дефисы в середине"
            )
        return v.lower()


class EventTypeAdd(BaseModel):
    """Схема для добавления в БД"""

    user_id: int
    title: str
    slug: str
    description: str | None = None
    duration: int
    buffer: int = 0
    max_attendees: int = 1
    requires_confirmation: bool = False
    is_active: bool = True
    available_days_in_future: int = 60
    team_id: int | None = None


class EventType(EventTypeAdd):
    """Схема ответа типа события"""

    id: int
    member_ids: list[int] = []
    host: EventTypeHost | None = Field(
        None,
        validation_alias=AliasChoices("host", "user"),
    )

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class EventTypeUpdate(BaseModel):
    """Схема для обновления типа события"""

    title: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=1000)
    duration: int | None = Field(None, gt=0)
    buffer: int | None = Field(None, ge=0)
    max_attendees: int | None = Field(None, ge=1, le=100)
    requires_confirmation: bool | None = None
    is_active: bool | None = None
    available_days_in_future: int | None = Field(None, ge=1, le=365)
    team_id: int | None = None
    member_ids: list[int] | None = None
