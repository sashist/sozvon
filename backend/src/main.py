import logging
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)

sys.path.append(str(Path(__file__).parent.parent))
from src.api.v1.auth import router as router_auth
from src.api.v1.availability_rules import router as router_rules
from src.api.v1.bookings import router as router_bookings
from src.api.v1.event_types import router as router_event
from src.api.v1.schedule_overrides import router as router_overrides
from src.api.v1.slots import router as router_slots
from src.api.v1.public import router as router_public
from src.api.v1.teams import router as router_teams
from src.core.config import settings
from src.core.database import *

app = FastAPI(
    title="Sozvon API",
    description="API сервиса планирования встреч и управления расписанием",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

allowed_origins = list(
    {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.FRONTEND_URL.rstrip("/"),
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
async def root():
    """
    Корневой endpoint для проверки работоспособности API
    """
    return {
        "message": "Bronerka API v1.0.0",
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Проверка состояния сервиса
    """
    return {
        "status": "healthy",
        "service": "bronerka-api",
    }
app.include_router(router_auth)
app.include_router(router_event)
app.include_router(router_bookings)
app.include_router(router_rules)
app.include_router(router_overrides)
app.include_router(router_slots)
app.include_router(router_public)
app.include_router(router_teams)

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True)
