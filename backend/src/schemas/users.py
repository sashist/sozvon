import re

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


class UserLogin(BaseModel):
    """Схема для логина"""
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserRegister(BaseModel):
    """Схема для регистрации"""
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=100)
    timezone: str = "UTC"

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        import zoneinfo
        try:
            zoneinfo.ZoneInfo(v)
        except zoneinfo.ZoneInfoNotFoundError:
            raise ValueError("Неверная таймзона")
        return v


class UserAdd(BaseModel):
    """Схема для создания пользователя в БД"""
    email: EmailStr
    full_name: str
    hashed_password: str
    username: str
    timezone: str = "UTC"


class User(BaseModel):
    """Публичная схема пользователя"""
    id: int
    full_name: str
    email: EmailStr
    username: str
    timezone: str
    position: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserWithHashedPassword(User):
    """Внутренняя схема с хешем пароля"""
    hashed_password: str


class UserPatch(BaseModel):
    """Схема для обновления данных пользователя (без смены пароля)."""

    full_name: str | None = None
    username: str | None = Field(None, min_length=3, max_length=50)
    timezone: str | None = None
    position: str | None = Field(None, max_length=100)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        import zoneinfo
        try:
            zoneinfo.ZoneInfo(v)
        except zoneinfo.ZoneInfoNotFoundError:
            pass
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        """Проверяет формат username."""
        if v is None:
            return v
        if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$', v) or '--' in v:
            raise ValueError("Username должен содержать только латинские буквы, цифры и дефисы")
        return v


class ChangePassword(BaseModel):
    """Схема для смены пароля авторизованного пользователя."""

    current_password: str = Field(..., min_length=6, description="Текущий пароль")
    new_password: str = Field(..., min_length=6, description="Новый пароль")

    @model_validator(mode="after")
    def check_passwords_differ(self) -> "ChangePassword":
        if self.current_password == self.new_password:
            raise ValueError("Новый пароль должен отличаться от старого")
        return self
