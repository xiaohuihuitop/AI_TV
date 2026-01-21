from fastapi.testclient import TestClient

from app.main import app


def test_admin_delete_not_found():
    client = TestClient(app)
    headers = {"Authorization": "Bearer dev-token"}
    resp = client.delete("/admin/items/999", headers=headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "not found"
