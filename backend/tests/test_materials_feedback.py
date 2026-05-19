from __future__ import annotations

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
