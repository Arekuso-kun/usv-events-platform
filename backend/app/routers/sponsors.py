from __future__ import annotations

import base64
import binascii
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..schemas import (
    EventResponse,
    EventSponsorLinkRequest,
    SponsorCreateRequest,
    SponsorLogoUploadRequest,
    SponsorResponse,
    UserResponse,
)
from ..services import EventsService, get_events_service
from .auth import get_current_user

router = APIRouter(tags=["sponsors"])


@router.get("/sponsors", response_model=list[SponsorResponse])
def list_sponsors(
    events_service: Annotated[EventsService, Depends(get_events_service)],
) -> list[SponsorResponse]:
    return events_service.list_sponsors()


@router.post("/sponsors", response_model=SponsorResponse, status_code=201)
def create_sponsor(
    payload: SponsorCreateRequest,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> SponsorResponse:
    return events_service.create_sponsor(payload, current_user)


@router.post("/sponsors/upload-logo", response_model=SponsorResponse, status_code=201)
def create_sponsor_with_logo(
    payload: SponsorLogoUploadRequest,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> SponsorResponse:
    try:
        content = base64.b64decode(payload.content_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Fisier invalid.") from exc

    return events_service.create_sponsor_with_logo_file(payload, content, current_user)


@router.post("/events/{event_id}/sponsors", response_model=EventResponse, status_code=201)
def link_event_sponsor(
    event_id: str,
    payload: EventSponsorLinkRequest,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> EventResponse:
    return events_service.link_event_sponsor(event_id, payload, current_user)


@router.delete("/events/{event_id}/sponsors/{sponsor_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_event_sponsor(
    event_id: str,
    sponsor_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> Response:
    events_service.unlink_event_sponsor(event_id, sponsor_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
