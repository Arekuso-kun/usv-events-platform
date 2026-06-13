from __future__ import annotations

from fastapi.testclient import TestClient


def test_admin_approval_user_management_and_summary_report(
    client: TestClient, auth_headers
):
    pending_response = client.get("/admin/events/pending", headers=auth_headers())
    assert pending_response.status_code == 200
    assert pending_response.json()[0]["status"] == "pending_approval"

    approve_response = client.post(
        "/admin/events/pending-event-1/approve", headers=auth_headers()
    )
    assert approve_response.status_code == 200
    assert approve_response.json()["status"] == "published"

    organizers_response = client.get("/admin/users/organizers", headers=auth_headers())
    assert organizers_response.status_code == 200
    assert organizers_response.json()[0]["email"] == "organizer@usv.ro"

    create_organizer_response = client.post(
        "/admin/users/organizers",
        headers=auth_headers(),
        json={
            "email": "new.organizer@usv.ro",
            "full_name": "New Organizer",
        },
    )
    assert create_organizer_response.status_code == 201
    organizer_id = create_organizer_response.json()["id"]

    update_user_response = client.patch(
        f"/admin/users/{organizer_id}",
        headers=auth_headers(),
        json={"full_name": "Updated Organizer"},
    )
    assert update_user_response.status_code == 200
    assert update_user_response.json()["full_name"] == "Updated Organizer"

    report_response = client.get("/admin/reports/summary", headers=auth_headers())
    assert report_response.status_code == 200
    report = report_response.json()
    assert report["registrations_total"] == 3
    assert report["average_participation"] == 3
    assert report["events_by_month"] == [{"month": "2026-04", "count": 1}]
    assert report["events_by_organizer"][0]["count"] == 1
