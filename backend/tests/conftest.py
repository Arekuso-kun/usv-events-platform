from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone

import pytest
from app.config import (
    MAX_EVENT_MATERIAL_FILE_SIZE_BYTES,
    MAX_EVENT_MATERIALS_PER_EVENT,
)
from app.schemas import (
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
    RegistrationResponse,
    SponsorCreateRequest,
    SponsorLogoUploadRequest,
    SponsorResponse,
    TokenResponse,
    UserResponse,
    UserUpdateRequest,
    VenueCreateRequest,
)
from fastapi import HTTPException
from fastapi.testclient import TestClient


@dataclass
class FakeAuthService:
    login_response: TokenResponse
    google_response: TokenResponse
    current_user: UserResponse
    google_url: str = "https://accounts.google.com/o/oauth2/v2/auth"

    def register(self, email: str, password: str, full_name: str) -> TokenResponse:
        return self.login_response

    def login(self, email: str, password: str) -> TokenResponse:
        return self.login_response

    def refresh_session(self, payload) -> TokenResponse:
        return self.login_response

    def get_google_sign_in_url(self, redirect_to: str | None) -> str:
        return redirect_to or self.google_url

    def google_sign_in(self, id_token: str) -> TokenResponse:
        return self.google_response

    def get_user_from_token(self, access_token: str) -> UserResponse:
        return self.current_user

    def update_password(self, payload, current_user: UserResponse) -> UserResponse:
        return current_user


@dataclass
class FakeEventsService:
    events: list[EventResponse]
    registrations: list[RegistrationResponse] = field(default_factory=list)
    feedback: list[FeedbackResponse] = field(default_factory=list)
    materials: list[MaterialResponse] = field(default_factory=list)
    sponsors: list[SponsorResponse] = field(default_factory=list)
    faculties: list[LookupResponse] = field(
        default_factory=lambda: [
            LookupResponse(id="faculty-1", name="FIESC", short_name="FIESC")
        ]
    )
    departments: list[LookupResponse] = field(
        default_factory=lambda: [LookupResponse(id="department-1", name="Calculatoare")]
    )
    venues: list[LookupResponse] = field(
        default_factory=lambda: [LookupResponse(id="venue-1", name="Corpul E")]
    )
    categories: list[LookupResponse] = field(
        default_factory=lambda: [LookupResponse(id="category-1", name="Workshop")]
    )

    def list_events(
        self, filters: EventFilterParams | None = None
    ) -> list[EventResponse]:
        if filters and filters.status:
            return [event for event in self.events if event.status == filters.status]
        return self.events

    def list_managed_events(self, current_user: UserResponse) -> list[EventResponse]:
        if current_user.role == "admin":
            events = self.events
        else:
            events = [
                event for event in self.events if event.creator_id == current_user.id
            ]
        return sorted(events, key=lambda event: event.created_at, reverse=True)

    def get_event(self, event_id: str) -> EventResponse:
        for event in self.events:
            if event.id == event_id:
                return event
        raise HTTPException(status_code=404, detail="Event not found.")

    def create_event(
        self, payload: EventCreateRequest, current_user: UserResponse
    ) -> EventResponse:
        event = EventResponse(
            id=f"event-{len(self.events) + 1}",
            title=payload.title,
            description=payload.description,
            venue_id=payload.venue_id,
            venue_name="Corpul E" if payload.venue_id else None,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            category_id=payload.category_id,
            category_name=None,
            participation_mode=payload.participation_mode,
            max_participants=payload.max_participants,
            faculty_id=payload.faculty_id,
            department_id=payload.department_id,
            registration_required=payload.registration_required,
            registration_url=payload.registration_url,
            registration_deadline=payload.registration_deadline,
            is_free=payload.is_free,
            status="published",
            created_at=datetime(2026, 4, len(self.events) + 1, tzinfo=timezone.utc),
            creator_id=current_user.id,
            creator_full_name=current_user.full_name,
            registration_count=0,
            is_full=False,
        )
        self.events.append(event)
        return event

    def update_event(
        self, event_id: str, payload: EventUpdateRequest, current_user: UserResponse
    ) -> EventResponse:
        event = self.get_event(event_id)
        updated = event.model_copy(update=payload.model_dump(exclude_unset=True))
        self.events = [updated if item.id == event_id else item for item in self.events]
        return updated

    def delete_event(self, event_id: str, current_user: UserResponse) -> None:
        self.events = [event for event in self.events if event.id != event_id]
        self.registrations = [
            registration
            for registration in self.registrations
            if registration.event_id != event_id
        ]

    def register_for_event(
        self, event_id: str, current_user: UserResponse
    ) -> EventResponse:
        for index, event in enumerate(self.events):
            if event.id == event_id:
                existing_registration_index = next(
                    (
                        registration_index
                        for registration_index, registration in enumerate(
                            self.registrations
                        )
                        if registration.event_id == event_id
                        and registration.user_id == current_user.id
                    ),
                    None,
                )
                if any(
                    registration.event_id == event_id
                    and registration.user_id == current_user.id
                    and registration.status != "cancelled"
                    for registration in self.registrations
                ):
                    raise HTTPException(
                        status_code=409,
                        detail="You are already registered for this event.",
                    )
                if existing_registration_index is not None:
                    self.registrations[
                        existing_registration_index
                    ] = self.registrations[existing_registration_index].model_copy(
                        update={
                            "status": "registered",
                            "registered_at": datetime(
                                2026, 4, 3, tzinfo=timezone.utc
                            ),
                            "cancelled_at": None,
                            "checked_in_at": None,
                        }
                    )
                else:
                    self.registrations.append(
                        RegistrationResponse(
                            id=f"registration-{len(self.registrations) + 1}",
                            event_id=event_id,
                            user_id=current_user.id,
                            user_name=current_user.full_name,
                            user_email=current_user.email,
                            status="registered",
                            registered_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
                        )
                    )
                updated = event.model_copy(
                    update={"registration_count": event.registration_count + 1}
                )
                self.events[index] = updated
                return updated
        raise HTTPException(status_code=404, detail="Event not found.")

    def cancel_my_registration(
        self, event_id: str, current_user: UserResponse
    ) -> EventResponse:
        for index, registration in enumerate(self.registrations):
            if (
                registration.event_id == event_id
                and registration.user_id == current_user.id
                and registration.status != "cancelled"
            ):
                self.registrations[index] = registration.model_copy(
                    update={
                        "status": "cancelled",
                        "cancelled_at": datetime(2026, 4, 2, tzinfo=timezone.utc),
                    }
                )
                event = self.get_event(event_id)
                updated = event.model_copy(
                    update={
                        "registration_count": max(event.registration_count - 1, 0)
                    }
                )
                self.events = [
                    updated if item.id == event_id else item for item in self.events
                ]
                return updated
        raise HTTPException(status_code=404, detail="Registration not found.")

    def get_my_registration(
        self, event_id: str, current_user: UserResponse
    ) -> RegistrationResponse | None:
        self.get_event(event_id)
        for registration in self.registrations:
            if (
                registration.event_id == event_id
                and registration.user_id == current_user.id
                and registration.status != "cancelled"
            ):
                return registration
        return None

    def list_registrations(
        self, event_id: str, current_user: UserResponse
    ) -> list[RegistrationResponse]:
        self.get_event(event_id)
        return [
            registration
            for registration in self.registrations
            if registration.event_id == event_id
        ]

    def export_registrations_csv(
        self, event_id: str, current_user: UserResponse
    ) -> str:
        rows = self.list_registrations(event_id, current_user)
        lines = ["id,user_id,user_name,user_email,status,registered_at"]
        for row in rows:
            lines.append(
                ",".join(
                    [
                        row.id,
                        row.user_id,
                        row.user_name or "",
                        row.user_email or "",
                        row.status,
                        row.registered_at.isoformat(),
                    ]
                )
            )
        return "\n".join(lines)

    def check_in_registration(
        self, event_id: str, registration_id: str, current_user: UserResponse
    ) -> RegistrationResponse:
        self.get_event(event_id)
        for index, registration in enumerate(self.registrations):
            if registration.id == registration_id and registration.event_id == event_id:
                checked_in = registration.model_copy(
                    update={
                        "status": "checked_in",
                        "checked_in_at": datetime(
                            2026, 4, 1, 12, tzinfo=timezone.utc
                        ),
                    }
                )
                self.registrations[index] = checked_in
                return checked_in
        raise HTTPException(status_code=404, detail="Registration not found.")

    def create_feedback(
        self, event_id: str, payload: FeedbackCreateRequest, current_user: UserResponse
    ) -> FeedbackResponse:
        self.get_event(event_id)
        feedback = FeedbackResponse(
            id=f"feedback-{len(self.feedback) + 1}",
            event_id=event_id,
            user_id=current_user.id,
            rating=payload.rating,
            comment=payload.comment,
            created_at=datetime(2026, 4, 2, tzinfo=timezone.utc),
            updated_at=datetime(2026, 4, 2, tzinfo=timezone.utc),
        )
        self.feedback.append(feedback)
        return feedback

    def list_materials(self, event_id: str) -> list[MaterialResponse]:
        self.get_event(event_id)
        return [material for material in self.materials if material.event_id == event_id]

    def create_material(
        self, event_id: str, payload: MaterialCreateRequest, current_user: UserResponse
    ) -> MaterialResponse:
        self.get_event(event_id)
        self._validate_material_limits(event_id, payload.file_size_bytes)
        material = MaterialResponse(
            id=f"material-{len(self.materials) + 1}",
            event_id=event_id,
            uploaded_by=current_user.id,
            material_type=payload.material_type,
            title=payload.title,
            file_url=payload.file_url,
            file_name=payload.file_name,
            file_size_bytes=payload.file_size_bytes,
            created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
        )
        self.materials.append(material)
        return material

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
        self.get_event(event_id)
        self._validate_material_limits(event_id, len(content))
        material = MaterialResponse(
            id=f"material-{len(self.materials) + 1}",
            event_id=event_id,
            uploaded_by=current_user.id,
            material_type=material_type,
            title=title,
            file_url=f"https://storage.example/{file_name}",
            file_name=file_name,
            file_size_bytes=len(content),
            created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
        )
        self.materials.append(material)
        return material

    def delete_material(
        self, event_id: str, material_id: str, current_user: UserResponse
    ) -> None:
        self.get_event(event_id)
        self.materials = [
            material
            for material in self.materials
            if not (material.event_id == event_id and material.id == material_id)
        ]

    def _validate_material_limits(
        self, event_id: str, file_size_bytes: int | None
    ) -> None:
        material_count = len(
            [material for material in self.materials if material.event_id == event_id]
        )
        if material_count >= MAX_EVENT_MATERIALS_PER_EVENT:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Limita de "
                    f"{MAX_EVENT_MATERIALS_PER_EVENT} materiale "
                    "pentru acest eveniment a fost atinsa."
                ),
            )
        if (
            file_size_bytes is not None
            and file_size_bytes > MAX_EVENT_MATERIAL_FILE_SIZE_BYTES
        ):
            raise HTTPException(
                status_code=413,
                detail="Fisierul depaseste limita configurata.",
            )

    def get_event_stats(
        self, event_id: str, current_user: UserResponse
    ) -> EventStatsResponse:
        self.get_event(event_id)
        event_registrations = [
            registration
            for registration in self.registrations
            if registration.event_id == event_id
        ]
        event_feedback = [
            feedback for feedback in self.feedback if feedback.event_id == event_id
        ]
        return EventStatsResponse(
            event_id=event_id,
            registration_count=len(event_registrations),
            checked_in_count=sum(
                1
                for registration in event_registrations
                if registration.status == "checked_in"
            ),
            feedback_count=len(event_feedback),
            average_rating=(
                sum(feedback.rating for feedback in event_feedback)
                / len(event_feedback)
                if event_feedback
                else None
            ),
        )

    def export_event_ics(self, event_id: str) -> str:
        event = self.get_event(event_id)
        return "\n".join(
            [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "BEGIN:VEVENT",
                f"SUMMARY:{event.title}",
                "END:VEVENT",
                "END:VCALENDAR",
            ]
        )

    def get_google_calendar_url(self, event_id: str) -> str:
        event = self.get_event(event_id)
        return (
            "https://calendar.google.com/calendar/render"
            f"?action=TEMPLATE&text={event.title}"
        )

    def list_faculties(self) -> list[LookupResponse]:
        return self.faculties

    def list_departments(self, faculty_id: str | None = None) -> list[LookupResponse]:
        return self.departments

    def list_venues(self) -> list[LookupResponse]:
        return self.venues

    def create_venue(
        self, payload: VenueCreateRequest, current_user: UserResponse
    ) -> LookupResponse:
        name = ", ".join(
            value
            for value in [payload.building, payload.room, payload.address]
            if value
        )
        venue = LookupResponse(id=f"venue-{len(self.venues) + 1}", name=name)
        self.venues.append(venue)
        return venue

    def list_categories(self) -> list[LookupResponse]:
        return self.categories

    def list_sponsors(self) -> list[SponsorResponse]:
        return self.sponsors

    def create_sponsor(
        self, payload: SponsorCreateRequest, current_user: UserResponse
    ) -> SponsorResponse:
        sponsor = SponsorResponse(
            id=f"sponsor-{len(self.sponsors) + 1}",
            name=payload.name,
            logo_url=payload.logo_url,
            website_url=payload.website_url,
        )
        self.sponsors.append(sponsor)
        return sponsor

    def create_sponsor_with_logo_file(
        self,
        payload: SponsorLogoUploadRequest,
        content: bytes,
        current_user: UserResponse,
    ) -> SponsorResponse:
        sponsor = SponsorResponse(
            id=f"sponsor-{len(self.sponsors) + 1}",
            name=payload.name,
            logo_url=f"https://storage.example/{payload.file_name}",
            website_url=payload.website_url,
        )
        self.sponsors.append(sponsor)
        return sponsor

    def link_event_sponsor(
        self,
        event_id: str,
        payload: EventSponsorLinkRequest,
        current_user: UserResponse,
    ) -> EventResponse:
        event = self.get_event(event_id)
        sponsor = next(
            (sponsor for sponsor in self.sponsors if sponsor.id == payload.sponsor_id),
            None,
        )
        if sponsor is None:
            raise HTTPException(status_code=404, detail="Sponsor not found.")
        updated = event.model_copy(update={"sponsors": [*event.sponsors, sponsor]})
        self.events = [updated if item.id == event_id else item for item in self.events]
        return updated

    def unlink_event_sponsor(
        self, event_id: str, sponsor_id: str, current_user: UserResponse
    ) -> None:
        event = self.get_event(event_id)
        updated = event.model_copy(
            update={
                "sponsors": [
                    sponsor for sponsor in event.sponsors if sponsor.id != sponsor_id
                ]
            }
        )
        self.events = [updated if item.id == event_id else item for item in self.events]


@dataclass
class FakeAdminService:
    pending_events: list[EventResponse]
    organizers: list[UserResponse]

    def list_pending_events(self, current_user: UserResponse) -> list[EventResponse]:
        return self.pending_events

    def approve_event(self, event_id: str, current_user: UserResponse) -> EventResponse:
        event = self._get_pending_event(event_id)
        approved = event.model_copy(
            update={
                "status": "published",
                "approved_by": current_user.id,
                "approved_at": datetime(2026, 4, 1, tzinfo=timezone.utc),
            }
        )
        self.pending_events = [
            approved if item.id == event_id else item for item in self.pending_events
        ]
        return approved

    def reject_event(
        self,
        event_id: str,
        payload: AdminRejectEventRequest,
        current_user: UserResponse,
    ) -> EventResponse:
        event = self._get_pending_event(event_id)
        rejected = event.model_copy(
            update={"status": "rejected", "rejection_reason": payload.rejection_reason}
        )
        self.pending_events = [
            rejected if item.id == event_id else item for item in self.pending_events
        ]
        return rejected

    def list_organizers(self, current_user: UserResponse) -> list[UserResponse]:
        return self.organizers

    def create_organizer(
        self, payload: OrganizerCreateRequest, current_user: UserResponse
    ) -> UserResponse:
        organizer = UserResponse(
            id=f"organizer-{len(self.organizers) + 1}",
            email=payload.email,
            full_name=payload.full_name,
            avatar_url=None,
            auth_provider="email",
            role="organizer",
            faculty_id=payload.faculty_id,
            department_id=payload.department_id,
            created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
        )
        self.organizers.append(organizer)
        return organizer

    def update_user(
        self, user_id: str, payload: UserUpdateRequest, current_user: UserResponse
    ) -> UserResponse:
        for index, organizer in enumerate(self.organizers):
            if organizer.id == user_id:
                updated = organizer.model_copy(
                    update=payload.model_dump(exclude_unset=True)
                )
                self.organizers[index] = updated
                return updated
        raise HTTPException(status_code=404, detail="User profile not found.")

    def get_summary_report(self, current_user: UserResponse) -> AdminReportResponse:
        return AdminReportResponse(
            events_total=len(self.pending_events),
            events_by_status={
                event.status: sum(
                    1 for item in self.pending_events if item.status == event.status
                )
                for event in self.pending_events
            },
            events_by_month=[
                {
                    "month": "2026-04",
                    "count": len(self.pending_events),
                }
            ],
            events_by_organizer=[
                {
                    "organizer_id": self.pending_events[0].creator_id,
                    "organizer_name": self.pending_events[0].creator_full_name,
                    "count": len(self.pending_events),
                }
            ],
            registrations_total=3,
            average_participation=3,
            average_feedback_rating=4.5,
        )

    def _get_pending_event(self, event_id: str) -> EventResponse:
        for event in self.pending_events:
            if event.id == event_id:
                return event
        raise HTTPException(status_code=404, detail="Event not found.")


def _sample_event(
    *,
    event_id: str = "event-1",
    title: str = "Tech Meetup",
    status: str = "published",
    creator_id: str = "user-1",
    registration_count: int = 0,
) -> EventResponse:
    return EventResponse(
        id=event_id,
        title=title,
        description="Lab validation session",
        venue_id="venue-1",
        venue_name="Corpul E",
        starts_at=datetime(2026, 4, 10, 14, tzinfo=timezone.utc),
        ends_at=datetime(2026, 4, 10, 16, tzinfo=timezone.utc),
        category_id="category-1",
        category_name="Workshop",
        participation_mode="physical",
        faculty_id="faculty-1",
        faculty_name="FIESC",
        department_id="department-1",
        department_name="Calculatoare",
        registration_required=True,
        registration_url=None,
        registration_deadline=None,
        max_participants=2,
        is_free=True,
        status=status,
        created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
        creator_id=creator_id,
        creator_full_name="Student USV",
        registration_count=registration_count,
        is_full=False,
    )


@pytest.fixture()
def client():
    from app.main import create_app
    from app.routers.auth import get_current_user
    from app.services import get_admin_service, get_auth_service, get_events_service

    user = UserResponse(
        id="user-1",
        email="student@usv.ro",
        full_name="Student USV",
        avatar_url=None,
        auth_provider="email",
        role="organizer",
        created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
    )
    token_response = TokenResponse(
        access_token="test-token",
        refresh_token="test-refresh",
        expires_at=1_800,
        user=user,
    )
    auth_service = FakeAuthService(
        login_response=token_response,
        google_response=token_response.model_copy(
            update={"user": user.model_copy(update={"auth_provider": "google"})}
        ),
        current_user=user,
    )
    events_service = FakeEventsService(events=[])
    admin_service = FakeAdminService(
        pending_events=[
            _sample_event(
                event_id="pending-event-1",
                title="Pending Event",
                status="pending_approval",
            )
        ],
        organizers=[
            UserResponse(
                id="organizer-1",
                email="organizer@usv.ro",
                full_name="Organizer USV",
                avatar_url=None,
                auth_provider="email",
                role="organizer",
                created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
            )
        ],
    )

    app = create_app()
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    app.dependency_overrides[get_events_service] = lambda: events_service
    app.dependency_overrides[get_admin_service] = lambda: admin_service
    app.dependency_overrides[get_current_user] = lambda: user

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth_headers() -> Callable[[str], dict[str, str]]:
    def _auth_headers(token: str = "test-token") -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    return _auth_headers


@pytest.fixture()
def create_event(auth_headers):
    def _create_event(client: TestClient, title: str = "Tech Meetup") -> dict:
        response = client.post(
            "/events",
            headers=auth_headers(),
            json={
                "title": title,
                "description": "Lab validation session",
                "venue_id": "venue-1",
                "category_id": "category-1",
                "starts_at": "2026-04-10T14:00:00Z",
                "ends_at": "2026-04-10T16:00:00Z",
                "max_participants": 2,
            },
        )
        assert response.status_code == 201
        return response.json()

    return _create_event
