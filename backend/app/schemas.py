from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    avatar_url: str | None
    auth_provider: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_at: int | None = None
    user: UserResponse


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str) -> str:
        return value.strip()


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=20)


class EventCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str | None = None
    location: str | None = Field(default=None, max_length=255)
    starts_at: datetime
    ends_at: datetime | None = None
    max_participants: int | None = Field(default=None, gt=0)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        return value.strip()

    @field_validator("description", "location")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("starts_at", "ends_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("datetime values must include timezone information")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be later than starts_at")
        return self


class EventResponse(BaseModel):
    id: str
    title: str
    description: str | None
    location: str | None
    starts_at: datetime
    ends_at: datetime | None
    max_participants: int | None
    created_at: datetime
    creator_id: str
    creator_name: str
    registration_count: int
    is_full: bool
