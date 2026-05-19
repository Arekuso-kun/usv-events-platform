from __future__ import annotations

from fastapi.testclient import TestClient


def test_catalog_endpoints_and_venue_creation(client: TestClient, auth_headers):
    faculties_response = client.get("/faculties")
    assert faculties_response.status_code == 200
    assert faculties_response.json()[0]["short_name"] == "FIESC"

    departments_response = client.get(
        "/departments", params={"faculty_id": "faculty-1"}
    )
    assert departments_response.status_code == 200
    assert departments_response.json()[0]["name"] == "Calculatoare"

    venues_response = client.get("/venues")
    assert venues_response.status_code == 200
    assert venues_response.json()[0]["name"] == "Corpul E"

    create_venue_response = client.post(
        "/venues",
        headers=auth_headers(),
        json={"building": "Corpul C", "room": "101"},
    )
    assert create_venue_response.status_code == 201
    assert create_venue_response.json()["name"] == "Corpul C, 101"

    categories_response = client.get("/categories")
    assert categories_response.status_code == 200
    assert categories_response.json()[0]["name"] == "Workshop"
