from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status

from ..schemas import EventCreateRequest, EventResponse, UserResponse
from ..services import EventsService, get_events_service
from .auth import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventResponse])
def list_events(
    events_service: Annotated[EventsService, Depends(get_events_service)],
) -> list[EventResponse]:
    return events_service.list_events()


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreateRequest,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> EventResponse:
    return events_service.create_event(payload, current_user)


@router.post("/{event_id}/register", response_model=EventResponse)
def register_for_event(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> EventResponse:
    return events_service.register_for_event(event_id, current_user)
