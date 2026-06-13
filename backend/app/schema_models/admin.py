from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class AdminRejectEventRequest(BaseModel):
    """Reason supplied by an admin when rejecting an event."""

    rejection_reason: str = Field(min_length=1, max_length=1000)

    @field_validator("rejection_reason")
    @classmethod
    def clean_reason(cls, value: str) -> str:
        return value.strip()


class AdminMonthlyEventReportItem(BaseModel):
    """Monthly event count used by administrator reports."""

    month: str
    count: int = Field(ge=0)


class AdminOrganizerReportItem(BaseModel):
    """Event count grouped by creator account."""

    organizer_id: str
    organizer_name: str
    count: int = Field(ge=0)


class AdminReportResponse(BaseModel):
    """Aggregate metrics returned by the administrator report endpoint."""

    events_total: int
    events_by_status: dict[str, int]
    events_by_month: list[AdminMonthlyEventReportItem] = Field(default_factory=list)
    events_by_organizer: list[AdminOrganizerReportItem] = Field(default_factory=list)
    registrations_total: int
    average_participation: float = 0
    average_feedback_rating: float | None = None
