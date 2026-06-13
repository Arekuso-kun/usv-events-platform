from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.services import SupabaseService
from fastapi import HTTPException
from fastapi.testclient import TestClient


def test_registration_management_stats_and_csv_export(
    client: TestClient, auth_headers, create_event
):
    event_id = create_event(client)["id"]

    register_response = client.post(
        f"/events/{event_id}/register", headers=auth_headers()
    )
    assert register_response.status_code == 200

    my_registration_response = client.get(
        f"/events/{event_id}/registration/me", headers=auth_headers()
    )
    assert my_registration_response.status_code == 200
    registration_id = my_registration_response.json()["id"]

    list_response = client.get(
        f"/events/{event_id}/registrations", headers=auth_headers()
    )
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    export_response = client.get(
        f"/events/{event_id}/registrations/export",
        headers=auth_headers(),
    )
    assert export_response.status_code == 200
    assert "id,user_id,user_name,user_email,status,registered_at" in export_response.text

    check_in_response = client.post(
        f"/events/{event_id}/registrations/{registration_id}/check-in",
        headers=auth_headers(),
    )
    assert check_in_response.status_code == 200
    assert check_in_response.json()["status"] == "checked_in"

    stats_response = client.get(f"/events/{event_id}/stats", headers=auth_headers())
    assert stats_response.status_code == 200
    assert stats_response.json()["checked_in_count"] == 1


def test_registration_deadline_passed_helper():
    now = datetime(2026, 6, 13, 12, tzinfo=timezone.utc)

    assert not SupabaseService._registration_deadline_passed(None, now)
    assert not SupabaseService._registration_deadline_passed(
        now + timedelta(minutes=1),
        now,
    )
    assert SupabaseService._registration_deadline_passed(now, now)
    assert SupabaseService._registration_deadline_passed(
        (now - timedelta(minutes=1)).isoformat(),
        now,
    )


def test_registration_deadline_must_be_before_event_start():
    starts_at = datetime(2026, 6, 13, 12, tzinfo=timezone.utc)

    SupabaseService._validate_registration_deadline(
        starts_at,
        starts_at - timedelta(minutes=1),
    )

    try:
        SupabaseService._validate_registration_deadline(starts_at, starts_at)
    except HTTPException as exc:
        assert exc.status_code == 422
    else:
        raise AssertionError("Expected invalid registration deadline to be rejected.")
