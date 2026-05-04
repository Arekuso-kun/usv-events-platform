from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from ..schemas import (
    AdminRejectEventRequest,
    AdminReportResponse,
    EventResponse,
    OrganizerCreateRequest,
    UserResponse,
    UserUpdateRequest,
)
from ..services import AdminService, get_admin_service
from .auth import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/events/pending", response_model=list[EventResponse])
def list_pending_events(
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> list[EventResponse]:
    return admin_service.list_pending_events(current_user)


@router.post("/events/{event_id}/approve", response_model=EventResponse)
def approve_event(
    event_id: str,
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> EventResponse:
    return admin_service.approve_event(event_id, current_user)


@router.post("/events/{event_id}/reject", response_model=EventResponse)
def reject_event(
    event_id: str,
    payload: AdminRejectEventRequest,
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> EventResponse:
    return admin_service.reject_event(event_id, payload, current_user)


@router.get("/users/organizers", response_model=list[UserResponse])
def list_organizers(
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> list[UserResponse]:
    return admin_service.list_organizers(current_user)


@router.post("/users/organizers", response_model=UserResponse, status_code=201)
def create_organizer(
    payload: OrganizerCreateRequest,
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> UserResponse:
    return admin_service.create_organizer(payload, current_user)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> UserResponse:
    return admin_service.update_user(user_id, payload, current_user)


@router.get("/reports/summary", response_model=AdminReportResponse)
def get_summary_report(
    admin_service: Annotated[AdminService, Depends(get_admin_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> AdminReportResponse:
    return admin_service.get_summary_report(current_user)
