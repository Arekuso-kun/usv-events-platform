from __future__ import annotations

from fastapi.testclient import TestClient


def test_sponsor_creation_logo_validation_and_event_linking(
    client: TestClient, auth_headers, create_event
):
    event_id = create_event(client)["id"]

    sponsor_response = client.post(
        "/sponsors",
        headers=auth_headers(),
        json={
            "name": "USV Partner",
            "logo_url": "https://example.com/logo.png",
            "website_url": "https://example.com",
        },
    )
    assert sponsor_response.status_code == 201
    sponsor_id = sponsor_response.json()["id"]

    list_sponsors_response = client.get("/sponsors")
    assert list_sponsors_response.status_code == 200
    assert list_sponsors_response.json()[0]["name"] == "USV Partner"

    invalid_logo_response = client.post(
        "/sponsors/upload-logo",
        headers=auth_headers(),
        json={
            "name": "Broken Sponsor",
            "file_name": "logo.png",
            "content_type": "image/png",
            "content_base64": "not-valid-base64",
        },
    )
    assert invalid_logo_response.status_code == 400

    link_response = client.post(
        f"/events/{event_id}/sponsors",
        headers=auth_headers(),
        json={"sponsor_id": sponsor_id, "display_order": 1},
    )
    assert link_response.status_code == 201
    assert link_response.json()["sponsors"][0]["id"] == sponsor_id

    unlink_response = client.delete(
        f"/events/{event_id}/sponsors/{sponsor_id}",
        headers=auth_headers(),
    )
    assert unlink_response.status_code == 204
