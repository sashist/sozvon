import re
import uuid

from unidecode import unidecode

from src.core.security import create_access_token, hash_password, verify_password
from src.schemas.users import ChangePassword, User, UserAdd, UserLogin, UserRegister
from src.services.base import BaseService


def generate_username(full_name: str | None, email: str) -> str:
    """
    Генерирует username из full_name или email.
    Пример: "Александр Кочетов" -> "aleksandr-kochetov-x7k2m"
    """
    short_hash = uuid.uuid4().hex[:6]
    
    if full_name:
        slug = unidecode(full_name).lower()
        slug = re.sub(r'[^a-z0-9]+', '-', slug)
        slug = slug.strip('-')
        if slug:
            return f"{slug}-{short_hash}"

    email_part = email.split('@')[0]
    slug = re.sub(r'[^a-z0-9]+', '-', email_part.lower())
    slug = slug.strip('-')
    return f"{slug}-{short_hash}"


class AuthService(BaseService):
    """Сервис для аутентификации и регистрации пользователей."""

    async def register_user(self, data: UserRegister) -> User:
        """Регистрирует нового пользователя."""
        existing_user = await self.db.users.get_by_email(email=data.email)
        if existing_user:
            raise ValueError(f"User with email {data.email} already exists")

        hashed = hash_password(data.password)
        username = generate_username(data.full_name, data.email)
        
        new_user_data = UserAdd(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hashed,
            username=username,
            timezone=data.timezone,
        )
        new_user_orm = await self.db.users.add(new_user_data)
        await self.db.commit()
        return User.model_validate(new_user_orm)

    async def login_user(self, data: UserLogin) -> str:
        """Аутентифицирует пользователя и возвращает access token."""
        user = await self.db.users.get_by_email(email=data.email)
        if not user:
            raise ValueError("Неверный email или пароль")
        if not verify_password(data.password, user.hashed_password):
            raise ValueError("Неверный email или пароль")
        access_token = create_access_token({"user_id": user.id})
        return access_token

    async def get_user_by_id(self, user_id: int) -> User | None:
        """Возвращает пользователя по id или None."""
        return await self.db.users.get_one_or_none(id=user_id)

    async def change_password(self, user_id: int, data: ChangePassword) -> None:
        """Меняет пароль авторизованного пользователя.

        Проверяет текущий пароль перед сменой. Сохраняет хеш нового пароля.

        Raises:
            ValueError: Если пользователь не найден или текущий пароль неверен.
        """
        user = await self.db.users.get_by_id(user_id)
        if not user:
            raise ValueError("Пользователь не найден")

        if not verify_password(data.current_password, user.hashed_password):
            raise ValueError("Текущий пароль указан неверно")

        new_hashed = hash_password(data.new_password)
        user.hashed_password = new_hashed
        await self.db.commit()
