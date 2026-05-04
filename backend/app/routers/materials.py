from __future__ import annotations

import base64
import binascii
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status

from ..schemas import MaterialCreateRequest, MaterialResponse, MaterialUploadRequest, UserResponse
from ..services import EventsService, get_events_service
from .auth import get_current_user

router = APIRouter(prefix="/events/{event_id}/materials", tags=["materials"])


@router.get("", response_model=list[MaterialResponse])
def list_materials(
    event_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
) -> list[MaterialResponse]:
    return events_service.list_materials(event_id)


@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    event_id: str,
    payload: MaterialCreateRequest,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> MaterialResponse:
    return events_service.create_material(event_id, payload, current_user)


@router.post("/upload", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def upload_material(
    event_id: str,
    payload: MaterialUploadRequest,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> MaterialResponse:
    try:
        content = base64.b64decode(payload.content_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Fisier invalid.") from exc

    return events_service.upload_material_file(
        event_id=event_id,
        material_type=payload.material_type,
        title=payload.title,
        file_name=payload.file_name,
        content_type=payload.content_type,
        content=content,
        current_user=current_user,
    )


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    event_id: str,
    material_id: str,
    events_service: Annotated[EventsService, Depends(get_events_service)],
    current_user: Annotated[UserResponse, Depends(get_current_user)],
) -> Response:
    events_service.delete_material(event_id, material_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
