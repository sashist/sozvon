# Sozvon

Open-source (self-hosted) сервис для планирования встреч, созвонов и бронирования слотов в расписании — бесплатный аналог **Планёрки (Planerka.app)**, **Calendly** и **Cal.com**.

Позволяет настроить рабочие часы, создать типы встреч (индивидуальные, групповые, командные) и поделиться публичной ссылкой, по которой гости могут сами выбрать удобное время с учётом часовых поясов.

## Что внутри

- **Гибкое расписание** — недельные интервалы доступности, перерывы, исключения на конкретные даты (выходные или нестандартные часы).
- **Типы событий** — длительность, буферное время до и после звонка, лимит участников на один слот, опциональное ручное подтверждение брони организатором.
- **Командные встречи** — объединение участников в команды, приглашения по токен-ссылкам, общие события и распределение броней между хостами.
- **Публичные страницы** — персональная страница по `@username`, отображение свободных слотов в часовом поясе гостя, отмена и подтверждение встреч.
- **Почтовые уведомления** — отправка HTML-писем организатору и гостю при создании, подтверждении и отмене встречи (для локальной разработки отключается через `MAIL_SUPPRESS_SEND=True`).

## Стек

- **Backend:** Python 3.13, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Alembic, Pydantic v2, PyJWT, FastAPI-Mail
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI / shadcn, TanStack Query, React Hook Form + Zod
- **Инфраструктура:** Docker, Docker Compose, Nginx

## Быстрый старт (Docker)

1. Скопируйте файл переменных окружения:
   ```bash
   cp .env.example .env
   ```
   При необходимости задайте свой `JWT_SECRET_KEY` (например, `openssl rand -hex 32`) и настройки SMTP.

2. Соберите и запустите контейнеры:
   ```bash
   docker compose up --build -d
   ```
   При старте бэкенд автоматически применит миграции Alembic к базе данных.

3. После запуска сервисы доступны по адресам:
   - Веб-интерфейс: `http://localhost:5173`
   - Backend API: `http://localhost:8000`
   - Swagger UI: `http://localhost:8000/docs`

## Локальный запуск без Docker

### Backend

Требуется запущенный PostgreSQL и Python 3.13+.

```bash
cd backend
cp .env.example .env
# отредактируйте DB_* в backend/.env под локальную БД

uv sync
uv run alembic upgrade head
uv run uvicorn src.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Тестирование

Для запуска тестов используется отдельная тестовая база (`backend/.env-test`, `MODE=TEST`):

```bash
cd backend
pytest -v
```

## Структура проекта

```text
├── backend/
│   ├── migrations/        # Миграции Alembic
│   ├── src/
│   │   ├── api/v1/        # Роутеры FastAPI (auth, bookings, events, slots, teams, public)
│   │   ├── core/          # Конфигурация, подключение к БД, JWT и хэширование паролей
│   │   ├── models/        # SQLAlchemy ORM-модели
│   │   ├── repos/         # Репозитории работы с БД
│   │   ├── schemas/       # Pydantic-схемы запросов и ответов
│   │   ├── services/      # Бизнес-логика и расчёт свободных слотов
│   │   └── templates/     # HTML-шаблоны писем
│   └── tests/             # Unit и интеграционные тесты
├── frontend/
│   └── src/
│       ├── api/           # Axios-клиент и методы запросов
│       ├── components/    # UI-компоненты и модальные окна
│       ├── contexts/      # Контекст авторизации
│       ├── hooks/         # React Query хуки
│       └── pages/         # Страницы приложения и публичного бронирования
└── docker-compose.yml
```
