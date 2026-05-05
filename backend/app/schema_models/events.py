from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator, model_validator

from .common import EventStatus, MaterialType, ParticipationMode, RegistrationStatus


class EventFilterParams(BaseModel):
    """Query parameters used to filter public event listings."""

    q: str | None = None
    faculty_id: str | None = None
    department_id: str | None = None
    category_id: str | None = None
    venue_id: str | None = None
    organizer: str | None = None
    participation_mode: ParticipationMode | None = None
    is_free: bool | None = None
    registration_required: bool | None = None
    starts_from: datetime | None = None
    starts_until: datetime | None = None
    status: EventStatus | None = None

    @field_validator("q", "organizer")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class EventBase(BaseModel):
    """Shared event fields and validation rules for create/update flows."""

    title: str = Field(min_length=3, max_length=255)
    description: str | None = None
    starts_at: datetime
    ends_at: datetime | None = None
    venue_id: str | None = None
    category_id: str | None = None
    participation_mode: ParticipationMode = "physical"
    faculty_id: str | None = None
    department_id: str | None = None
    registration_required: bool = False
    registration_url: str | None = None
    registration_deadline: datetime | None = None
    max_participants: int | None = Field(default=None, gt=0)
    is_free: bool = True

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        return value.strip()

    @field_validator("description", "registration_url")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("starts_at", "ends_at", "registration_deadline")
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
        if self.registration_deadline and self.registration_deadline >= self.starts_at:
            raise ValueError("registration_deadline must be before starts_at")
        return self


class EventCreateRequest(EventBase):
    """Payload used by organizers and admins to create an event."""

    status: EventStatus = "pending_approval"


class EventUpdateRequest(BaseModel):
    """Partial event payload used by organizers and admins for edits."""

    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    venue_id: str | None = None
    category_id: str | None = None
    participation_mode: ParticipationMode | None = None
    faculty_id: str | None = None
    department_id: str | None = None
    registration_required: bool | None = None
    registration_url: str | None = None
    registration_deadline: datetime | None = None
    max_participants: int | None = Field(default=None, gt=0)
    is_free: bool | None = None
    status: EventStatus | None = None

    @field_validator("title", "description", "registration_url")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("starts_at", "ends_at", "registration_deadline")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("datetime values must include timezone information")
        return value


class SponsorResponse(BaseModel):
    """Sponsor record exposed through sponsor and event endpoints."""

    id: str
    name: str
    logo_url: str | None = None
    website_url: str | None = None


class EventSponsorLinkRequest(BaseModel):
    sponsor_id: str
    display_order: int | None = Field(default=None, ge=0)


class SponsorCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    logo_url: str | None = None
    website_url: str | None = None

    @field_validator("name", "logo_url", "website_url")
    @classmethod
    def clean_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class SponsorLogoUploadRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    file_name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(default="application/octet-stream", min_length=1)
    content_base64: str = Field(min_length=1)
    website_url: str | None = None

    @field_validator("name", "file_name", "content_type", "content_base64", "website_url")
    @classmethod
    def clean_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class MaterialCreateRequest(BaseModel):
    """Metadata payload for linking an already uploaded event material."""

    material_type: MaterialType
    title: str = Field(min_length=1, max_length=255)
    file_url: str = Field(min_length=1)
    file_name: str | None = None
    file_size_bytes: int | None = Field(default=None, ge=0)

    @field_validator("title", "file_url", "file_name")
    @classmethod
    def clean_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class MaterialUploadRequest(BaseModel):
    """Base64 upload payload for event material files."""

    material_type: MaterialType
    title: str = Field(min_length=1, max_length=255)
    file_name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(default="application/octet-stream", min_length=1)
    content_base64: str = Field(min_length=1)

    @field_validator("title", "file_name", "content_type", "content_base64")
    @classmethod
    def clean_upload_text(cls, value: str) -> str:
        return value.strip()


class MaterialResponse(BaseModel):
    id: str
    event_id: str
    uploaded_by: str
    material_type: MaterialType
    title: str
    file_url: str
    file_name: str | None = None
    file_size_bytes: int | None = None
    created_at: datetime


class FeedbackCreateRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = None

    @field_validator("comment")
    @classmethod
    def clean_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class FeedbackResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    rating: int
    comment: str | None = None
    created_at: datetime
    updated_at: datetime


class RegistrationResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    user_name: str | None = None
    user_email: str | None = None
    status: RegistrationStatus
    registered_at: datetime
    cancelled_at: datetime | None = None
    checked_in_at: datetime | None = None


class EventStatsResponse(BaseModel):
    event_id: str
    registration_count: int
    checked_in_count: int
    feedback_count: int
    average_rating: float | None = None


class EventResponse(BaseModel):
    """Complete event representation returned to frontend clients."""

    id: str
    title: str
    description: str | None
    venue_id: str | None
    venue_name: str | None
    starts_at: datetime
    ends_at: datetime | None
    category_id: str | None = None
    category_name: str | None = None
    participation_mode: ParticipationMode = "physical"
    faculty_id: str | None
    faculty_name: str | None = None
    department_id: str | None
    department_name: str | None = None
    registration_required: bool = False
    registration_url: str | None = None
    registration_deadline: datetime | None = None
    max_participants: int | None
    is_free: bool = True
    status: EventStatus = "draft"
    creator_id: str
    creator_full_name: str
    approved_by: str | None = None
    approved_at: datetime | None = None
    rejection_reason: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    registration_count: int
    is_full: bool
    sponsors: list[SponsorResponse] = []
    materials: list[MaterialResponse] = []
