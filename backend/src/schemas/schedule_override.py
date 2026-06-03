"""Pydantic схемы для ScheduleOverride"""
from datetime import date as Date, time as Time
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ScheduleOverrideAddRequest(BaseModel):
    date: Date = Field(..., description="Date YYYY-MM-DD", examples=["2026-01-27"])
    time_from: Time | None = Field(None, description="Start time HH:MM:SS", examples=["10:00:00"])
    time_to: Time | None = Field(None, description="End time HH:MM:SS", examples=["14:00:00"])
    is_holiday: bool = Field(default=False, examples=[False])

    @field_validator("time_to")
    @classmethod
    def validate_time_range(cls, v: Time | None, info) -> Time | None:
        if v and "time_from" in info.data and info.data["time_from"]:
            if v <= info.data["time_from"]:
                raise ValueError("time_to должно быть больше time_from")
        return v


class ScheduleOverrideAdd(BaseModel):
    user_id: int
    date: Date
    time_from: Time | None = None
    time_to: Time | None = None
    is_holiday: bool = False


class ScheduleOverride(ScheduleOverrideAdd):
    id: int

    model_config = ConfigDict(from_attributes=True)


class ScheduleOverrideUpdate(BaseModel):
    time_from: Time | None = Field(None, examples=["10:00:00"])
    time_to: Time | None = Field(None, examples=["14:00:00"])
    is_holiday: bool | None = Field(None, examples=[True])
