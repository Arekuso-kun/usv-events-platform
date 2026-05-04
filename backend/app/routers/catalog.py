from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ..schemas import LookupResponse, UserResponse, VenueCreateRequest
from ..services import EventsService, get_events_service
from .auth import get_current_user

router = APIRouter(tags=["catalog"])


@router.get("/faculties", response_model=list[LookupResponse])
def list_faculties(
    events_service: Annotated[EventsService, Depends(get_events_service)],
) -> list[LookupResponse]:
    return events_service.list_faculties()


@router.get("/departments", response_model=list[LookupResponse])
def list_departments(
    events_service: Annotated[EventsService, Depends(get_events_service)],
    faculty_id: Annotated[str | None, Query()] = None,
) -> list[LookupResponse]:
    return events_service.list_departments(faculty_id)


@router.get("/venues", response_model=list[LookupResponse])
def list_venues(
    events_service: Annotated[EventsService, Depends(get_events_service)],
) -> list[LookupResponse]:
    return events_service.list_venues()


@router.post("/venues", response_model=LookupResponse, status_code=201)
def create_venue(
    payload: VenueCreateRequest,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> LookupResponse:
    return events_service.create_venue(payload, current_user)


@router.get("/categories", response_model=list[LookupResponse])
def list_categories(
    events_service: Annotated[EventsService, Depends(get_events_service)],
) -> list[LookupResponse]:
    return events_service.list_categories()
