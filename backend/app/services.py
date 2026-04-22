from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol

from fastapi import HTTPException, status

from .config import get_settings
from .schemas import EventCreateRequest, EventResponse, TokenResponse, UserResponse
from .supabase_client import get_supabase_anon_client, get_supabase_service_client


class AuthService(Protocol):
    def register(self, email: str, password: str, full_name: str) -> TokenResponse: ...

    def login(self, email: str, password: str) -> TokenResponse: ...

    def google_sign_in(self, id_token: str) -> TokenResponse: ...

    def get_user_from_token(self, access_token: str) -> UserResponse: ...


class EventsService(Protocol):
    def list_events(self) -> list[EventResponse]: ...

    def create_event(
        self, payload: EventCreateRequest, current_user: UserResponse
    ) -> EventResponse: ...

    def register_for_event(
        self, event_id: str, current_user: UserResponse
    ) -> EventResponse: ...


@dataclass
class SupabaseService(AuthService, EventsService):
    def register(self, email: str, password: str, full_name: str) -> TokenResponse:
        try:
            get_supabase_service_client().auth.admin.create_user(
                {
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"full_name": full_name},
                }
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration failed: {self._stringify_error(exc)}",
            ) from exc

        return self.login(email, password)

    def login(self, email: str, password: str) -> TokenResponse:
        client = get_supabase_anon_client()

        try:
            response = client.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid email or password: {self._stringify_error(exc)}",
            ) from exc

        return self._build_token_response(response)

    def google_sign_in(self, id_token: str) -> TokenResponse:
        client = get_supabase_anon_client()

        try:
            response = client.auth.sign_in_with_id_token(
                {"provider": "google", "token": id_token}
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google Sign-In failed: {self._stringify_error(exc)}",
            ) from exc

        return self._build_token_response(response)

    def get_user_from_token(self, access_token: str) -> UserResponse:
        client = get_supabase_anon_client()

        try:
            response = client.auth.get_user(access_token)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired access token: {self._stringify_error(exc)}",
            ) from exc

        user = self._extract_user(response)
        return self._serialize_user(user)

    def list_events(self) -> list[EventResponse]:
        settings = get_settings()
        response = (
            get_supabase_service_client()
            .table(settings.supabase_events_table)
            .select("*")
            .order("starts_at")
            .execute()
        )

        return [self._serialize_event(row) for row in response.data or []]

    def create_event(
        self, payload: EventCreateRequest, current_user: UserResponse
    ) -> EventResponse:
        settings = get_settings()
        insert_payload = {
            "title": payload.title,
            "description": payload.description,
            "location": payload.location,
            "starts_at": payload.starts_at.isoformat(),
            "ends_at": payload.ends_at.isoformat() if payload.ends_at else None,
            "max_participants": payload.max_participants,
            "registration_count": 0,
            "creator_id": current_user.id,
            "creator_name": current_user.full_name,
        }

        response = (
            get_supabase_service_client()
            .table(settings.supabase_events_table)
            .insert(insert_payload)
            .execute()
        )

        event = self._first_row(response)
        return self._serialize_event(event)

    def register_for_event(
        self, event_id: str, current_user: UserResponse
    ) -> EventResponse:
        settings = get_settings()
        service_client = get_supabase_service_client()
        event = self._get_event_or_404(event_id)

        existing_registration = (
            service_client.table(settings.supabase_event_registrations_table)
            .select("*")
            .eq("event_id", event_id)
            .eq("user_id", current_user.id)
            .limit(1)
            .execute()
        )
        if existing_registration.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You are already registered for this event.",
            )

        current_count = int(event.get("registration_count") or 0)
        max_participants = event.get("max_participants")
        if max_participants is not None and current_count >= int(max_participants):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This event has reached the maximum number of participants.",
            )

        try:
            (
                service_client.table(settings.supabase_event_registrations_table)
                .insert({"event_id": event_id, "user_id": current_user.id})
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Could not register for the event: {self._stringify_error(exc)}",
            ) from exc

        updated_response = (
            service_client.table(settings.supabase_events_table)
            .update({"registration_count": current_count + 1})
            .eq("id", event_id)
            .execute()
        )

        updated_event = self._first_row(updated_response)
        return self._serialize_event(updated_event)

    def _build_token_response(self, auth_response: Any) -> TokenResponse:
        session = self._extract_session(auth_response)
        user = self._extract_user(auth_response)

        access_token = getattr(session, "access_token", None)
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase did not return an access token.",
            )

        return TokenResponse(
            access_token=access_token,
            refresh_token=getattr(session, "refresh_token", None),
            expires_at=getattr(session, "expires_at", None),
            user=self._serialize_user(user),
        )

    def _get_event_or_404(self, event_id: str) -> dict[str, Any]:
        settings = get_settings()
        response = (
            get_supabase_service_client()
            .table(settings.supabase_events_table)
            .select("*")
            .eq("id", event_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found.",
            )
        return response.data[0]

    @staticmethod
    def _first_row(response: Any) -> dict[str, Any]:
        if not getattr(response, "data", None):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase returned an empty response.",
            )
        return response.data[0]

    @staticmethod
    def _extract_session(response: Any):
        session = getattr(response, "session", None)
        if session is None and hasattr(response, "data"):
            session = getattr(response.data, "session", None)
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase did not return a session.",
            )
        return session

    @staticmethod
    def _extract_user(response: Any):
        user = getattr(response, "user", None)
        if user is None and hasattr(response, "data"):
            user = getattr(response.data, "user", None)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase did not return a user profile.",
            )
        return user

    def _serialize_user(self, user: Any) -> UserResponse:
        metadata = self._as_dict(getattr(user, "user_metadata", None))
        app_metadata = self._as_dict(getattr(user, "app_metadata", None))
        created_at = getattr(user, "created_at", None)

        return UserResponse(
            id=str(getattr(user, "id")),
            email=str(getattr(user, "email")),
            full_name=metadata.get("full_name")
            or metadata.get("name")
            or str(getattr(user, "email")).split("@")[0],
            avatar_url=metadata.get("avatar_url") or metadata.get("picture"),
            auth_provider=str(app_metadata.get("provider") or "supabase"),
            created_at=self._parse_datetime(created_at),
        )

    def _serialize_event(self, row: dict[str, Any]) -> EventResponse:
        registration_count = int(row.get("registration_count") or 0)
        max_participants = row.get("max_participants")
        is_full = max_participants is not None and registration_count >= int(
            max_participants
        )

        return EventResponse(
            id=str(row["id"]),
            title=str(row["title"]),
            description=row.get("description"),
            location=row.get("location"),
            starts_at=self._parse_datetime(row["starts_at"]),
            ends_at=(
                self._parse_datetime(row["ends_at"]) if row.get("ends_at") else None
            ),
            max_participants=(
                int(max_participants) if max_participants is not None else None
            ),
            created_at=self._parse_datetime(row["created_at"]),
            creator_id=str(row["creator_id"]),
            creator_name=str(row["creator_name"]),
            registration_count=registration_count,
            is_full=is_full,
        )

    @staticmethod
    def _parse_datetime(value: Any) -> datetime:
        if isinstance(value, datetime):
            return value
        if isinstance(value, str):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase returned an invalid datetime value.",
        )

    @staticmethod
    def _as_dict(value: Any) -> dict[str, Any]:
        if value is None:
            return {}
        if isinstance(value, dict):
            return value
        if hasattr(value, "model_dump"):
            return value.model_dump()
        if hasattr(value, "__dict__"):
            return dict(value.__dict__)
        return {}

    @staticmethod
    def _stringify_error(exc: Exception) -> str:
        return str(exc).strip() or exc.__class__.__name__


def get_auth_service() -> AuthService:
    return SupabaseService()


def get_events_service() -> EventsService:
    return SupabaseService()
