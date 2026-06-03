"""Pydantic схемы для API"""
from src.schemas.auth import Token
from src.schemas.availability_rule import (
    AvailabilityRuleAddRequest,
    AvailabilityRuleAdd,
    AvailabilityRule,
    AvailabilityRuleUpdate,
)
from src.schemas.schedule_override import (
    ScheduleOverrideAddRequest,
    ScheduleOverrideAdd,
    ScheduleOverride,
    ScheduleOverrideUpdate,
)
from src.schemas.booking import (
    BookingAddRequest,
    BookingAdd,
    Booking,
    BookingUpdate,
)
from src.schemas.event_type import (
    EventTypeAddRequest,
    EventTypeAdd,
    EventType,
    EventTypeUpdate,
)
from src.schemas.users import (
    User,
    UserLogin,
    UserRegister,
    UserAdd,
    UserWithHashedPassword,
    UserPatch,
)

__all__ = [
    "Token",
    "User",
    "UserLogin",
    "UserRegister",
    "UserAdd",
    "UserWithHashedPassword",
    "UserPatch",
    "EventTypeAddRequest",
    "EventTypeAdd",
    "EventType",
    "EventTypeUpdate",
    "BookingAddRequest",
    "BookingAdd",
    "Booking",
    "BookingUpdate",
    "AvailabilityRuleAddRequest",
    "AvailabilityRuleAdd",
    "AvailabilityRule",
    "AvailabilityRuleUpdate",
    "ScheduleOverrideAddRequest",
    "ScheduleOverrideAdd",
    "ScheduleOverride",
    "ScheduleOverrideUpdate",
]
