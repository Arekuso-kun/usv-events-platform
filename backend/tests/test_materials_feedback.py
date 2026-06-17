from __future__ import annotations

from app.config import (
    MAX_EVENT_MATERIAL_FILE_SIZE_BYTES,
    MAX_EVENT_MATERIALS_PER_EVENT,
)
from fastapi.testclient import TestClient


def test_materials_feedback_and_invalid_upload_validation(
    client: TestClient, auth_headers, create_event
):
    event_id = create_event(client)["id"]

    create_material_response = client.post(
        f"/events/{event_id}/materials",
        headers=auth_headers(),
        json={
            "material_type": "presentation",
            "title": "Slides",
            "file_url": "https://example.com/slides.pdf",
            "file_name": "slides.pdf",
            "file_size_bytes": 1234,
        },
    )
    assert create_material_response.status_code == 201
    material_id = create_material_response.json()["id"]

    list_materials_response = client.get(f"/events/{event_id}/materials")
    assert list_materials_response.status_code == 200
    assert list_materials_response.json()[0]["title"] == "Slides"

    invalid_upload_response = client.post(
        f"/events/{event_id}/materials/upload",
        headers=auth_headers(),
        json={
            "material_type": "pdf",
            "title": "Invalid file",
            "file_name": "broken.pdf",
            "content_type": "application/pdf",
            "content_base64": "not-valid-base64",
        },
    )
    assert invalid_upload_response.status_code == 400

    feedback_response = client.post(
        f"/events/{event_id}/feedback",
        headers=auth_headers(),
        json={"rating": 5, "comment": "Useful event"},
    )
    assert feedback_response.status_code == 201
    assert feedback_response.json()["rating"] == 5

    delete_material_response = client.delete(
        f"/events/{event_id}/materials/{material_id}",
        headers=auth_headers(),
    )
    assert delete_material_response.status_code == 204


def test_material_count_limit(client: TestClient, auth_headers, create_event):
    event_id = create_event(client)["id"]

    for index in range(MAX_EVENT_MATERIALS_PER_EVENT):
        response = client.post(
            f"/events/{event_id}/materials",
            headers=auth_headers(),
            json={
                "material_type": "pdf",
                "title": f"Material {index}",
                "file_url": f"https://example.com/material-{index}.pdf",
            },
        )
        assert response.status_code == 201

    response = client.post(
        f"/events/{event_id}/materials",
        headers=auth_headers(),
        json={
            "material_type": "pdf",
            "title": "Material peste limita",
            "file_url": "https://example.com/extra.pdf",
        },
    )
    assert response.status_code == 409
    assert (
        f"Limita de {MAX_EVENT_MATERIALS_PER_EVENT} materiale"
        in response.json()["detail"]
    )


def test_material_file_size_limit(client: TestClient, auth_headers, create_event):
    event_id = create_event(client)["id"]

    response = client.post(
        f"/events/{event_id}/materials",
        headers=auth_headers(),
        json={
            "material_type": "pdf",
            "title": "Too large",
            "file_url": "https://example.com/large.pdf",
            "file_name": "large.pdf",
            "file_size_bytes": MAX_EVENT_MATERIAL_FILE_SIZE_BYTES + 1,
        },
    )
    assert response.status_code == 413
