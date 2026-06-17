from __future__ import annotations

import pytest
from app.services import SupabaseService
from fastapi import HTTPException
from fastapi.testclient import TestClient


def test_registration_and_login(client: TestClient, auth_headers):
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

    me_response = client.get("/auth/me", headers=auth_headers(payload["access_token"]))
    assert me_response.status_code == 200
    assert me_response.json()["full_name"] == "Student USV"

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


def test_refresh_session(client: TestClient):
    response = client.post(
        "/auth/refresh",
        json={"refresh_token": "test-refresh"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"] == "test-token"
    assert payload["refresh_token"] == "test-refresh"
    assert payload["user"]["email"] == "student@usv.ro"


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


def test_google_auth_domain_guard_accepts_only_student_subdomain():
    SupabaseService._enforce_google_student_domain(
        "student@student.usv.ro",
        {"provider": "google"},
    )

    with pytest.raises(HTTPException) as exc_info:
        SupabaseService._enforce_google_student_domain(
            "person@gmail.com",
            {"provider": "email", "providers": ["google"]},
        )

    assert exc_info.value.status_code == 403


def test_google_auth_domain_guard_does_not_block_password_accounts():
    SupabaseService._enforce_google_student_domain(
        "organizer@usv.ro",
        {"provider": "email", "providers": ["email"]},
    )
