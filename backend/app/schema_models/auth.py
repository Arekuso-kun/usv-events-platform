from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from .common import UserResponse, UserRole


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


class RegisterRequest(LoginRequest):
    full_name: str = Field(min_length=1, max_length=255)
    faculty_id: str | None = None
    department_id: str | None = None

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str) -> str:
        return value.strip()


class OrganizerCreateRequest(RegisterRequest):
    role: UserRole = "organizer"

    @field_validator("role")
    @classmethod
    def require_staff_role(cls, value: UserRole) -> UserRole:
        if value == "student":
            raise ValueError("organizer accounts must use organizer or admin role")
        return value


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: UserRole | None = None
    faculty_id: str | None = None
    department_id: str | None = None

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str | None) -> str | None:
        return value.strip() if value else value


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=20)
