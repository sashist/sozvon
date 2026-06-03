"""Pydantic схемы для AvailabilityRule"""
from datetime import time as Time
from pydantic import BaseModel, Field, ConfigDict, field_validator


class AvailabilityRuleAddRequest(BaseModel):
    event_type_id: int | None = Field(None, description="ID типа встречи (если специфичное правило)")
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday", examples=[1])
    time_from: Time = Field(..., description="Start time HH:MM:SS", examples=["09:00:00"])
    time_to: Time = Field(..., description="End time HH:MM:SS", examples=["17:00:00"])

    @field_validator("time_to")
    @classmethod
    def validate_time_range(cls, v: Time, info) -> Time:
        if "time_from" in info.data and v <= info.data["time_from"]:
            raise ValueError("time_to должно быть больше time_from")
        return v


class AvailabilityRuleAdd(BaseModel):
    user_id: int | None = None
    event_type_id: int | None = None
    day_of_week: int
    time_from: Time
    time_to: Time


class AvailabilityRule(AvailabilityRuleAdd):
    id: int

    model_config = ConfigDict(from_attributes=True)


class AvailabilityRuleUpdate(BaseModel):
    day_of_week: int | None = Field(None, ge=0, le=6, examples=[1])
    time_from: Time | None = Field(None, examples=["09:00:00"])
    time_to: Time | None = Field(None, examples=["17:00:00"])
