from __future__ import annotations

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
