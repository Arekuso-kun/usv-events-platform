from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_endpoints(client: TestClient):
    root_response = client.get("/")
    assert root_response.status_code == 200
    assert root_response.json()["message"] == "API is running"

    health_response = client.get("/health")
    assert health_response.status_code == 200
    assert health_response.json()["status"] == "ok"


def test_events_flow_requires_auth_and_prevents_duplicate_registrations(
    client: TestClient, auth_headers, create_event
):
    event_id = create_event(client)["id"]

    register_response = client.post(
        f"/events/{event_id}/register",
        headers=auth_headers(),
    )
    assert register_response.status_code == 200
    assert register_response.json()["registration_count"] == 1

    duplicate_response = client.post(
        f"/events/{event_id}/register",
        headers=auth_headers(),
    )
    assert duplicate_response.status_code == 409

    list_response = client.get("/events")
    assert list_response.status_code == 200
    assert list_response.json()[0]["title"] == "Tech Meetup"


def test_event_update_delete_and_calendar_exports(
    client: TestClient, auth_headers, create_event
):
    event = create_event(client)
    event_id = event["id"]

    update_response = client.patch(
        f"/events/{event_id}",
        headers=auth_headers(),
        json={"title": "Updated Meetup"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Updated Meetup"

    ics_response = client.get(f"/events/{event_id}/calendar.ics")
    assert ics_response.status_code == 200
    assert "BEGIN:VCALENDAR" in ics_response.text

    google_calendar_response = client.get(f"/events/{event_id}/google-calendar")
    assert google_calendar_response.status_code == 200
    assert google_calendar_response.json()["url"].startswith(
        "https://calendar.google.com/calendar/render"
    )

    delete_response = client.delete(f"/events/{event_id}", headers=auth_headers())
    assert delete_response.status_code == 204

    missing_response = client.get(f"/events/{event_id}")
    assert missing_response.status_code == 404
