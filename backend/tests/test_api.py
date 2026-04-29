from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import pytest
from app.schemas import EventCreateRequest, EventResponse, TokenResponse, UserResponse
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

    def get_google_sign_in_url(self, redirect_to: str | None) -> str:
        return redirect_to or self.google_url

    def google_sign_in(self, id_token: str) -> TokenResponse:
        return self.google_response

    def get_user_from_token(self, access_token: str) -> UserResponse:
        return self.current_user


@dataclass
class FakeEventsService:
    events: list[EventResponse]

    def list_events(self) -> list[EventResponse]:
        return self.events

    def create_event(
        self, payload: EventCreateRequest, current_user: UserResponse
    ) -> EventResponse:
        event = EventResponse(
            id="event-1",
            title=payload.title,
            description=payload.description,
            venue_id=payload.venue_id,
            venue_name="Corpul E" if payload.venue_id else None,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            max_participants=payload.max_participants,
            faculty_id=payload.faculty_id,
            department_id=payload.department_id,
            created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
            creator_id=current_user.id,
            creator_name=current_user.full_name,
            registration_count=0,
            is_full=False,
        )
        self.events.append(event)
        return event

    def register_for_event(
        self, event_id: str, current_user: UserResponse
    ) -> EventResponse:
        for index, event in enumerate(self.events):
            if event.id == event_id:
                if event.registration_count >= 1:
                    from fastapi import HTTPException

                    raise HTTPException(
                        status_code=409,
                        detail="You are already registered for this event.",
                    )
                updated = event.model_copy(
                    update={"registration_count": event.registration_count + 1}
                )
                self.events[index] = updated
                return updated
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Event not found.")


@pytest.fixture()
def client():
    from app.main import create_app
    from app.routers.auth import get_current_user
    from app.services import get_auth_service, get_events_service

    user = UserResponse(
        id="user-1",
        email="student@usv.ro",
        full_name="Student USV",
        avatar_url=None,
        auth_provider="email",
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

    app = create_app()
    app.dependency_overrides[get_auth_service] = lambda: auth_service
    app.dependency_overrides[get_events_service] = lambda: events_service
    app.dependency_overrides[get_current_user] = lambda: user

    with TestClient(app) as test_client:
        yield test_client


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_registration_and_login(client: TestClient):
    # Register new account
    register_response = client.post(
        "/auth/register",
        json={
            "email": "student@usv.ro",
            "password": "SecurePass123",
            "full_name": "Student USV",
        },
    )

    assert register_response.status_code == 201
    payload = register_response.json()
    assert payload["user"]["email"] == "student@usv.ro"
    assert payload["user"]["auth_provider"] == "email"

    me_response = client.get("/auth/me", headers=_auth_headers(payload["access_token"]))
    assert me_response.status_code == 200
    assert me_response.json()["full_name"] == "Student USV"

    # Login with existing account
    login_response = client.post(
        "/auth/login",
        json={
            "email": "student@usv.ro",
            "password": "SecurePass123",
        },
    )

    assert login_response.status_code == 200
    login_payload = login_response.json()
    assert login_payload["user"]["email"] == "student@usv.ro"


def test_google_login_returns_supabase_google_session(client: TestClient):
    response = client.post(
        "/auth/google", json={"id_token": "header.payload.signature"}
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["email"] == "student@usv.ro"
    assert payload["user"]["auth_provider"] == "google"


def test_google_start_redirects_to_oauth_provider(client: TestClient):
    response = client.get(
        "/auth/google/start",
        params={"redirect_to": "http://localhost:5173"},
        follow_redirects=False,
    )

    assert response.status_code == 307
    assert response.headers["location"] == "http://localhost:5173"


def test_events_flow_requires_auth_and_prevents_duplicate_registrations(
    client: TestClient,
):
    create_event_response = client.post(
        "/events",
        headers=_auth_headers("test-token"),
        json={
            "title": "Tech Meetup",
            "description": "Lab validation session",
            "venue_id": "venue-1",
            "starts_at": "2026-04-10T14:00:00Z",
            "ends_at": "2026-04-10T16:00:00Z",
            "max_participants": 2,
        },
    )

    assert create_event_response.status_code == 201
    event_id = create_event_response.json()["id"]

    register_response = client.post(
        f"/events/{event_id}/register",
        headers=_auth_headers("test-token"),
    )
    assert register_response.status_code == 200
    assert register_response.json()["registration_count"] == 1

    duplicate_response = client.post(
        f"/events/{event_id}/register",
        headers=_auth_headers("test-token"),
    )
    assert duplicate_response.status_code == 409

    list_response = client.get("/events")
    assert list_response.status_code == 200
    assert list_response.json()[0]["title"] == "Tech Meetup"
