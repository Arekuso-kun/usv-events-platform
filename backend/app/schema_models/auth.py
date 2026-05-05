from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from .common import UserResponse, UserRole


class TokenResponse(BaseModel):
    """Authentication response containing tokens and the current user profile."""

    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_at: int | None = None
    user: UserResponse


class LoginRequest(BaseModel):
    """Email/password credentials used for local authentication."""

    email: str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class RegisterRequest(LoginRequest):
    """Student self-registration payload."""

    full_name: str = Field(min_length=1, max_length=255)
    faculty_id: str | None = None
    department_id: str | None = None

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str) -> str:
        return value.strip()


class OrganizerCreateRequest(RegisterRequest):
    """Admin-created staff account payload for organizers and admins."""

    role: UserRole = "organizer"

    @field_validator("role")
    @classmethod
    def require_staff_role(cls, value: UserRole) -> UserRole:
        if value == "student":
            raise ValueError("organizer accounts must use organizer or admin role")
        return value


class UserUpdateRequest(BaseModel):
    """Partial profile update payload for administrator user management."""

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    role: UserRole | None = None
    faculty_id: str | None = None
    department_id: str | None = None

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str | None) -> str | None:
        return value.strip() if value else value


class GoogleLoginRequest(BaseModel):
    """Google Sign-In token payload sent by the frontend."""

    id_token: str = Field(min_length=20)
