from __future__ import annotations

import csv
import re
from uuid import uuid4
from dataclasses import dataclass
from datetime import UTC, datetime
from io import StringIO
from typing import Any, Protocol
from urllib.parse import quote, quote_plus, urlencode, urlparse

from fastapi import HTTPException, status

from .config import get_settings
from .schemas import (
    AdminRejectEventRequest,
    AdminReportResponse,
    EventCreateRequest,
    EventFilterParams,
    EventResponse,
    EventSponsorLinkRequest,
    EventStatsResponse,
    EventUpdateRequest,
    FeedbackCreateRequest,
    FeedbackResponse,
    LookupResponse,
    MaterialCreateRequest,
    MaterialResponse,
    OrganizerCreateRequest,
    PasswordUpdateRequest,
    RegistrationResponse,
    SponsorCreateRequest,
    SponsorLogoUploadRequest,
    SponsorResponse,
    TokenResponse,
    UserResponse,
    UserUpdateRequest,
    VenueCreateRequest,
)
from .supabase_client import get_supabase_anon_client, get_supabase_service_client


class AuthService(Protocol):
    """Authentication contract used by FastAPI routers."""

    def register(self, email: str, password: str, full_name: str) -> TokenResponse: ...

    def login(self, email: str, password: str) -> TokenResponse: ...

    def get_google_sign_in_url(self, redirect_to: str | None) -> str: ...

    def google_sign_in(self, id_token: str) -> TokenResponse: ...

    def get_user_from_token(self, access_token: str) -> UserResponse: ...

    def update_password(
        self, payload: PasswordUpdateRequest, current_user: UserResponse
    ) -> UserResponse: ...


class EventsService(Protocol):
    """Event, registration, material, sponsor, and feedback service contract."""

    def list_events(
        self, filters: EventFilterParams | None = None
    ) -> list[EventResponse]: ...

    def list_managed_events(
        self, current_user: UserResponse
    ) -> list[EventResponse]: ...

    def get_event(self, event_id: str) -> EventResponse: ...

    def create_event(
        self, payload: EventCreateRequest, current_user: UserResponse
    ) -> EventResponse: ...

    def update_event(
        self, event_id: str, payload: EventUpdateRequest, current_user: UserResponse
    ) -> EventResponse: ...

    def delete_event(self, event_id: str, current_user: UserResponse) -> None: ...

    def register_for_event(
        self, event_id: str, current_user: UserResponse
    ) -> EventResponse: ...

    def get_my_registration(
        self, event_id: str, current_user: UserResponse
    ) -> RegistrationResponse | None: ...

    def list_registrations(
        self, event_id: str, current_user: UserResponse
    ) -> list[RegistrationResponse]: ...

    def export_registrations_csv(
        self, event_id: str, current_user: UserResponse
    ) -> str: ...

    def check_in_registration(
        self, event_id: str, registration_id: str, current_user: UserResponse
    ) -> RegistrationResponse: ...

    def create_feedback(
        self, event_id: str, payload: FeedbackCreateRequest, current_user: UserResponse
    ) -> FeedbackResponse: ...

    def list_materials(self, event_id: str) -> list[MaterialResponse]: ...

    def create_material(
        self, event_id: str, payload: MaterialCreateRequest, current_user: UserResponse
    ) -> MaterialResponse: ...

    def upload_material_file(
        self,
        event_id: str,
        material_type: str,
        title: str,
        file_name: str,
        content_type: str,
        content: bytes,
        current_user: UserResponse,
    ) -> MaterialResponse: ...

    def delete_material(
        self, event_id: str, material_id: str, current_user: UserResponse
    ) -> None: ...

    def get_event_stats(
        self, event_id: str, current_user: UserResponse
    ) -> EventStatsResponse: ...

    def export_event_ics(self, event_id: str) -> str: ...

    def get_google_calendar_url(self, event_id: str) -> str: ...

    def create_venue(
        self, payload: VenueCreateRequest, current_user: UserResponse
    ) -> LookupResponse: ...

    def list_sponsors(self) -> list[SponsorResponse]: ...

    def create_sponsor(
        self, payload: SponsorCreateRequest, current_user: UserResponse
    ) -> SponsorResponse: ...

    def create_sponsor_with_logo_file(
        self,
        payload: SponsorLogoUploadRequest,
        content: bytes,
        current_user: UserResponse,
    ) -> SponsorResponse: ...


class AdminService(Protocol):
    """Administrative event approval and reporting service contract."""

    def list_pending_events(
        self, current_user: UserResponse
    ) -> list[EventResponse]: ...

    def approve_event(
        self, event_id: str, current_user: UserResponse
    ) -> EventResponse: ...

    def reject_event(
        self,
        event_id: str,
        payload: AdminRejectEventRequest,
        current_user: UserResponse,
    ) -> EventResponse: ...

    def list_organizers(self, current_user: UserResponse) -> list[UserResponse]: ...

    def create_organizer(
        self, payload: OrganizerCreateRequest, current_user: UserResponse
    ) -> UserResponse: ...

    def update_user(
        self, user_id: str, payload: UserUpdateRequest, current_user: UserResponse
    ) -> UserResponse: ...

    def get_summary_report(self, current_user: UserResponse) -> AdminReportResponse: ...


@dataclass
class SupabaseService(AuthService, EventsService, AdminService):
    """Supabase-backed implementation for all backend business workflows."""

    def register(self, email: str, password: str, full_name: str) -> TokenResponse:
        user = self._create_auth_user(email, password, full_name)
        self._upsert_profile(
            {
                "id": str(getattr(user, "id")),
                "email": email,
                "full_name": full_name,
                "role": "student",
                "student_domain_verified": email.endswith("@student.usv.ro"),
            }
        )
        return self.login(email, password)

    def login(self, email: str, password: str) -> TokenResponse:
        try:
            response = get_supabase_anon_client().auth.sign_in_with_password(
                {"email": email, "password": password}
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid email or password: {self._stringify_error(exc)}",
            ) from exc

        return self._build_token_response(response)

    def get_google_sign_in_url(self, redirect_to: str | None) -> str:
        safe_redirect = self._normalize_redirect_url(redirect_to)

        try:
            response = get_supabase_anon_client().auth.sign_in_with_oauth(
                {
                    "provider": "google",
                    "options": {
                        "redirect_to": safe_redirect,
                        "query_params": {
                            "access_type": "offline",
                            "hd": "student.usv.ro",
                            "prompt": "select_account",
                        },
                    },
                }
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Could not initialize Google OAuth: {self._stringify_error(exc)}",
            ) from exc

        auth_url = self._extract_oauth_url(response)
        if not auth_url:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase did not return an OAuth URL.",
            )
        return auth_url

    def google_sign_in(self, id_token: str) -> TokenResponse:
        try:
            response = get_supabase_anon_client().auth.sign_in_with_id_token(
                {"provider": "google", "token": id_token}
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google Sign-In failed: {self._stringify_error(exc)}",
            ) from exc

        token_response = self._build_token_response(response)
        if not token_response.user.email.endswith("@student.usv.ro"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Google login is restricted to @student.usv.ro accounts.",
            )
        self._upsert_profile(
            {
                "id": token_response.user.id,
                "email": token_response.user.email,
                "full_name": token_response.user.full_name,
                "role": "student",
                "student_domain_verified": True,
            }
        )
        return token_response.model_copy(
            update={"user": token_response.user.model_copy(update={"role": "student"})}
        )

    def get_user_from_token(self, access_token: str) -> UserResponse:
        try:
            response = get_supabase_anon_client().auth.get_user(access_token)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired access token: {self._stringify_error(exc)}",
            ) from exc

        user = self._extract_user(response)
        return self._serialize_user(user)

    def update_password(
        self, payload: PasswordUpdateRequest, current_user: UserResponse
    ) -> UserResponse:
        try:
            response = get_supabase_service_client().auth.admin.update_user_by_id(
                current_user.id,
                {"password": payload.password},
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not update password: {self._stringify_error(exc)}",
            ) from exc

        return self._serialize_user(self._extract_user(response))

    def list_events(
        self, filters: EventFilterParams | None = None
    ) -> list[EventResponse]:
        rows = self._select_all("events", order_by="starts_at")
        creator_full_names = self._profile_name_map(
            self._row_values(rows, "creator_id")
        )
        filtered_rows = self._filter_event_rows(rows, filters, creator_full_names)
        return self._serialize_events(filtered_rows)

    def list_managed_events(self, current_user: UserResponse) -> list[EventResponse]:
        self._require_roles(current_user, {"organizer", "admin"})
        if current_user.role == "admin":
            rows = self._select_all("events", order_by="created_at", order_desc=True)
        else:
            rows = self._select_rows(
                "events",
                column="creator_id",
                values=[current_user.id],
                order_by="created_at",
                order_desc=True,
            )
        return self._serialize_events(rows)

    def get_event(self, event_id: str) -> EventResponse:
        return self._serialize_event(self._get_event_or_404(event_id))

    def create_event(
        self, payload: EventCreateRequest, current_user: UserResponse
    ) -> EventResponse:
        self._require_roles(current_user, {"organizer", "admin"})
        insert_payload = self._event_payload(payload.model_dump(exclude_unset=True))
        insert_payload.setdefault("status", "pending_approval")
        if current_user.role != "admin":
            insert_payload["status"] = "pending_approval"
        insert_payload.update(
            {
                "creator_id": current_user.id,
            }
        )

        response = (
            self._client()
            .table(get_settings().supabase_events_table)
            .insert(insert_payload)
            .execute()
        )
        return self._serialize_event(self._first_row(response))

    def update_event(
        self, event_id: str, payload: EventUpdateRequest, current_user: UserResponse
    ) -> EventResponse:
        event = self._get_event_or_404(event_id)
        self._require_event_manager(event, current_user)

        update_payload = self._event_payload(payload.model_dump(exclude_unset=True))
        if current_user.role != "admin" and update_payload.get("status") in {
            "published",
            "rejected",
            "completed",
        }:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can publish, reject, or complete events.",
            )

        if not update_payload:
            return self._serialize_event(event)

        response = (
            self._client()
            .table(get_settings().supabase_events_table)
            .update(update_payload)
            .eq("id", event_id)
            .execute()
        )
        return self._serialize_event(self._first_row(response))

    def delete_event(self, event_id: str, current_user: UserResponse) -> None:
        event = self._get_event_or_404(event_id)
        self._require_event_manager(event, current_user)
        (
            self._client()
            .table(get_settings().supabase_events_table)
            .delete()
            .eq("id", event_id)
            .execute()
        )

    def register_for_event(
        self, event_id: str, current_user: UserResponse
    ) -> EventResponse:
        event = self._get_event_or_404(event_id)
        if event.get("status") != "published":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only published events accept registrations.",
            )

        existing_registration = (
            self._client()
            .table(get_settings().supabase_event_registrations_table)
            .select("*")
            .eq("event_id", event_id)
            .eq("user_id", current_user.id)
            .neq("status", "cancelled")
            .limit(1)
            .execute()
        )
        if existing_registration.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You are already registered for this event.",
            )

        current_count = self._get_registration_count(event_id)
        max_participants = event.get("max_participants")
        if max_participants is not None and current_count >= int(max_participants):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This event has reached the maximum number of participants.",
            )

        try:
            (
                self._client()
                .table(get_settings().supabase_event_registrations_table)
                .insert({"event_id": event_id, "user_id": current_user.id})
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Could not register for the event: {self._stringify_error(exc)}",
            ) from exc

        return self._serialize_event(self._get_event_or_404(event_id))

    def get_my_registration(
        self, event_id: str, current_user: UserResponse
    ) -> RegistrationResponse | None:
        self._get_event_or_404(event_id)
        response = (
            self._client()
            .table(get_settings().supabase_event_registrations_table)
            .select("*")
            .eq("event_id", event_id)
            .eq("user_id", current_user.id)
            .neq("status", "cancelled")
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return self._serialize_registration(response.data[0])

    def list_registrations(
        self, event_id: str, current_user: UserResponse
    ) -> list[RegistrationResponse]:
        event = self._get_event_or_404(event_id)
        self._require_event_manager(event, current_user)
        rows = self._select_rows(
            "event_registrations",
            column="event_id",
            values=[event_id],
            order_by="registered_at",
        )
        return self._serialize_registrations(rows)

    def export_registrations_csv(
        self, event_id: str, current_user: UserResponse
    ) -> str:
        registrations = self.list_registrations(event_id, current_user)
        buffer = StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            ["id", "user_id", "user_name", "user_email", "status", "registered_at"]
        )
        for item in registrations:
            writer.writerow(
                [
                    item.id,
                    item.user_id,
                    item.user_name or "",
                    item.user_email or "",
                    item.status,
                    item.registered_at.isoformat(),
                ]
            )
        return buffer.getvalue()

    def check_in_registration(
        self, event_id: str, registration_id: str, current_user: UserResponse
    ) -> RegistrationResponse:
        event = self._get_event_or_404(event_id)
        self._require_event_manager(event, current_user)
        response = (
            self._client()
            .table(get_settings().supabase_event_registrations_table)
            .update({"status": "checked_in", "checked_in_at": self._now_iso()})
            .eq("id", registration_id)
            .eq("event_id", event_id)
            .execute()
        )
        return self._serialize_registration(self._first_row(response))

    def create_feedback(
        self, event_id: str, payload: FeedbackCreateRequest, current_user: UserResponse
    ) -> FeedbackResponse:
        event = self._get_event_or_404(event_id)
        end_value = event.get("ends_at") or event.get("starts_at")
        if self._parse_datetime(end_value) > datetime.now(UTC):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Feedback can be submitted only after the event.",
            )

        try:
            response = (
                self._client()
                .table(get_settings().supabase_event_feedback_table)
                .upsert(
                    {
                        "event_id": event_id,
                        "user_id": current_user.id,
                        "rating": payload.rating,
                        "comment": payload.comment,
                    },
                    on_conflict="event_id,user_id",
                )
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Could not save feedback: {self._stringify_error(exc)}",
            ) from exc
        return self._serialize_feedback(self._first_row(response))

    def list_materials(self, event_id: str) -> list[MaterialResponse]:
        self._get_event_or_404(event_id)
        rows = (
            self._client()
            .table(get_settings().supabase_event_materials_table)
            .select("*")
            .eq("event_id", event_id)
            .order("created_at")
            .execute()
            .data
            or []
        )
        return [self._serialize_material(row) for row in rows]

    def create_material(
        self, event_id: str, payload: MaterialCreateRequest, current_user: UserResponse
    ) -> MaterialResponse:
        event = self._get_event_or_404(event_id)
        self._require_event_manager(event, current_user)
        response = (
            self._client()
            .table(get_settings().supabase_event_materials_table)
            .insert(
                {
                    "event_id": event_id,
                    "uploaded_by": current_user.id,
                    **payload.model_dump(),
                }
            )
            .execute()
        )
        return self._serialize_material(self._first_row(response))

    def upload_material_file(
        self,
        event_id: str,
        material_type: str,
        title: str,
        file_name: str,
        content_type: str,
        content: bytes,
        current_user: UserResponse,
    ) -> MaterialResponse:
        event = self._get_event_or_404(event_id)
        self._require_event_manager(event, current_user)
        if not content:
            raise HTTPException(status_code=400, detail="Fisierul este gol.")

        settings = get_settings()
        safe_name = self._safe_storage_name(file_name)
        object_path = f"{event_id}/{uuid4().hex}-{safe_name}"
        try:
            self._client().storage.from_(settings.supabase_materials_bucket).upload(
                path=object_path,
                file=content,
                file_options={
                    "content-type": content_type,
                    "cache-control": "3600",
                    "upsert": "false",
                },
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Could not upload material file. "
                    f"Supabase Storage error: {self._stringify_error(exc)}"
                ),
            ) from exc

        public_url = self._storage_public_url(
            settings.supabase_materials_bucket, object_path
        )
        payload = MaterialCreateRequest(
            material_type=material_type,
            title=title,
            file_url=public_url,
            file_name=file_name,
            file_size_bytes=len(content),
        )
        return self.create_material(event_id, payload, current_user)

    def delete_material(
        self, event_id: str, material_id: str, current_user: UserResponse
    ) -> None:
        event = self._get_event_or_404(event_id)
        self._require_event_manager(event, current_user)
        (
            self._client()
            .table(get_settings().supabase_event_materials_table)
            .delete()
            .eq("id", material_id)
            .eq("event_id", event_id)
            .execute()
        )

    def get_event_stats(
        self, event_id: str, current_user: UserResponse
    ) -> EventStatsResponse:
        event = self._get_event_or_404(event_id)
        self._require_event_manager(event, current_user)
        registrations = self._list_registration_rows(event_id)
        feedback_rows = self._list_feedback_rows(event_id)
        ratings = [int(row["rating"]) for row in feedback_rows if row.get("rating")]
        return EventStatsResponse(
            event_id=event_id,
            registration_count=sum(
                1 for row in registrations if row.get("status") != "cancelled"
            ),
            checked_in_count=sum(
                1 for row in registrations if row.get("status") == "checked_in"
            ),
            feedback_count=len(feedback_rows),
            average_rating=(round(sum(ratings) / len(ratings), 2) if ratings else None),
        )

    def export_event_ics(self, event_id: str) -> str:
        event = self._serialize_event(self._get_event_or_404(event_id))
        starts_at = self._format_ics_datetime(event.starts_at)
        ends_at = self._format_ics_datetime(event.ends_at or event.starts_at)
        description = (event.description or "").replace("\n", "\\n")
        location = event.venue_name or ""
        return "\r\n".join(
            [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//USV Events Platform//EN",
                "BEGIN:VEVENT",
                f"UID:{event.id}@usv-events-platform",
                f"DTSTAMP:{self._format_ics_datetime(datetime.now(UTC))}",
                f"DTSTART:{starts_at}",
                f"DTEND:{ends_at}",
                f"SUMMARY:{event.title}",
                f"DESCRIPTION:{description}",
                f"LOCATION:{location}",
                "END:VEVENT",
                "END:VCALENDAR",
                "",
            ]
        )

    def get_google_calendar_url(self, event_id: str) -> str:
        event = self._serialize_event(self._get_event_or_404(event_id))
        dates = (
            f"{self._format_ics_datetime(event.starts_at)}/"
            f"{self._format_ics_datetime(event.ends_at or event.starts_at)}"
        )
        query = urlencode(
            {
                "action": "TEMPLATE",
                "text": event.title,
                "dates": dates,
                "details": event.description or "",
                "location": event.venue_name or "",
            },
            quote_via=quote_plus,
        )
        return f"https://calendar.google.com/calendar/render?{query}"

    def list_sponsors(self) -> list[SponsorResponse]:
        return [self._serialize_sponsor(row) for row in self._select_all("sponsors")]

    def create_sponsor(
        self, payload: SponsorCreateRequest, current_user: UserResponse
    ) -> SponsorResponse:
        self._require_roles(current_user, {"organizer", "admin"})
        response = (
            self._client()
            .table(get_settings().supabase_sponsors_table)
            .insert(payload.model_dump())
            .execute()
        )
        return self._serialize_sponsor(self._first_row(response))

    def create_sponsor_with_logo_file(
        self,
        payload: SponsorLogoUploadRequest,
        content: bytes,
        current_user: UserResponse,
    ) -> SponsorResponse:
        self._require_roles(current_user, {"organizer", "admin"})
        if not content:
            raise HTTPException(status_code=400, detail="Fisierul este gol.")
        if not payload.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400, detail="Logo-ul trebuie sa fie imagine."
            )

        settings = get_settings()
        safe_name = self._safe_storage_name(payload.file_name)
        object_path = f"{current_user.id}/{uuid4().hex}-{safe_name}"
        try:
            self._client().storage.from_(settings.supabase_sponsor_logos_bucket).upload(
                path=object_path,
                file=content,
                file_options={
                    "content-type": payload.content_type,
                    "cache-control": "3600",
                    "upsert": "false",
                },
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Could not upload sponsor logo. "
                    f"Supabase Storage error: {self._stringify_error(exc)}"
                ),
            ) from exc

        return self.create_sponsor(
            SponsorCreateRequest(
                name=payload.name,
                logo_url=self._storage_public_url(
                    settings.supabase_sponsor_logos_bucket, object_path
                ),
                website_url=payload.website_url,
            ),
            current_user,
        )

    def link_event_sponsor(
        self,
        event_id: str,
        payload: EventSponsorLinkRequest,
        current_user: UserResponse,
    ) -> EventResponse:
        event = self._get_event_or_404(event_id)
        self._require_event_manager(event, current_user)
        (
            self._client()
            .table(get_settings().supabase_event_sponsors_table)
            .upsert(
                {
                    "event_id": event_id,
                    "sponsor_id": payload.sponsor_id,
                    "display_order": payload.display_order,
                },
                on_conflict="event_id,sponsor_id",
            )
            .execute()
        )
        return self._serialize_event(event)

    def unlink_event_sponsor(
        self, event_id: str, sponsor_id: str, current_user: UserResponse
    ) -> None:
        event = self._get_event_or_404(event_id)
        self._require_event_manager(event, current_user)
        (
            self._client()
            .table(get_settings().supabase_event_sponsors_table)
            .delete()
            .eq("event_id", event_id)
            .eq("sponsor_id", sponsor_id)
            .execute()
        )

    def list_faculties(self) -> list[LookupResponse]:
        return [self._serialize_lookup(row) for row in self._select_all("faculties")]

    def list_departments(self, faculty_id: str | None) -> list[LookupResponse]:
        query = (
            self._client().table(get_settings().supabase_departments_table).select("*")
        )
        if faculty_id:
            query = query.eq("faculty_id", faculty_id)
        rows = query.order("name").execute().data or []
        return [self._serialize_lookup(row) for row in rows]

    def list_venues(self) -> list[LookupResponse]:
        venues = [
            self._serialize_venue_lookup(row) for row in self._select_all("venues")
        ]
        return sorted(venues, key=lambda item: item.name.lower())

    def create_venue(
        self, payload: VenueCreateRequest, current_user: UserResponse
    ) -> LookupResponse:
        self._require_roles(current_user, {"organizer", "admin"})
        existing = self._find_existing_venue(payload)
        if existing:
            return self._serialize_venue_lookup(existing)
        response = (
            self._client()
            .table(get_settings().supabase_venues_table)
            .insert(payload.model_dump())
            .execute()
        )
        return self._serialize_venue_lookup(self._first_row(response))

    def list_categories(self) -> list[LookupResponse]:
        return [
            self._serialize_lookup(row) for row in self._select_all("event_categories")
        ]

    def list_pending_events(self, current_user: UserResponse) -> list[EventResponse]:
        self._require_roles(current_user, {"admin"})
        filters = EventFilterParams(status="pending_approval")
        return self.list_events(filters)

    def approve_event(self, event_id: str, current_user: UserResponse) -> EventResponse:
        self._require_roles(current_user, {"admin"})
        response = (
            self._client()
            .table(get_settings().supabase_events_table)
            .update(
                {
                    "status": "published",
                    "approved_by": current_user.id,
                    "approved_at": self._now_iso(),
                    "rejection_reason": None,
                }
            )
            .eq("id", event_id)
            .execute()
        )
        return self._serialize_event(self._first_row(response))

    def reject_event(
        self,
        event_id: str,
        payload: AdminRejectEventRequest,
        current_user: UserResponse,
    ) -> EventResponse:
        self._require_roles(current_user, {"admin"})
        response = (
            self._client()
            .table(get_settings().supabase_events_table)
            .update(
                {
                    "status": "rejected",
                    "approved_by": None,
                    "approved_at": None,
                    "rejection_reason": payload.rejection_reason,
                }
            )
            .eq("id", event_id)
            .execute()
        )
        return self._serialize_event(self._first_row(response))

    def list_organizers(self, current_user: UserResponse) -> list[UserResponse]:
        self._require_roles(current_user, {"admin"})
        rows = (
            self._client()
            .table(get_settings().supabase_user_profiles_table)
            .select("*")
            .eq("role", "organizer")
            .order("full_name")
            .execute()
            .data
            or []
        )
        return [self._serialize_profile_row(row) for row in rows]

    def create_organizer(
        self, payload: OrganizerCreateRequest, current_user: UserResponse
    ) -> UserResponse:
        self._require_roles(current_user, {"admin"})
        try:
            response = get_supabase_service_client().auth.admin.invite_user_by_email(
                payload.email,
                {
                    "redirect_to": f"{get_settings().frontend_url}/set-password",
                    "data": {"full_name": payload.full_name},
                },
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not invite organizer: {self._stringify_error(exc)}",
            ) from exc

        user = self._extract_user(response)
        profile = {
            "id": str(getattr(user, "id")),
            "email": payload.email,
            "full_name": payload.full_name,
            "role": "organizer",
            "faculty_id": payload.faculty_id,
            "department_id": payload.department_id,
            "student_domain_verified": False,
        }
        self._upsert_profile(profile)
        return self._serialize_profile_row(profile)

    def update_user(
        self, user_id: str, payload: UserUpdateRequest, current_user: UserResponse
    ) -> UserResponse:
        self._require_roles(current_user, {"admin"})
        update_payload = payload.model_dump(exclude_unset=True)
        if not update_payload:
            profile = self._get_profile_or_404(user_id)
            return self._serialize_profile_row(profile)

        response = (
            self._client()
            .table(get_settings().supabase_user_profiles_table)
            .update(update_payload)
            .eq("id", user_id)
            .execute()
        )
        return self._serialize_profile_row(self._first_row(response))

    def get_summary_report(self, current_user: UserResponse) -> AdminReportResponse:
        self._require_roles(current_user, {"admin"})
        events = self._select_all("events", columns="status")
        registrations = self._select_all("event_registrations", columns="id")
        feedback = self._select_all("event_feedback", columns="rating")
        by_status: dict[str, int] = {}
        for event in events:
            key = str(event.get("status") or "unknown")
            by_status[key] = by_status.get(key, 0) + 1

        ratings = [int(row["rating"]) for row in feedback if row.get("rating")]
        return AdminReportResponse(
            events_total=len(events),
            events_by_status=by_status,
            registrations_total=len(registrations),
            average_feedback_rating=(
                round(sum(ratings) / len(ratings), 2) if ratings else None
            ),
        )

    def _create_auth_user(self, email: str, password: str, full_name: str) -> Any:
        try:
            response = get_supabase_service_client().auth.admin.create_user(
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
        return self._extract_user(response)

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

    def _serialize_user(self, user: Any) -> UserResponse:
        metadata = self._as_dict(getattr(user, "user_metadata", None))
        app_metadata = self._as_dict(getattr(user, "app_metadata", None))
        user_id = str(getattr(user, "id"))
        email = str(getattr(user, "email"))
        profile = self._get_profile(user_id)
        full_name = (
            (profile or {}).get("full_name")
            or metadata.get("full_name")
            or metadata.get("name")
            or email.split("@")[0]
        )

        if profile is None:
            profile = {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "role": "student",
                "student_domain_verified": email.endswith("@student.usv.ro"),
            }
            self._upsert_profile(profile)

        return UserResponse(
            id=user_id,
            email=email,
            full_name=str(full_name),
            avatar_url=metadata.get("avatar_url") or metadata.get("picture"),
            auth_provider=str(app_metadata.get("provider") or "supabase"),
            role=profile.get("role") or "student",
            faculty_id=self._optional_str(profile.get("faculty_id")),
            department_id=self._optional_str(profile.get("department_id")),
            student_domain_verified=bool(profile.get("student_domain_verified")),
            created_at=self._parse_datetime(
                profile.get("created_at") or getattr(user, "created_at", None)
            ),
        )

    def _serialize_profile_row(self, row: dict[str, Any]) -> UserResponse:
        return UserResponse(
            id=str(row["id"]),
            email=str(row["email"]),
            full_name=str(row["full_name"]),
            avatar_url=None,
            auth_provider="supabase",
            role=row.get("role") or "student",
            faculty_id=self._optional_str(row.get("faculty_id")),
            department_id=self._optional_str(row.get("department_id")),
            student_domain_verified=bool(row.get("student_domain_verified")),
            created_at=self._parse_datetime(row.get("created_at") or datetime.now(UTC)),
        )

    def _serialize_events(self, rows: list[dict[str, Any]]) -> list[EventResponse]:
        if not rows:
            return []

        event_ids = [str(row["id"]) for row in rows]
        event_id_set = set(event_ids)

        registration_counts: dict[str, int] = {event_id: 0 for event_id in event_id_set}
        for registration in self._select_rows(
            "event_registrations",
            column="event_id",
            values=event_ids,
            columns="event_id,status",
        ):
            event_id = str(registration.get("event_id"))
            if (
                event_id in registration_counts
                and registration.get("status") != "cancelled"
            ):
                registration_counts[event_id] += 1

        materials_by_event: dict[str, list[MaterialResponse]] = {
            event_id: [] for event_id in event_id_set
        }
        for material in self._select_rows(
            "event_materials",
            column="event_id",
            values=event_ids,
            order_by="created_at",
        ):
            event_id = str(material.get("event_id"))
            if event_id in materials_by_event:
                materials_by_event[event_id].append(self._serialize_material(material))

        sponsor_links_by_event: dict[str, list[dict[str, Any]]] = {
            event_id: [] for event_id in event_id_set
        }
        sponsor_ids: set[str] = set()
        for link in self._select_rows(
            "event_sponsors",
            column="event_id",
            values=event_ids,
            order_by="display_order",
        ):
            event_id = str(link.get("event_id"))
            if event_id in sponsor_links_by_event:
                sponsor_links_by_event[event_id].append(link)
                if link.get("sponsor_id") is not None:
                    sponsor_ids.add(str(link["sponsor_id"]))

        sponsor_rows = {
            str(sponsor["id"]): sponsor
            for sponsor in self._select_rows(
                "sponsors", column="id", values=sorted(sponsor_ids)
            )
        }

        sponsors_by_event: dict[str, list[SponsorResponse]] = {}
        for event_id, links in sponsor_links_by_event.items():
            ordered_links = sorted(
                links,
                key=lambda link: (
                    link.get("display_order") is None,
                    link.get("display_order") or 0,
                ),
            )
            sponsors_by_event[event_id] = [
                self._serialize_sponsor(sponsor_rows[str(link["sponsor_id"])])
                for link in ordered_links
                if str(link.get("sponsor_id")) in sponsor_rows
            ]

        venue_ids = self._row_values(rows, "venue_id")
        category_ids = self._row_values(rows, "category_id")
        faculty_ids = self._row_values(rows, "faculty_id")
        department_ids = self._row_values(rows, "department_id")
        creator_full_names = self._profile_name_map(
            self._row_values(rows, "creator_id")
        )
        lookup_names = {
            "venues": self._lookup_name_map("venues", venue_ids),
            "event_categories": self._lookup_name_map("event_categories", category_ids),
            "faculties": self._lookup_name_map("faculties", faculty_ids),
            "departments": self._lookup_name_map("departments", department_ids),
        }

        return [
            self._serialize_event(
                row,
                registration_count=registration_counts.get(str(row["id"]), 0),
                sponsors=sponsors_by_event.get(str(row["id"]), []),
                materials=materials_by_event.get(str(row["id"]), []),
                related=self._event_related_names_from_maps(row, lookup_names),
                creator_full_name=creator_full_names.get(str(row["creator_id"])),
            )
            for row in rows
        ]

    def _serialize_event(
        self,
        row: dict[str, Any],
        *,
        registration_count: int | None = None,
        sponsors: list[SponsorResponse] | None = None,
        materials: list[MaterialResponse] | None = None,
        related: dict[str, str | None] | None = None,
        creator_full_name: str | None = None,
    ) -> EventResponse:
        event_id = str(row["id"])
        if registration_count is None:
            registration_count = self._get_registration_count(event_id)
        max_participants = row.get("max_participants")
        is_full = max_participants is not None and registration_count >= int(
            max_participants
        )
        related = related or self._event_related_names(row)
        creator_full_name = creator_full_name or self._lookup_profile_name(
            row.get("creator_id")
        )
        starts_at = self._parse_datetime(row["starts_at"])
        ends_at = self._parse_datetime(row["ends_at"]) if row.get("ends_at") else None
        effective_status = self._effective_event_status(
            row.get("status") or "draft",
            starts_at=starts_at,
            ends_at=ends_at,
        )

        return EventResponse(
            id=event_id,
            title=str(row["title"]),
            description=row.get("description"),
            venue_id=self._optional_str(row.get("venue_id")),
            venue_name=related.get("venue_name"),
            starts_at=starts_at,
            ends_at=ends_at,
            category_id=self._optional_str(row.get("category_id")),
            category_name=related.get("category_name"),
            participation_mode=row.get("participation_mode") or "physical",
            faculty_id=self._optional_str(row.get("faculty_id")),
            faculty_name=related.get("faculty_name"),
            department_id=self._optional_str(row.get("department_id")),
            department_name=related.get("department_name"),
            registration_required=bool(row.get("registration_required")),
            registration_url=row.get("registration_url"),
            registration_deadline=(
                self._parse_datetime(row["registration_deadline"])
                if row.get("registration_deadline")
                else None
            ),
            max_participants=(
                int(max_participants) if max_participants is not None else None
            ),
            is_free=bool(row.get("is_free", True)),
            status=effective_status,
            creator_id=str(row["creator_id"]),
            creator_full_name=creator_full_name or "Organizator necunoscut",
            approved_by=self._optional_str(row.get("approved_by")),
            approved_at=(
                self._parse_datetime(row["approved_at"])
                if row.get("approved_at")
                else None
            ),
            rejection_reason=row.get("rejection_reason"),
            created_at=self._parse_datetime(row["created_at"]),
            updated_at=(
                self._parse_datetime(row["updated_at"])
                if row.get("updated_at")
                else None
            ),
            registration_count=registration_count,
            is_full=is_full,
            sponsors=(
                sponsors
                if sponsors is not None
                else self._list_event_sponsors(event_id)
            ),
            materials=(
                materials if materials is not None else self.list_materials(event_id)
            ),
        )

    def _serialize_material(self, row: dict[str, Any]) -> MaterialResponse:
        return MaterialResponse(
            id=str(row["id"]),
            event_id=str(row["event_id"]),
            uploaded_by=str(row["uploaded_by"]),
            material_type=row["material_type"],
            title=str(row["title"]),
            file_url=str(row["file_url"]),
            file_name=row.get("file_name"),
            file_size_bytes=(
                int(row["file_size_bytes"])
                if row.get("file_size_bytes") is not None
                else None
            ),
            created_at=self._parse_datetime(row["created_at"]),
        )

    def _serialize_feedback(self, row: dict[str, Any]) -> FeedbackResponse:
        return FeedbackResponse(
            id=str(row["id"]),
            event_id=str(row["event_id"]),
            user_id=str(row["user_id"]),
            rating=int(row["rating"]),
            comment=row.get("comment"),
            created_at=self._parse_datetime(row["created_at"]),
            updated_at=self._parse_datetime(row["updated_at"]),
        )

    def _serialize_registrations(
        self, rows: list[dict[str, Any]]
    ) -> list[RegistrationResponse]:
        profile_ids = self._row_values(rows, "user_id")
        profiles = {
            str(profile["id"]): profile
            for profile in self._select_rows(
                "user_profiles",
                column="id",
                values=profile_ids,
                columns="id,email,full_name",
            )
        }
        return [self._serialize_registration(row, profiles=profiles) for row in rows]

    def _serialize_registration(
        self,
        row: dict[str, Any],
        *,
        profiles: dict[str, dict[str, Any]] | None = None,
    ) -> RegistrationResponse:
        profile = (
            profiles.get(str(row["user_id"]), {})
            if profiles is not None
            else self._get_profile(str(row["user_id"])) or {}
        )
        return RegistrationResponse(
            id=str(row["id"]),
            event_id=str(row["event_id"]),
            user_id=str(row["user_id"]),
            user_name=profile.get("full_name"),
            user_email=profile.get("email"),
            status=row.get("status") or "registered",
            registered_at=self._parse_datetime(row["registered_at"]),
            cancelled_at=(
                self._parse_datetime(row["cancelled_at"])
                if row.get("cancelled_at")
                else None
            ),
            checked_in_at=(
                self._parse_datetime(row["checked_in_at"])
                if row.get("checked_in_at")
                else None
            ),
        )

    @staticmethod
    def _serialize_sponsor(row: dict[str, Any]) -> SponsorResponse:
        return SponsorResponse(
            id=str(row["id"]),
            name=str(row["name"]),
            logo_url=row.get("logo_url"),
            website_url=row.get("website_url"),
        )

    @staticmethod
    def _serialize_lookup(row: dict[str, Any]) -> LookupResponse:
        return LookupResponse(
            id=str(row["id"]),
            name=str(row["name"]),
            short_name=row.get("short_name"),
        )

    def _serialize_venue_lookup(self, row: dict[str, Any]) -> LookupResponse:
        return LookupResponse(
            id=str(row["id"]),
            name=self._venue_display_name(row),
            short_name=None,
        )

    def _filter_event_rows(
        self,
        rows: list[dict[str, Any]],
        filters: EventFilterParams | None,
        creator_full_names: dict[str, str] | None = None,
    ) -> list[dict[str, Any]]:
        if filters is None:
            return rows

        def matches(row: dict[str, Any]) -> bool:
            if filters.status and row.get("status") != filters.status:
                return False
            for attr in (
                "faculty_id",
                "department_id",
                "category_id",
                "venue_id",
                "participation_mode",
            ):
                wanted = getattr(filters, attr)
                if wanted is not None and str(row.get(attr)) != str(wanted):
                    return False
            if (
                filters.is_free is not None
                and bool(row.get("is_free")) != filters.is_free
            ):
                return False
            if (
                filters.registration_required is not None
                and bool(row.get("registration_required"))
                != filters.registration_required
            ):
                return False
            creator_full_name = (creator_full_names or {}).get(
                str(row.get("creator_id")), ""
            )
            if (
                filters.organizer
                and filters.organizer.lower() not in creator_full_name.lower()
            ):
                return False
            starts_at = self._parse_datetime(row["starts_at"])
            if filters.starts_from and starts_at < filters.starts_from:
                return False
            if filters.starts_until and starts_at > filters.starts_until:
                return False
            if filters.q:
                haystack = (
                    f"{row.get('title', '')} {row.get('description', '')}".lower()
                )
                if filters.q.lower() not in haystack:
                    return False
            return True

        return [row for row in rows if matches(row)]

    def _event_payload(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                payload[key] = value.isoformat()
            else:
                payload[key] = value
        return payload

    @staticmethod
    def _effective_event_status(
        status_value: str,
        *,
        starts_at: datetime,
        ends_at: datetime | None,
    ) -> str:
        if status_value == "published" and (ends_at or starts_at) < datetime.now(UTC):
            return "completed"
        return status_value

    def _event_related_names(self, row: dict[str, Any]) -> dict[str, str | None]:
        return {
            "venue_name": self._lookup_name("venues", row.get("venue_id")),
            "category_name": self._lookup_name(
                "event_categories", row.get("category_id")
            ),
            "faculty_name": self._lookup_name("faculties", row.get("faculty_id")),
            "department_name": self._lookup_name(
                "departments", row.get("department_id")
            ),
        }

    @staticmethod
    def _event_related_names_from_maps(
        row: dict[str, Any], lookup_names: dict[str, dict[str, str]]
    ) -> dict[str, str | None]:
        return {
            "venue_name": lookup_names["venues"].get(str(row.get("venue_id"))),
            "category_name": lookup_names["event_categories"].get(
                str(row.get("category_id"))
            ),
            "faculty_name": lookup_names["faculties"].get(str(row.get("faculty_id"))),
            "department_name": lookup_names["departments"].get(
                str(row.get("department_id"))
            ),
        }

    def _lookup_name_map(self, table_key: str, row_ids: list[str]) -> dict[str, str]:
        if table_key == "venues":
            return {
                str(row["id"]): self._venue_display_name(row)
                for row in self._select_rows(
                    table_key,
                    column="id",
                    values=row_ids,
                    columns="id,address,building,room",
                )
            }
        return {
            str(row["id"]): str(row["name"])
            for row in self._select_rows(
                table_key, column="id", values=row_ids, columns="id,name"
            )
            if row.get("name") is not None
        }

    def _profile_name_map(self, user_ids: list[str]) -> dict[str, str]:
        return {
            str(row["id"]): str(row["full_name"])
            for row in self._select_rows(
                "user_profiles", column="id", values=user_ids, columns="id,full_name"
            )
            if row.get("full_name") is not None
        }

    def _lookup_profile_name(self, user_id: Any) -> str | None:
        if user_id is None:
            return None
        return self._profile_name_map([str(user_id)]).get(str(user_id))

    @staticmethod
    def _row_values(rows: list[dict[str, Any]], column: str) -> list[str]:
        return sorted({str(row[column]) for row in rows if row.get(column) is not None})

    def _list_event_sponsors(self, event_id: str) -> list[SponsorResponse]:
        links = (
            self._client()
            .table(get_settings().supabase_event_sponsors_table)
            .select("*")
            .eq("event_id", event_id)
            .order("display_order")
            .execute()
            .data
            or []
        )
        sponsors: list[SponsorResponse] = []
        for link in links:
            sponsor = self._get_row(
                "sponsors", str(link["sponsor_id"]), missing_is_none=True
            )
            if sponsor:
                sponsors.append(self._serialize_sponsor(sponsor))
        return sponsors

    def _lookup_name(self, table_key: str, row_id: Any) -> str | None:
        if row_id is None:
            return None
        row = self._get_row(table_key, str(row_id), missing_is_none=True)
        if table_key == "venues":
            return self._venue_display_name(row) if row else None
        return str(row["name"]) if row and row.get("name") is not None else None

    def _find_existing_venue(
        self, payload: VenueCreateRequest
    ) -> dict[str, Any] | None:
        wanted = self._venue_key(payload.model_dump())
        for row in self._select_all("venues"):
            if self._venue_key(row) == wanted:
                return row
        return None

    @staticmethod
    def _venue_display_name(row: dict[str, Any]) -> str:
        building = (row.get("building") or "").strip()
        room = (row.get("room") or "").strip()
        address = (row.get("address") or "").strip()

        parts: list[str] = []
        if building:
            parts.append(building)
        if room:
            parts.append(f"Sala {room}")
        if address:
            parts.append(address)
        return ", ".join(parts) or "Locatie nespecificata"

    @classmethod
    def _venue_key(cls, row: dict[str, Any]) -> tuple[str, str, str]:
        return (
            cls._normalize_location_value(row.get("building")),
            cls._normalize_location_value(row.get("room")),
            cls._normalize_location_value(row.get("address")),
        )

    @staticmethod
    def _normalize_location_value(value: Any) -> str:
        return re.sub(r"\s+", " ", str(value or "").strip()).lower()

    def _get_event_or_404(self, event_id: str) -> dict[str, Any]:
        row = self._get_row("events", event_id, missing_is_none=True)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found.",
            )
        return row

    def _get_profile_or_404(self, user_id: str) -> dict[str, Any]:
        row = self._get_profile(user_id)
        if row is None:
            raise HTTPException(status_code=404, detail="User profile not found.")
        return row

    def _get_profile(self, user_id: str) -> dict[str, Any] | None:
        response = (
            self._client()
            .table(get_settings().supabase_user_profiles_table)
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    def _upsert_profile(self, payload: dict[str, Any]) -> None:
        self._client().table(get_settings().supabase_user_profiles_table).upsert(
            payload
        ).execute()

    def _get_row(
        self, table_key: str, row_id: str, *, missing_is_none: bool = False
    ) -> dict[str, Any] | None:
        table = self._table_name(table_key)
        try:
            response = (
                self._client()
                .table(table)
                .select("*")
                .eq("id", row_id)
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    f"Could not load {table_key} from Supabase: "
                    f"{self._stringify_error(exc)}"
                ),
            ) from exc
        if response.data:
            return response.data[0]
        if missing_is_none:
            return None
        raise HTTPException(status_code=404, detail=f"{table_key} not found.")

    def _select_all(
        self,
        table_key: str,
        *,
        columns: str = "*",
        order_by: str | None = None,
        order_desc: bool = False,
    ) -> list[dict[str, Any]]:
        query = self._client().table(self._table_name(table_key)).select(columns)
        if order_by:
            query = query.order(order_by, desc=order_desc)
        return self._execute_select(query, table_key)

    def _select_rows(
        self,
        table_key: str,
        *,
        column: str,
        values: list[str],
        columns: str = "*",
        order_by: str | None = None,
        order_desc: bool = False,
    ) -> list[dict[str, Any]]:
        if not values:
            return []
        query = (
            self._client()
            .table(self._table_name(table_key))
            .select(columns)
            .in_(column, values)
        )
        if order_by:
            query = query.order(order_by, desc=order_desc)
        return self._execute_select(query, table_key)

    def _execute_select(self, query: Any, table_key: str) -> list[dict[str, Any]]:
        try:
            return query.execute().data or []
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    f"Could not load {table_key} from Supabase: "
                    f"{self._stringify_error(exc)}"
                ),
            ) from exc

    def _table_name(self, table_key: str) -> str:
        settings = get_settings()
        mapping = {
            "faculties": settings.supabase_faculties_table,
            "departments": settings.supabase_departments_table,
            "venues": settings.supabase_venues_table,
            "sponsors": settings.supabase_sponsors_table,
            "user_profiles": settings.supabase_user_profiles_table,
            "event_categories": settings.supabase_event_categories_table,
            "events": settings.supabase_events_table,
            "event_registrations": settings.supabase_event_registrations_table,
            "event_feedback": settings.supabase_event_feedback_table,
            "event_materials": settings.supabase_event_materials_table,
            "event_sponsors": settings.supabase_event_sponsors_table,
        }
        return mapping[table_key]

    @staticmethod
    def _safe_storage_name(file_name: str) -> str:
        cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", file_name.strip()).strip(".-")
        return cleaned or "material"

    @staticmethod
    def _storage_public_url(bucket: str, object_path: str) -> str:
        settings = get_settings()
        encoded_path = quote(object_path, safe="/")
        return (
            f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/"
            f"{bucket}/{encoded_path}"
        )

    def _list_registration_rows(self, event_id: str) -> list[dict[str, Any]]:
        return self._select_rows(
            "event_registrations",
            column="event_id",
            values=[event_id],
        )

    def _list_feedback_rows(self, event_id: str) -> list[dict[str, Any]]:
        return self._select_rows(
            "event_feedback",
            column="event_id",
            values=[event_id],
        )

    def _get_registration_count(self, event_id: str) -> int:
        return sum(
            1
            for row in self._list_registration_rows(event_id)
            if row.get("status") != "cancelled"
        )

    def _require_roles(self, user: UserResponse, allowed_roles: set[str]) -> None:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )

    def _require_event_manager(
        self, event: dict[str, Any], current_user: UserResponse
    ) -> None:
        if current_user.role == "admin":
            return
        if (
            current_user.role == "organizer"
            and str(event["creator_id"]) == current_user.id
        ):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can manage only your own events.",
        )

    @staticmethod
    def _first_row(response: Any) -> dict[str, Any]:
        if not getattr(response, "data", None):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase returned an empty response.",
            )
        return response.data[0]

    @staticmethod
    def _extract_oauth_url(response: Any) -> str | None:
        direct_url = getattr(response, "url", None)
        if isinstance(direct_url, str) and direct_url:
            return direct_url
        data = getattr(response, "data", None)
        if isinstance(data, dict):
            candidate = data.get("url")
            return candidate if isinstance(candidate, str) and candidate else None
        candidate = getattr(data, "url", None)
        return candidate if isinstance(candidate, str) and candidate else None

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

    @staticmethod
    def _parse_datetime(value: Any) -> datetime:
        if isinstance(value, datetime):
            parsed = value
        elif isinstance(value, str):
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Supabase returned an invalid datetime value.",
            )
        if parsed.tzinfo is None or parsed.utcoffset() is None:
            return parsed.replace(tzinfo=UTC)
        return parsed

    @staticmethod
    def _format_ics_datetime(value: datetime) -> str:
        return value.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")

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
    def _optional_str(value: Any) -> str | None:
        return str(value) if value is not None else None

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(UTC).isoformat()

    @staticmethod
    def _stringify_error(exc: Exception) -> str:
        return str(exc).strip() or exc.__class__.__name__

    @staticmethod
    def _normalize_redirect_url(redirect_to: str | None) -> str:
        settings = get_settings()
        base_url = settings.frontend_url.rstrip("/")
        if not redirect_to:
            return base_url
        candidate = redirect_to.strip()
        if not candidate:
            return base_url
        allowed_origins = {
            base_url,
            *(origin.rstrip("/") for origin in settings.cors_origins if origin != "*"),
        }
        parsed_candidate = urlparse(candidate)
        candidate_origin = (
            f"{parsed_candidate.scheme}://{parsed_candidate.netloc}"
            if parsed_candidate.scheme and parsed_candidate.netloc
            else ""
        )
        if candidate_origin in allowed_origins:
            return candidate
        if settings.cors_origin_regex and re.fullmatch(
            settings.cors_origin_regex, candidate_origin
        ):
            return candidate
        if candidate.startswith("/"):
            return f"{base_url}{candidate}"
        query = urlencode({"oauth_error": "invalid_redirect"})
        return f"{base_url}/?{query}"

    @staticmethod
    def _client():
        return get_supabase_service_client()


def get_auth_service() -> AuthService:
    return SupabaseService()


def get_events_service() -> EventsService:
    return SupabaseService()


def get_admin_service() -> AdminService:
    return SupabaseService()
