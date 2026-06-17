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


class RefreshTokenRequest(BaseModel):
    """Refresh token payload used to renew an expired access token."""

    refresh_token: str = Field(min_length=1)

    @field_validator("refresh_token")
    @classmethod
    def clean_refresh_token(cls, value: str) -> str:
        return value.strip()


class RegisterRequest(LoginRequest):
    """Student self-registration payload."""

    full_name: str = Field(min_length=1, max_length=255)
    faculty_id: str | None = None
    department_id: str | None = None

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str) -> str:
        return value.strip()


class OrganizerCreateRequest(BaseModel):
    """Admin-created organizer invitation payload."""

    email: str
    full_name: str = Field(min_length=1, max_length=255)
    faculty_id: str | None = None
    department_id: str | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, value: str) -> str:
        return value.strip()


class PasswordUpdateRequest(BaseModel):
    """Password chosen by an invited organizer after accepting the invite."""

    password: str = Field(min_length=8, max_length=128)


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
