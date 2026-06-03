from pathlib import Path
from typing import Literal

from fastapi_mail import ConnectionConfig
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    MODE: Literal["TEST", "LOCAL", "DEV", "PROD"] = "LOCAL"

    FRONTEND_URL: str = "http://localhost:5173"

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASS: str = "postgres"
    DB_NAME: str = "sozvon"

    @property
    def DB_URL(self) -> str:
        """Строка подключения к PostgreSQL."""
        return f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 3600

    # --- Email ---
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@example.com"
    MAIL_FROM_NAME: str = "Sozvon"
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    # True — письма не отправляются (только логируются). Удобно для dev.
    MAIL_SUPPRESS_SEND: bool = False

    @property
    def mail_config(self) -> ConnectionConfig:
        """Конфигурация FastMail для отправки писем через SMTP."""
        return ConnectionConfig(
            MAIL_USERNAME=self.MAIL_USERNAME,
            MAIL_PASSWORD=self.MAIL_PASSWORD,
            MAIL_FROM=self.MAIL_FROM,
            MAIL_FROM_NAME=self.MAIL_FROM_NAME,
            MAIL_PORT=self.MAIL_PORT,
            MAIL_SERVER=self.MAIL_SERVER,
            MAIL_STARTTLS=self.MAIL_STARTTLS,
            MAIL_SSL_TLS=self.MAIL_SSL_TLS,
            MAIL_DEBUG=False,
            SUPPRESS_SEND=self.MAIL_SUPPRESS_SEND,
            USE_CREDENTIALS=bool(self.MAIL_USERNAME),
            TEMPLATE_FOLDER=BASE_DIR / "src" / "templates" / "email",
        )

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        extra="ignore",
    )


settings = Settings()  # type: ignore
