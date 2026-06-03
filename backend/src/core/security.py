from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from src.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict) -> str:
    """Создаёт JWT access token по переданным данным."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет соответствие пароля и хеша."""
    return _pwd_context.verify(plain_password, hashed_password)


def hash_password(plain_password: str) -> str:
    """Хеширует пароль."""
    return _pwd_context.hash(plain_password)


def decode_token(token: str) -> dict:
    """Декодирует JWT токен."""
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.InvalidTokenError:
        raise ValueError("Неверный токен")
    
