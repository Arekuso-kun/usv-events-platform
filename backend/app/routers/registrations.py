from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from ..schemas import EventResponse, RegistrationResponse, UserResponse
from ..services import EventsService, get_events_service
from .auth import get_current_user

router = APIRouter(prefix="/events/{event_id}", tags=["registrations"])


@router.post("/register", response_model=EventResponse)
def register_for_event(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> EventResponse:
    return events_service.register_for_event(event_id, current_user)


@router.get("/registration/me", response_model=RegistrationResponse | None)
def get_my_event_registration(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> RegistrationResponse | None:
    return events_service.get_my_registration(event_id, current_user)


@router.get("/registrations", response_model=list[RegistrationResponse])
def list_event_registrations(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> list[RegistrationResponse]:
    return events_service.list_registrations(event_id, current_user)


@router.get("/registrations/export")
def export_event_registrations(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> Response:
    csv_body = events_service.export_registrations_csv(event_id, current_user)
    return Response(
        content=csv_body,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="event-{event_id}-registrations.csv"'
        },
    )


@router.post(
    "/registrations/{registration_id}/check-in",
    response_model=RegistrationResponse,
    status_code=status.HTTP_200_OK,
)
def check_in_registration(
    event_id: str,
    registration_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> RegistrationResponse:
    return events_service.check_in_registration(event_id, registration_id, current_user)
