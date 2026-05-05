from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class AdminRejectEventRequest(BaseModel):
    """Reason supplied by an admin when rejecting an event."""

    rejection_reason: str = Field(min_length=1, max_length=1000)

    @field_validator("rejection_reason")
    @classmethod
    def clean_reason(cls, value: str) -> str:
        return value.strip()


class AdminReportResponse(BaseModel):
    """Aggregate metrics returned by the administrator report endpoint."""

    events_total: int
    events_by_status: dict[str, int]
    registrations_total: int
    average_feedback_rating: float | None = None
