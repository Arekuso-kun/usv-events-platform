from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

UserRole = Literal["student", "organizer", "admin"]
ParticipationMode = Literal["physical", "online", "hybrid"]
EventStatus = Literal[
    "draft", "pending_approval", "published", "rejected", "cancelled", "completed"
]
MaterialType = Literal["presentation", "image", "pdf", "other"]
RegistrationStatus = Literal["registered", "waitlisted", "cancelled", "checked_in"]


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    avatar_url: str | None = None
    auth_provider: str = "supabase"
    role: UserRole = "student"
    faculty_id: str | None = None
    department_id: str | None = None
    student_domain_verified: bool = False
    created_at: datetime


class LookupResponse(BaseModel):
    id: str
    name: str
    short_name: str | None = None


class VenueCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    address: str | None = None
    building: str | None = None
    room: str | None = None
    city: str | None = None
    maps_url: str | None = None

    @field_validator("name", "address", "building", "room", "city", "maps_url")
    @classmethod
    def clean_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None
