from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from ..schemas import (
    EventCreateRequest,
    EventFilterParams,
    EventResponse,
    EventStatsResponse,
    EventUpdateRequest,
    ParticipationMode,
    UserResponse,
)
from ..services import EventsService, get_events_service
from .auth import get_current_user

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventResponse])
def list_events(
    events_service: Annotated[EventsService, Depends(get_events_service)],
    q: Annotated[str | None, Query()] = None,
    faculty_id: Annotated[str | None, Query()] = None,
    department_id: Annotated[str | None, Query()] = None,
    category_id: Annotated[str | None, Query()] = None,
    venue_id: Annotated[str | None, Query()] = None,
    organizer: Annotated[str | None, Query()] = None,
    participation_mode: Annotated[ParticipationMode | None, Query()] = None,
    is_free: Annotated[bool | None, Query()] = None,
    registration_required: Annotated[bool | None, Query()] = None,
    starts_from: Annotated[datetime | None, Query()] = None,
    starts_until: Annotated[datetime | None, Query()] = None,
) -> list[EventResponse]:
    filters = EventFilterParams(
        q=q,
        faculty_id=faculty_id,
        department_id=department_id,
        category_id=category_id,
        venue_id=venue_id,
        organizer=organizer,
        participation_mode=participation_mode,
        is_free=is_free,
        registration_required=registration_required,
        starts_from=starts_from,
        starts_until=starts_until,
        status="published",
    )
    return events_service.list_events(filters)


@router.get("/manage/mine", response_model=list[EventResponse])
def list_managed_events(
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> list[EventResponse]:
    return events_service.list_managed_events(current_user)


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
) -> EventResponse:
    return events_service.get_event(event_id)


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreateRequest,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> EventResponse:
    return events_service.create_event(payload, current_user)


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: str,
    payload: EventUpdateRequest,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> EventResponse:
    return events_service.update_event(event_id, payload, current_user)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> Response:
    events_service.delete_event(event_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{event_id}/stats", response_model=EventStatsResponse)
def get_event_stats(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> EventStatsResponse:
    return events_service.get_event_stats(event_id, current_user)


@router.get("/{event_id}/calendar.ics")
def export_event_ics(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
) -> Response:
    ics_body = events_service.export_event_ics(event_id)
    return Response(
        content=ics_body,
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="event-{event_id}.ics"'},
    )


@router.get("/{event_id}/google-calendar")
def get_google_calendar_link(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
) -> dict[str, str]:
    return {"url": events_service.get_google_calendar_url(event_id)}
