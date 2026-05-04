from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status

from ..schemas import FeedbackCreateRequest, FeedbackResponse, UserResponse
from ..services import EventsService, get_events_service
from .auth import get_current_user

router = APIRouter(prefix="/events/{event_id}/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(
    event_id: str,
    payload: FeedbackCreateRequest,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> FeedbackResponse:
    return events_service.create_feedback(event_id, payload, current_user)
